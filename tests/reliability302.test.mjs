import test from 'node:test';
import assert from 'node:assert/strict';
import {PCS3,sha256,stable,DriveStore,GitHubStore} from '../runtime/pcs3-core.mjs';
import {processInbox,processRequest,requestStatus} from '../runtime/pcs3-inbox.mjs';
function fixture(){
 const target=new Map(),source=new Map();let failReceipt=0,failHead=0;
 const makeStore=(map,receipt=false)=>({
  m:map,
  async health(){return {private:true};},
  async listDirectory(dir){return [...map.keys()].filter(x=>x.startsWith(dir+'/')).map(x=>({name:x.slice((dir+'/').length),path:x,type:'file'}));},
  async getFile(path){const b=map.get(path);return b?{sha:sha256(b),buffer:Buffer.from(b)}:null;},
  async putFile(path,b,expected){
   if(path.endsWith('/HEAD.json')&&failHead-->0){const e=Error('GitHub temporarily down');e.code=503;throw e;}
   const old=map.get(path);if(old&&sha256(old)!==expected)throw Error('CONFLICT');if(!old&&expected)throw Error('CONFLICT');
   map.set(path,Buffer.from(b));return {};
  },
  async putImmutable(path,b){if(receipt && path.includes('/receipts/')&&failReceipt-->0)throw Error('simulated receipt outage');if(map.has(path))throw Error('EXISTS');map.set(path,Buffer.from(b));return {};},
  async getApprovedAsset(slug,id){return Buffer.from('large-asset');},
  async getLargeAsset(id){return Buffer.from('large-asset');},
 });
 const github=makeStore(target,true),inboxGithub=makeStore(source);
 return {github,inboxGithub,pcs:new PCS3({github}),source,target,put:(id,req)=>source.set(`pcs3/inbox/${id}`,Buffer.from(JSON.stringify(req))),failReceipt:n=>{failReceipt=n},failHead:n=>{failHead=n}};
}
const init=(project='project-1')=>({schema:'pcs3.inbox.v1',project,actor:'chatgpt',command:'init',name:'Example'});
test('3.0.2: missing receipt is SUBMITTED_PENDING, not failed or claimed queued',async()=>{const f=fixture();f.put('REQ-a.json',init());const r=await requestStatus({github:f.github,inboxGithub:f.inboxGithub,filename:'REQ-a.json'});assert.equal(r.status,'SUBMITTED_PENDING');});
test('3.0.2: unknown request is UNKNOWN, not automatically resubmitted',async()=>{const f=fixture();const r=await requestStatus({github:f.github,inboxGithub:f.inboxGithub,filename:'REQ-a.json'});assert.equal(r.status,'UNKNOWN');});
test('3.0.2: remote inbox reads newest files rather than stale checkout',async()=>{const f=fixture();f.put('REQ-a.json',init());const r=await processInbox(f);assert.equal(r[0].status,'APPLIED');assert.equal((await f.pcs.resume('project-1')).revision,1);});
test('3.0.2: receipt crash is repaired by event log, without second state change',async()=>{const f=fixture();f.put('REQ-a.json',init());f.failReceipt(1);await assert.rejects(processInbox(f),/RECEIPT_WRITE_FAILED/);assert.equal((await f.pcs.resume('project-1')).revision,1);const st=await requestStatus({...f,filename:'REQ-a.json',project:'project-1'});assert.equal(st.status,'APPLIED_RECEIPT_PENDING');const res=await processInbox(f);assert.equal(res[0].status,'APPLIED');assert.equal((await f.pcs.resume('project-1')).revision,1);const r=JSON.parse(f.target.get('pcs3/receipts/REQ-a.json'));assert.equal(r.details.recovered,true);});
test('3.0.2: pending receipt recovery checks payload digest and detects changed data',async()=>{const f=fixture();f.put('REQ-a.json',init());f.failReceipt(1);await assert.rejects(processInbox(f),/RECEIPT_WRITE_FAILED/);f.put('REQ-a.json',{...init(),name:'Malicious replacement'});const r=await processInbox(f);assert.equal(r[0].status,'REJECTED');assert.match(JSON.parse(f.target.get('pcs3/receipts/REQ-a.json')).details.error,/REQUEST_ID_REUSE_CONFLICT/);assert.equal((await f.pcs.resume('project-1')).revision,1);});
test('3.0.2: temporary HEAD publication error leaves UNKNOWN without misleading receipt',async()=>{const f=fixture();f.put('REQ-a.json',init());f.failHead(1);await assert.rejects(processInbox(f),/INBOX_OUTCOME_UNKNOWN/);assert.equal(f.target.has('pcs3/receipts/REQ-a.json'),false);await processInbox(f);assert.equal((await f.pcs.resume('project-1')).revision,1);});
test('3.0.2: file listing > limit processes next waiting requests on subsequent run',async()=>{const f=fixture();for(let i=0;i<5;i++)f.put(`REQ-${i}.json`,init(`project-${i}`));await processInbox({...f,limit:2});await processInbox({...f,limit:2});await processInbox({...f,limit:2});for(let i=0;i<5;i++)assert.equal((await f.pcs.resume(`project-${i}`)).revision,1);});
test('3.0.2: 12 independent requests submitted together all receive receipts',async()=>{const f=fixture();for(let i=0;i<12;i++)f.put(`REQ-${i}.json`,init(`project-${i}`));const r=await processInbox(f);assert.equal(r.filter(x=>x.status==='APPLIED').length,12);});
test('3.0.2: Drive-reference artifact validates bytes/hash and mirrors on GitHub',async()=>{const f=fixture();await f.pcs.init('project-1','Example');const b=Buffer.from('Large PDF mock');f.pcs.drive={readAuthorizedFile:async id=>b};const req={...init(),command:'artifact_drive_ref',expected_revision:1,drive_file_id:'abcdef987654',name:'SRS.pdf',bytes:b.length,sha256:sha256(b)};const r=await processRequest(f.pcs,req,{requestId:'REQ-d.json',requestDigest:sha256(stable(req))});assert.equal(r.checkpoint.revision,2);const state=(await f.pcs.load('project-1')).state;assert.equal(state.artifacts[0].origin.storage,'google-drive');assert.equal(state.artifacts[0].source.storage,'github-contents');const audit=await f.pcs.auditArtifacts('project-1');assert.equal(audit.all_github_pass,true);});
test('3.0.2: mismatched Drive ref does not modify project',async()=>{const f=fixture();await f.pcs.init('project-1','Example');f.pcs.drive={readAuthorizedFile:async()=>Buffer.from('bad')};await assert.rejects(processRequest(f.pcs,{...init(),command:'artifact_drive_ref',expected_revision:1,drive_file_id:'abc_12345',name:'x',bytes:7,sha256:'a'.repeat(64)}),/SOURCE_INTEGRITY_FAILED/);assert.equal((await f.pcs.resume('project-1')).revision,1);});
test('3.0.2: Drive-referenced confidential source is rejected before loading bytes',async()=>{const f=fixture();await f.pcs.init('project-1','Example');let reads=0;f.pcs.drive={readAuthorizedFile:async()=>{reads++;return Buffer.from('ok')}};await assert.rejects(processRequest(f.pcs,{...init(),command:'artifact_drive_ref',expected_revision:1,drive_file_id:'abc_12345',name:'x',bytes:2,sha256:sha256('ok'),classification:'CONFIDENTIAL'}),/SECURITY_BLOCKED/);assert.equal(reads,0);});
test('3.0.2: GitHub pre-upload reference hash validated before PCS state write',async()=>{const f=fixture();await f.pcs.init('project-1','Example');const b=Buffer.from('large-asset');await assert.rejects(processRequest(f.pcs,{...init(),command:'artifact_github_asset',expected_revision:1,asset_id:1,name:'video.mp4',bytes:b.length,sha256:'0'.repeat(64)}),/SOURCE_INTEGRITY_FAILED/);assert.equal((await f.pcs.resume('project-1')).revision,1);});
test('3.0.2: status reader detects request modification after receipt',async()=>{const f=fixture();f.put('REQ-a.json',init());await processInbox(f);f.put('REQ-a.json',{...init(),name:'Changed'});await assert.rejects(requestStatus({...f,filename:'REQ-a.json'}),/REQUEST_TAMPERED/);});
test('3.0.2: GitHub directory listing fails closed when 1000 items cap reached',async()=>{const store=new GitHubStore({repo:'org/repo',token:'x',fetcher:async()=>({ok:true,status:200,json:async()=>Array.from({length:1000},(_,i)=>({name:'x'+i,type:'file',path:'pcs3/inbox/x'+i}))})});await assert.rejects(store.listDirectory('pcs3/inbox'),/INBOX_CAPACITY_BLOCKED/);});
test('3.0.2: one request status may be APPLIED_RECEIPT_PENDING without receipt',async()=>{const f=fixture();f.put('REQ-a.json',init());f.failReceipt(1);await assert.rejects(processInbox(f),/RECEIPT_WRITE_FAILED/);const st=await requestStatus({...f,filename:'REQ-a.json',project:'project-1'});assert.equal(st.status,'APPLIED_RECEIPT_PENDING');});
test('3.0.2: Drive authorized-source rejects file outside PCS intake folder before downloading',async()=>{
 let mediaFetched=0;const store=new DriveStore({token:'x',folderId:'pcsFolder',fetcher:async url=>{
  if(url.includes('alt=media')){mediaFetched++;return {ok:true,arrayBuffer:async()=>Buffer.from('xyz')}};
  return {ok:true,json:async()=>({parents:['otherFolder'],size:'3',mimeType:'application/pdf'})};
 }});await assert.rejects(store.readAuthorizedFile('file-123'),/outside authorized intake folder/);assert.equal(mediaFetched,0);
});
test('3.0.2: Drive source matching allowed parent and size is imported',async()=>{
 const store=new DriveStore({token:'x',folderId:'pcsFolder',fetcher:async url=>url.includes('alt=media')?{ok:true,arrayBuffer:async()=>Buffer.from('xyz')}:{ok:true,json:async()=>({parents:['pcsFolder'],size:'3',mimeType:'application/pdf'})}});
 assert.equal((await store.readAuthorizedFile('file-123')).toString(),'xyz');
});
test('3.0.2: GitHub pre-uploaded asset must belong to project release vault',async()=>{
 const g=new GitHubStore({repo:'org/repo',token:'x',fetcher:async()=>({ok:true,json:async()=>({id:123,assets:[{id:1}]})})});
 await assert.rejects(g.getApprovedAsset('project-1',9),/not in the project PCS3 authorized asset vault/);
});
test('3.0.2: Drive references reject Google-native docs without controlled export',async()=>{
 const store=new DriveStore({token:'x',folderId:'pcsFolder',fetcher:async()=>({ok:true,json:async()=>({parents:['pcsFolder'],size:'3',mimeType:'application/vnd.google-apps.document'})})});
 await assert.rejects(store.readAuthorizedFile('file-123'),/controlled export/);
});
