#!/usr/bin/env node
// GitHub Actions inbox processor: chat clients create pcs3/inbox/REQ-*.json; Actions writes canonical state + receipt.
import {readdir,readFile} from 'node:fs/promises';
import {basename,join} from 'node:path';
import {GitHubStore,DriveStore,PCS3,assert,now,validSlug,sha256,stable} from './pcs3-core.mjs';
const allowedTop=new Set(['current','product_map','architecture_map','tasks','features','flows','releases','decisions','risks','phase','source_refs','history_notes','environment']);
const protectedKeys=new Set(['__proto__','constructor','prototype','acceptance','approval','approvals','security_approval','owner_approval']);
function segments(pointer){assert(typeof pointer==='string' && pointer.startsWith('/'),'invalid JSON pointer');return pointer.slice(1).split('/').map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'));}
export function applyPatches(state,patches){assert(Array.isArray(patches) && patches.length<=100,'patches array <=100 required');const s=structuredClone(state);
 for(const patch of patches){assert(['set','append'].includes(patch?.op),'only set/append supported');const ps=segments(patch.path);assert(allowedTop.has(ps[0]),'path not allowed');assert(ps.length<=8,'patch path too deep');assert(!ps.some(x=>protectedKeys.has(x)),'unsafe key or protected approval path; requires verified owner process');
  let o=s;for(let i=0;i<ps.length-1;i++){assert(o!==null&&typeof o==='object' && Object.hasOwn(o,ps[i]),`unknown intermediate path ${ps[i]}`);o=o[ps[i]];}
  const key=ps.at(-1);assert(key!=='__proto__' && key!=='constructor' && key!=='prototype','unsafe key');
  if(patch.op==='set'){assert(ps.length>1 || allowedTop.has(key),'not allowed');o[key]=patch.value;}
  else{const target=o[key];assert(Array.isArray(target),'append target must be array');target.push(patch.value);}
 }
 s.updated_at=now();return s;
}
export async function processRequest(pcs,req,{requestId=null,requestDigest=null}={}){
 assert(req?.schema==='pcs3.inbox.v1','schema pcs3.inbox.v1 required');assert(validSlug(req.project),'invalid project');assert(typeof req.actor==='string' && req.actor.trim(),'actor required');
 const slug=req.project;
 if(req.command==='init'){assert(typeof req.name==='string' && req.name.trim(),'name required');return pcs.init(slug,req.name,req.actor,{requestId,requestDigest});}
 if(req.command==='patch'){
  assert(Number.isInteger(req.expected_revision),'expected_revision required');const h=await pcs.load(slug);assert(h,'project not found');assert(h.revision===req.expected_revision,`CONFLICT expected ${req.expected_revision}, actual ${h.revision}`);
  const s=applyPatches(h.state,req.patches);
  assert(JSON.stringify(s.approvals)===JSON.stringify(h.state.approvals),'APPROVAL_REQUIRED: chatbot inbox cannot change human approval ledger');
  for(const type of ['tasks','features','flows','releases']){
    const before=new Map(h.state[type].map(x=>[x.id,x]));
    for(const item of s[type]){const old=before.get(item.id);
      assert(!(item.status==='ACCEPTED' && old?.status!=='ACCEPTED'),'APPROVAL_REQUIRED: chatbot inbox cannot mark work ACCEPTED');
      assert(JSON.stringify(item.acceptance??null)===JSON.stringify(old?.acceptance??null) && JSON.stringify(item.approval??null)===JSON.stringify(old?.approval??null),'APPROVAL_REQUIRED: chatbot inbox cannot rewrite approval metadata');
    }
  }
  return pcs.commit(slug,s,{expectedRevision:req.expected_revision,actor:req.actor,reason:req.reason || 'Chat request',requestId,requestDigest});
 }
 if(req.command==='artifact'){
   assert(req.classification!=='CONFIDENTIAL' && req.classification!=='RESTRICTED','SECURITY_BLOCKED: encrypted or restricted artifact cannot be submitted as plaintext/base64 into Git history via Inbox; use authenticated private Gateway/CLI or client-side encryption');
   assert(Number.isInteger(req.expected_revision),'expected_revision required');assert(typeof req.name==='string'&&req.name.trim()&&typeof req.base64==='string','artifact name/base64 required');
   assert(req.base64.length<=900_000 && /^[A-Za-z0-9+/]*={0,2}$/.test(req.base64) && req.base64.length%4===0,'artifact base64 invalid/too large for inbox');
   const b=Buffer.from(req.base64,'base64');return pcs.putArtifactBuffer(slug,req.name,b,{mime:req.mime||'application/octet-stream',expectedRevision:req.expected_revision,actor:req.actor,drive:req.drive!==false,classification:req.classification||'INTERNAL',requestId,requestDigest});
 }
 if(req.command==='artifact_drive_ref'){
   assert(['PUBLIC','INTERNAL'].includes(req.classification||'INTERNAL'),'SECURITY_BLOCKED: Drive-reference Inbox is limited to PUBLIC/INTERNAL; encrypt confidential artifacts BEFORE submitting through a separate authorized channel');
   assert(Number.isInteger(req.expected_revision),'expected_revision required');
   assert(typeof req.drive_file_id==='string' && /^[A-Za-z0-9_-]{3,128}$/.test(req.drive_file_id),'invalid Drive file id');
   assert(typeof req.name==='string' && req.name.trim() && /^[a-f0-9]{64}$/i.test(req.sha256),'name and sha256 required');
   assert(Number.isSafeInteger(req.bytes)&&req.bytes>0&&req.bytes<=2_000_000_000,'expected byte size invalid');
   assert(pcs.drive && typeof pcs.drive.readAuthorizedFile==='function','DRIVE_UNAVAILABLE: cannot import Drive artifact without authorized reader');
   const b=await pcs.drive.readAuthorizedFile(req.drive_file_id);
   assert(b.length===req.bytes && sha256(b)===req.sha256,'SOURCE_INTEGRITY_FAILED: Drive source bytes/hash mismatch');
   return pcs.putArtifactBuffer(slug,req.name,b,{mime:req.mime||'application/octet-stream',expectedRevision:req.expected_revision,actor:req.actor,drive:false,classification:req.classification||'INTERNAL',requestId,requestDigest,origin:{storage:'google-drive',file_id:req.drive_file_id,bytes:b.length,sha256:req.sha256}});
 }
 if(req.command==='artifact_github_asset'){
   assert(['PUBLIC','INTERNAL'].includes(req.classification||'INTERNAL'),'SECURITY_BLOCKED: pre-uploaded GitHub asset must not contain raw confidential data');
   assert(Number.isInteger(req.expected_revision),'expected_revision required');
   assert(Number.isSafeInteger(req.asset_id) && req.asset_id>0,'asset_id required');
   assert(typeof req.name==='string' && req.name.trim() && /^[a-f0-9]{64}$/i.test(req.sha256),'name and sha256 required');
   assert(Number.isSafeInteger(req.bytes)&&req.bytes>0&&req.bytes<=2_000_000_000,'expected byte size invalid');
   const b=await pcs.github.getApprovedAsset(slug,req.asset_id);
   assert(b.length===req.bytes && sha256(b)===req.sha256,'SOURCE_INTEGRITY_FAILED: GitHub source asset bytes/hash mismatch');
   return pcs.putArtifactBuffer(slug,req.name,b,{mime:req.mime||'application/octet-stream',expectedRevision:req.expected_revision,actor:req.actor,drive:false,classification:req.classification||'INTERNAL',requestId,requestDigest,origin:{storage:'github-release',asset_id:req.asset_id,bytes:b.length,sha256:req.sha256}});
 }
 throw Error('unsupported inbox command');
}
// Source can be the same private canonical repo or a distinct controlled inbox repo.
// Remote-listing avoids stale Actions checkout snapshots, and manual/scheduled runs reconcile missed events.
export async function processInbox({github,pcs,inboxGithub=github,root=null,limit=200}){
 assert(Number.isInteger(limit) && limit>0 && limit<=900,'limit must be 1..900');
 let names=[];
 if(root){
   const inbox=join(root,'pcs3/inbox');
   try{names=(await readdir(inbox)).filter(x=>/^REQ-[a-zA-Z0-9._-]+\.json$/.test(x)).sort();}
   catch(e){if(e.code==='ENOENT')return [];throw e;}
 }else{
   const entries=await inboxGithub.listDirectory('pcs3/inbox');
   names=entries.filter(e=>e.type==='file' && /^REQ-[a-zA-Z0-9._-]+\.json$/.test(e.name)).map(e=>e.name).sort();
 }
 const log=[];let processed=0;
 for(const filename of names){
   const receiptPath=`pcs3/receipts/${filename}`;
   const receipt=await github.getFile(receiptPath);
   if(receipt){log.push({file:filename,status:'ALREADY_PROCESSED'});continue;}
   if(processed>=limit)break;processed++;
   let req,raw;
   try{
     if(root) raw=await readFile(join(root,'pcs3/inbox',filename));
     else {const f=await inboxGithub.getFile(`pcs3/inbox/${filename}`);assert(f,'request disappeared from inbox');raw=f.buffer;}
     assert(raw.length<=800_000,'request JSON too large');req=JSON.parse(raw.toString('utf8'));
   }catch(e){
     // Malformed requests are terminal; no external PCS state may have changed.
     const result={schema:'pcs3.receipt.v1',request:filename,status:'REJECTED',details:{error:String(e.message)},processed_at:now()};
     await github.putImmutable(receiptPath,Buffer.from(JSON.stringify(result,null,2)+'\n'));log.push({file:filename,status:'REJECTED'});continue;
   }
   const digest=sha256(stable(req));let status,details;
   try{
     assert(req.project && validSlug(req.project),'invalid project in request');
     const applied=await pcs.findAppliedRequest(req.project,filename,digest);
     if(applied){status='APPLIED';details={...applied,note:'Recovered from immutable event; receipt was missing'};}
     else{details=await processRequest(pcs,req,{requestId:filename,requestDigest:digest});status='APPLIED';}
   }catch(e){
     // A provider outage or ambiguous write MUST NOT become a permanent REJECTED receipt.
     const code=Number(e.code);
     if((code===409||code===429||code>=500) || /CHECKPOINT_NOT_PUBLISHED|RECEIPT_WRITE_FAILED|ARTIFACT_ORPHANED|REQUEST_RECONCILIATION_BLOCKED|HTTP [45]\d\d/i.test(e.message)){
       throw Error(`INBOX_OUTCOME_UNKNOWN ${filename}: ${e.message}; retry the same ID via reconcile, never submit a duplicate`);
     }
     status='REJECTED';details={error:String(e.message)};
   }
   const result={schema:'pcs3.receipt.v1',request:filename,request_digest:digest,status,details,processed_at:now()};
   try{await github.putImmutable(receiptPath,Buffer.from(JSON.stringify(result,null,2)+'\n'));log.push({file:filename,status});}
   catch(e){throw Error(`RECEIPT_WRITE_FAILED for ${filename}: ${e.message}; recover from event chain before retry`);}
 }
 return log;
}
export async function requestStatus({github,inboxGithub=github,filename,project=null}){
 assert(/^REQ-[A-Za-z0-9._-]+\.json$/.test(filename),'invalid request ID');
 const file=await github.getFile(`pcs3/receipts/${filename}`);
 if(file){const r=JSON.parse(file.buffer.toString('utf8'));const request=await inboxGithub.getFile(`pcs3/inbox/${filename}`);
   if(request && r.request_digest){const digest=sha256(stable(JSON.parse(request.buffer.toString('utf8'))));assert(digest===r.request_digest,'REQUEST_TAMPERED: inbox payload changed after receipt');}
   return {request:filename,status:r.status,receipt:r,verified:true};}
 const sent=await inboxGithub.getFile(`pcs3/inbox/${filename}`);
 if(!sent)return {request:filename,status:'UNKNOWN',detail:'Request not found; verify branch, permissions and submission'};
 if(project){
   const pcs=new PCS3({github});const digest=sha256(stable(JSON.parse(sent.buffer.toString('utf8'))));
   const applied=await pcs.findAppliedRequest(project,filename,digest);
   if(applied)return {request:filename,status:'APPLIED_RECEIPT_PENDING',details:applied,verified:true};
 }
 return {request:filename,status:'SUBMITTED_PENDING',detail:'Inbox file exists; no receipt yet. Do not resubmit under a new ID; inspect Actions and retry reconciliation if necessary'};
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
 const github=new GitHubStore({repo:process.env.PCS_GITHUB_REPO||process.env.GITHUB_REPOSITORY,token:process.env.PCS_GITHUB_TOKEN||process.env.GITHUB_TOKEN,branch:process.env.PCS_GITHUB_BRANCH||'main'});
 const inboxGithub=new GitHubStore({repo:process.env.PCS_INBOX_REPO||process.env.GITHUB_REPOSITORY,token:process.env.PCS_INBOX_TOKEN||process.env.GITHUB_TOKEN,branch:process.env.PCS_INBOX_BRANCH||process.env.GITHUB_REF_NAME||'main'});
 const drive=process.env.PCS_DRIVE_ACCESS_TOKEN&&process.env.PCS_DRIVE_FOLDER_ID?new DriveStore({token:process.env.PCS_DRIVE_ACCESS_TOKEN,folderId:process.env.PCS_DRIVE_FOLDER_ID}):null;
 const results=await processInbox({github,pcs:new PCS3({github,drive,allowPublic:process.env.PCS_ALLOW_PUBLIC==='true'}),inboxGithub});
 console.log(JSON.stringify(results,null,2));
 if(results.some(x=>x.status==='REJECTED'))process.exitCode=1;
}
