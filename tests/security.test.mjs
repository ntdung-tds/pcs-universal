import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encodeArtifact,decodeConfidentialArtifact,rotateConfidentialArtifact,findHighConfidenceSecrets} from '../runtime/pcs3-security.mjs';
import {PCS3,sha256,emptyState} from '../runtime/pcs3-core.mjs';
import {applyPatches,processRequest} from '../runtime/pcs3-inbox.mjs';
const key=randomBytes(32).toString('base64');
function fixture(privateRepo=true,drive=null){
 const files=new Map();const github={async health(){return {private:privateRepo}},async getFile(p){const b=files.get(p);return b?{buffer:Buffer.from(b),sha:sha256(b)}:null},async putImmutable(p,b){if(files.has(p))throw Error('EXISTS');files.set(p,Buffer.from(b))},async putFile(p,b,s){const old=files.get(p);if(old&&sha256(old)!==s)throw Error('CONFLICT');files.set(p,Buffer.from(b))}};
 return {pcs:new PCS3({github,drive}),files};
}
test('secret scanner catches constructed GitHub PAT, AWS access key and private key header without printing secret',()=>{
 for(const secret of ['ghp_'+'a'.repeat(40),'AKIA'+'A'.repeat(16),'-----BEGIN '+'PRIVATE KEY-----'])assert(findHighConfidenceSecrets(secret).length);
 assert(findHighConfidenceSecrets('token: use a secret manager').length===0);
});
test('sensitive filename is blocked even without plaintext secret',()=>{
 assert.throws(()=>encodeArtifact({bytes:Buffer.from('x'),filename:'.env.production',slug:'safe-1'}),/SECURITY_BLOCKED/);
});
test('unclassified defaults to INTERNAL, confidential requires authenticated encryption',()=>{
 assert.equal(encodeArtifact({bytes:Buffer.from('normal'),filename:'a.txt',slug:'safe-1'}).encrypted,false);
 assert.throws(()=>encodeArtifact({bytes:Buffer.from('private'),filename:'a.txt',classification:'CONFIDENTIAL',slug:'safe-1',keyBase64:''}),/PCS_ARTIFACT_KEY_B64/);
});
test('confidential AES-GCM encrypt/decrypt, tamper and cross-project isolation',()=>{
 const x=encodeArtifact({bytes:Buffer.from('sensitive architecture notes'),filename:'sensitive.txt',classification:'CONFIDENTIAL',slug:'safe-1',keyBase64:key});
 assert(x.encrypted);assert(!x.bytes.includes(Buffer.from('sensitive architecture notes')));assert.equal(x.storedName,'confidential-artifact.enc');
 assert.equal(decodeConfidentialArtifact(x.bytes,{slug:'safe-1',keyBase64:key}).toString(),'sensitive architecture notes');
 assert.throws(()=>decodeConfidentialArtifact(x.bytes,{slug:'other-1',keyBase64:key}));
 const tampered=Buffer.from(x.bytes);tampered[tampered.length-1]^=1;assert.throws(()=>decodeConfidentialArtifact(tampered,{slug:'safe-1',keyBase64:key}));
});
test('restricted material fails closed',()=>{
 assert.throws(()=>encodeArtifact({bytes:Buffer.from('legal protected'),filename:'private.pdf',classification:'RESTRICTED',slug:'safe-1'}),/RESTRICTED/);
});
test('GitHub private policy is rechecked even for later state commits',async()=>{
 const {pcs,files}=fixture();await pcs.init('safe-1','Safe');
 pcs.github.health=async()=>({private:false});
 const s=emptyState('safe-1','Safe');await assert.rejects(pcs.commit('safe-1',s,{expectedRevision:1}),/PUBLIC/);
 assert.equal([...files.keys()].filter(x=>x.endsWith('HEAD.json')).length,1);
});
test('GitHub artifact writes reject suspicious content before any byte upload',async()=>{
 const {pcs,files}=fixture();await pcs.init('safe-1','Safe');const before=files.size;
 await assert.rejects(pcs.putArtifactBuffer('safe-1','log.txt',Buffer.from('ghp_'+'Z'.repeat(40)),{expectedRevision:1}),/SECURITY_BLOCKED/);
 assert.equal(files.size,before);
});
test('state checkpoints reject embedded tokens before Moment files are created',async()=>{
 const {pcs,files}=fixture();await pcs.init('safe-1','Safe');const head=await pcs.load('safe-1');const s=head.state;
 s.current.next_action='ghp_'+'Q'.repeat(40);const before=files.size;
 await assert.rejects(pcs.commit('safe-1',s,{expectedRevision:1}),/SECURITY_BLOCKED/);
 assert.equal(files.size,before);
});
test('confidential binary mirror and Drive both store ciphertext only',async()=>{
 let driveBytes;const drive={async upload(name,bytes){driveBytes=Buffer.from(bytes);return {storage:'google-drive',file_id:'fileA',bytes:bytes.length}}};
 const {pcs,files}=fixture(true,drive);await pcs.init('safe-1','Safe');
 const plaintext='internal technical plan';const saved=await pcs.putArtifactBuffer('safe-1','secret.docx',Buffer.from(plaintext),{expectedRevision:1,classification:'CONFIDENTIAL'}).catch(e=>e);
 // No global key is intentionally set. Explicitly enable for this isolated test.
 assert.match(saved.message,/PCS_ARTIFACT_KEY_B64/);
 const previous=process.env.PCS_ARTIFACT_KEY_B64;process.env.PCS_ARTIFACT_KEY_B64=key;
 try{const result=await pcs.putArtifactBuffer('safe-1','secret.docx',Buffer.from(plaintext),{expectedRevision:1,classification:'CONFIDENTIAL'});
   assert.equal(result.artifact.encrypted,true);assert.equal(result.artifact.classification,'CONFIDENTIAL');
   const gh=await pcs.github.getFile(result.artifact.source.github_mirror.path);
   assert(!gh.buffer.includes(Buffer.from(plaintext)));assert(!driveBytes.includes(Buffer.from(plaintext)));
   assert.equal(decodeConfidentialArtifact(gh.buffer,{slug:'safe-1',keyBase64:key}).toString(),plaintext);
 }finally{if(previous===undefined)delete process.env.PCS_ARTIFACT_KEY_B64;else process.env.PCS_ARTIFACT_KEY_B64=previous;}
});
test('chat inbox cannot forge acceptance or modify approval records',async()=>{
 const {pcs}=fixture();await pcs.init('safe-1','Safe');
 await assert.rejects(processRequest(pcs,{schema:'pcs3.inbox.v1',project:'safe-1',actor:'claude',command:'patch',expected_revision:1,patches:[{op:'append',path:'/approvals',value:{decision:'APPROVED'}}]}),/not allowed/);
 await assert.rejects(processRequest(pcs,{schema:'pcs3.inbox.v1',project:'safe-1',actor:'claude',command:'patch',expected_revision:1,patches:[{op:'append',path:'/tasks',value:{id:'T1',status:'ACCEPTED'}}]}),/APPROVAL_REQUIRED/);
});
test('chat inbox prohibits nested prototype/constructor keys',()=>{
 assert.throws(()=>applyPatches({current:{foo:{}}},[{op:'set',path:'/current/constructor/x',value:1}]),/protected/);
});

test('chat Inbox rejects CONFIDENTIAL base64 request before GitHub history can store raw artifact',async()=>{
 const {pcs}=fixture();await pcs.init('safe-1','Safe');
 await assert.rejects(processRequest(pcs,{schema:'pcs3.inbox.v1',project:'safe-1',actor:'chat',command:'artifact',expected_revision:1,name:'srs.pdf',classification:'CONFIDENTIAL',base64:Buffer.from('medical data').toString('base64')}),/SECURITY_BLOCKED/);
});

// GitHub Security Doctor must not confuse missing visibility/API rights with secure settings.
test('read-only GitHub doctor reports public repository as failure and missing controls as unknown',async()=>{
 const {assessGitHubSecurity}=await import('../tools/pcs-github-security-doctor.mjs');
 const fetcher=async url=>url.endsWith('/repos/org/public')?{ok:true,status:200,json:async()=>({private:false,default_branch:'main'})}:{ok:false,status:404};
 const result=await assessGitHubSecurity({repo:'org/public',token:'test',fetcher});
 assert.equal(result.overall,'FAIL_PUBLIC_REPO');assert.equal(result.checks.protected_branch.status,'NOT_VERIFIED');
 assert.equal(result.checks.secret_scanning_and_push_protection.status,'NOT_VERIFIED');
});

test('CONFIDENTIAL key rotation preserves ciphertext format, decrypts under new key only',()=>{
 const oldKey=randomBytes(32).toString('base64'),freshKey=randomBytes(32).toString('base64');
 const original=encodeArtifact({bytes:Buffer.from('classified example'),filename:'notes.txt',
   classification:'CONFIDENTIAL',slug:'safe-1',keyBase64:oldKey,keyId:'k2026a'});
 const rotated=rotateConfidentialArtifact(original.bytes,{slug:'safe-1',oldKeyBase64:oldKey,
   newKeyBase64:freshKey,newKeyId:'k2026b'});
 assert.equal(rotated.encryption.key_id,'k2026b');
 assert.equal(decodeConfidentialArtifact(rotated.bytes,{slug:'safe-1',keyBase64:freshKey}).toString(),'classified example');
 assert.throws(()=>decodeConfidentialArtifact(rotated.bytes,{slug:'safe-1',keyBase64:oldKey}));
 assert.throws(()=>rotateConfidentialArtifact(original.bytes,{slug:'safe-1',oldKeyBase64:oldKey,newKeyBase64:oldKey,newKeyId:'reuse'}),/different key/);
 assert.throws(()=>rotateConfidentialArtifact(original.bytes,{slug:'wrong',oldKeyBase64:oldKey,newKeyBase64:freshKey,newKeyId:'k2026b'}));
});

test('Advanced public project requires intentional reviewed state; internal uploads blocked before writing',async()=>{
 const {pcs,files}=fixture(false);
 pcs.allowPublic=true;
 await assert.rejects(()=>pcs.init('open-project','Open'),/PUBLIC_POLICY_REQUIRED/);
 const created=await pcs.init('open-project','Open','owner',{publicProjectReviewed:true});
 assert.equal(created.revision,1);
 const before=files.size;
 await assert.rejects(()=>pcs.putArtifactBuffer('open-project','internal.txt',Buffer.from('test sample'),{expectedRevision:1,classification:'INTERNAL'}),/PUBLIC_DATA_BLOCKED/);
 assert.equal(files.size,before,'no internal plaintext bytes uploaded');
 const result=await pcs.putArtifactBuffer('open-project','public.txt',Buffer.from('safe public sample'),{expectedRevision:1,classification:'PUBLIC'});
 assert.equal(result.artifact.classification,'PUBLIC');
 const state=(await pcs.load('open-project')).state;
 state.tasks.push({id:'T1',status:'PLANNED',classification:'INTERNAL'});
 await assert.rejects(()=>pcs.commit('open-project',state,{expectedRevision:2}),/PUBLIC_DATA_BLOCKED/);
});
