import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, basename } from 'node:path';
import {assertSafeState, assertPublicProjectSafe, encodeArtifact} from './pcs3-security.mjs';

export const now = () => new Date().toISOString();
export const sha256 = x => createHash('sha256').update(typeof x === 'string' ? x : Buffer.from(x)).digest('hex');
export const stable = v => JSON.stringify(normalize(v));
function normalize(v) { if (Array.isArray(v)) return v.map(normalize); if(v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normalize(x)])); return v; }
export const validSlug = s => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{1,62}$/.test(s) && !s.endsWith('-');
export function assert(ok, msg){ if(!ok) throw Error(msg); }
const allowedStatuses = new Set(['PLANNED','IN_PROGRESS','BLOCKED','TECH_DONE','INTEGRATION_PENDING','ACCEPTED','CANCELLED']);
const evidenceOk = arr => Array.isArray(arr) && arr.some(e=> typeof e?.ref === 'string' && e.ref.trim() && /^[a-f0-9]{64}$/i.test(e.sha256 ?? '') && e.verification?.state === 'VERIFIED' && typeof e.verification?.method === 'string' && e.verification.method !== 'self-assertion' && !isNaN(Date.parse(e.verification?.observed_at)) );
const decisionOk = a => a?.decision === 'APPROVED' && typeof a.by === 'string' && a.by.trim() && !isNaN(Date.parse(a.at));
export function validateState(s){
  assert(s && s.schema === 'pcs3.project-state.v1', 'schema must be pcs3.project-state.v1');
  assert(validSlug(s.slug), 'invalid project slug');
  assert(typeof s.name==='string' && s.name.trim(), 'missing project name');
  for(const k of ['source_refs','tasks','features','flows','releases','decisions','risks','approvals','artifacts']) assert(Array.isArray(s[k]), `${k} must be array`);
  assert(s.current && typeof s.current.next_action==='string' && s.current.next_action.trim(), 'current.next_action required');
  assert(s.product_map && s.architecture_map, 'maps required (may start as unreviewed drafts)');
  const seen=new Set();
  for(const type of ['tasks','features','flows','releases']) for(const x of s[type]) {
    assert(typeof x?.id==='string' && /^[A-Za-z][A-Za-z0-9._-]{0,79}$/.test(x.id), `${type}: invalid or missing id`);
    assert(!seen.has(x.id), `duplicate id ${x.id}`); seen.add(x.id);
    assert(allowedStatuses.has(x.status), `${x.id}: invalid status`);
    if(x.status==='ACCEPTED') {
      assert(evidenceOk(x.evidence), `${x.id}: ACCEPTED requires independently verified evidence metadata`);
      assert(decisionOk(x.acceptance ?? x.approval), `${x.id}: ACCEPTED requires recorded authorized approval`);
      if(type==='tasks' && x.qa?.required !== false) assert(x.qa?.status==='PASS', `${x.id}: QA not PASS`);
      if(type==='features') assert(x.integration?.status==='PASS', `${x.id}: integration not PASS`);
      if(type==='flows') assert(x.e2e?.status==='PASS', `${x.id}: E2E not PASS`);
      if(type==='releases') assert(x.security?.status==='PASS' && x.rollback?.status==='PASS', `${x.id}: security or rollback not PASS`);
    }
  }
  const ids=Object.fromEntries(['tasks','features','flows','releases'].map(t=>[t,new Map(s[t].map(x=>[x.id,x]))]));
  // Dependencies form a directed acyclic graph. Cycles can make execution permanently blocked.
  for(const task of s.tasks) {
    assert(task.dependencies === undefined || Array.isArray(task.dependencies), `${task.id}: dependencies must be array`);
    const deps=task.dependencies ?? [];
    assert(new Set(deps).size === deps.length, `${task.id}: duplicate dependency`);
    for(const dep of deps) {
      assert(ids.tasks.has(dep), `${task.id}: dependency ${dep} missing`);
      assert(dep !== task.id, `${task.id}: self dependency`);
    }
  }
  const mark=new Map();
  function visit(id,path=[]){
    if(mark.get(id)===2) return;
    assert(mark.get(id)!==1, `dependency cycle: ${[...path,id].join(' -> ')}`);
    mark.set(id,1);
    for(const dep of (ids.tasks.get(id).dependencies ?? [])) visit(dep,[...path,id]);
    mark.set(id,2);
  }
  for(const id of ids.tasks.keys()) visit(id);
  for(const feat of s.features) {
    assert(new Set(feat.required_tasks ?? []).size === (feat.required_tasks ?? []).length, `${feat.id}: duplicate required task`);
    for(const id of (feat.required_tasks ?? [])) assert(ids.tasks.has(id), `${feat.id}: missing task ${id}`);
    if(feat.status==='ACCEPTED') for(const id of (feat.required_tasks ?? [])) assert(ids.tasks.get(id).status==='ACCEPTED', `${feat.id}: task ${id} not accepted`);
  }
  for(const flow of s.flows){
    assert(new Set(flow.required_features ?? []).size === (flow.required_features ?? []).length, `${flow.id}: duplicate required feature`);
    for(const id of (flow.required_features ?? [])) assert(ids.features.has(id), `${flow.id}: missing feature ${id}`);
    if(flow.status==='ACCEPTED') for(const id of (flow.required_features ?? [])) assert(ids.features.get(id).status==='ACCEPTED', `${flow.id}: feature ${id} not accepted`);
  }
  for(const rel of s.releases){
    assert(new Set(rel.required_flows ?? []).size === (rel.required_flows ?? []).length, `${rel.id}: duplicate required flow`);
    for(const id of (rel.required_flows ?? [])) assert(ids.flows.has(id), `${rel.id}: missing flow ${id}`);
    if(rel.status==='ACCEPTED') for(const id of (rel.required_flows ?? [])) assert(ids.flows.get(id).status==='ACCEPTED', `${rel.id}: flow ${id} not accepted`);
  }
  assert(stable(s).length <= 750_000, 'state >750 KB: move bulky documents to artifacts, store refs in state');
  return true;
}
export function emptyState(slug,name,actor='agent'){
  assert(validSlug(slug),'invalid project slug');
  return {schema:'pcs3.project-state.v1',slug,name,version:'3.2.0',created_at:now(),updated_at:now(),phase:'DISCOVERY',source_refs:[],product_map:{state:'DRAFT',summary:'Not yet analyzed; agent must read SRS and verify'},architecture_map:{state:'DRAFT',summary:'Architecture not yet verified'},tasks:[],features:[],flows:[],releases:[],decisions:[],risks:[],approvals:[],artifacts:[],current:{active_task:null,last_completed_step:'Project registered',next_action:'Analyze the requirements and build the product/architecture maps',blockers:[],actor},policy:{production:'EXPLICIT_APPROVAL',destructive:'EXPLICIT_APPROVAL',credentials:'DO_NOT_COMMIT',source_of_truth:'GITHUB',drive:'PREFERRED_OPTIONAL'},environment:{github:'REQUIRED',google_drive:'OPTIONAL'},history_notes:[]};
}
export class HttpError extends Error { constructor(code,url,body){super(`HTTP ${code} remote provider request failed`); this.code=code;} }
async function jsonFetch(fetcher,url,opts={}) { const r=await fetcher(url,opts); if(!r.ok){ const t=await r.text(); throw new HttpError(r.status,url,t); } return r; }
export class GitHubStore {
  constructor({repo,token,branch='main',fetcher=globalThis.fetch}){
    assert(typeof repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(repo),'PCS_GITHUB_REPO must be OWNER/REPO');
    assert(token && typeof token==='string','GitHub token required'); this.repo=repo;this.token=token;this.branch=branch;this.fetcher=fetcher;
  }
  headers(extra={}){return {Authorization:`Bearer ${this.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10',...extra};}
  url(p){return `https://api.github.com/repos/${this.repo}${p}`;}
  async health(){const r=await jsonFetch(this.fetcher,this.url(''),{headers:this.headers()});const o=await r.json();return {full_name:o.full_name,private:o.private,default_branch:o.default_branch,permissions:o.permissions};}
  async listDirectory(path){
    const url=this.url('/contents/'+path.split('/').map(encodeURIComponent).join('/')+`?ref=${encodeURIComponent(this.branch)}`);
    const r=await this.fetcher(url,{headers:this.headers()});
    if(r.status===404)return [];
    if(!r.ok)throw new HttpError(r.status,url,await r.text());
    const entries=await r.json();assert(Array.isArray(entries),'expected GitHub directory listing');
    // Contents API returns at most 1,000 entries; never silently ignore overflow.
    assert(entries.length<1000,`INBOX_CAPACITY_BLOCKED: ${path} reached GitHub directory listing cap; archive processed requests and receipts safely`);
    return entries.map(x=>({name:x.name,path:x.path,type:x.type}));
  }
  async getFile(path){
    const url=this.url('/contents/'+path.split('/').map(encodeURIComponent).join('/')+`?ref=${encodeURIComponent(this.branch)}`);
    const r=await this.fetcher(url,{headers:this.headers()});if(r.status===404)return null;
    if(!r.ok) throw new HttpError(r.status,url,await r.text());
    const o=await r.json();assert(o.type==='file' && typeof o.content==='string','expected content file');
    return {sha:o.sha,buffer:Buffer.from(o.content.replace(/\s/g,''),'base64')};
  }
  async putFile(path,buffer,expectedSha,commitMessage){
    const url=this.url('/contents/'+path.split('/').map(encodeURIComponent).join('/'));
    const body={message:commitMessage || `PCS: update ${path}`,content:Buffer.from(buffer).toString('base64'),branch:this.branch};
    if(expectedSha)body.sha=expectedSha;
    const r=await jsonFetch(this.fetcher,url,{method:'PUT',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify(body)});
    return await r.json();
  }
  async putImmutable(path,buf){
    const old=await this.getFile(path);assert(!old,`immutable file already exists ${path}`);
    return this.putFile(path,buf,null,`PCS: append ${path}`);
  }
  async getRelease(tag){const u=this.url(`/releases/tags/${encodeURIComponent(tag)}`);const r=await this.fetcher(u,{headers:this.headers()});if(r.status===404)return null;if(!r.ok)throw new HttpError(r.status,u,await r.text());return await r.json();}
  async ensureAssetRelease(slug){const tag=`pcs3-assets-${slug}`;const old=await this.getRelease(tag);if(old)return old;
    try{const r=await jsonFetch(this.fetcher,this.url('/releases'),{method:'POST',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify({tag_name:tag,target_commitish:this.branch,name:`PCS asset vault: ${slug}`,body:'Managed by PCS3. Do not delete assets referenced by PCS state.',draft:true,prerelease:true})});return await r.json();}
    catch(e){if(e.code===422){const race=await this.getRelease(tag);if(race)return race;}throw e;}
  }
  async getApprovedAsset(slug,assetId){
    const rel=await this.getRelease(`pcs3-assets-${slug}`);
    assert(rel && Array.isArray(rel.assets) && rel.assets.some(a=>Number(a.id)===Number(assetId)),
      'SECURITY_BLOCKED: requested asset is not in the project PCS3 authorized asset vault');
    return this.getLargeAsset(assetId);
  }
  async getLargeAsset(assetId){
    assert(Number.isInteger(assetId)||/^\d+$/.test(String(assetId)),'invalid release asset ID');
    const url=this.url(`/releases/assets/${encodeURIComponent(assetId)}`);
    const r=await jsonFetch(this.fetcher,url,{headers:this.headers({Accept:'application/octet-stream'})});
    return Buffer.from(await r.arrayBuffer());
  }
  async putLargeAsset(slug,content,name,mime='application/octet-stream'){
    const rel=await this.ensureAssetRelease(slug);const unique=`${sha256(content).slice(0,24)}-${randomUUID().slice(0,8)}-${basename(name).replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
    const url=rel.upload_url.replace(/\{.*$/,'')+`?name=${encodeURIComponent(unique)}`;
    const resp=await jsonFetch(this.fetcher,url,{method:'POST',headers:this.headers({'Content-Type':mime,'Content-Length':String(content.length)}),body:content,duplex:'half'});
    const a=await resp.json();assert(a.size===content.length, 'GitHub asset size mismatch');
    return {storage:'github-release',asset_id:a.id,release_id:rel.id,url:a.url,bytes:a.size,sha256:sha256(content),name:unique};
  }
}
export class DriveStore {
  constructor({token,folderId,fetcher=globalThis.fetch}) {assert(token && folderId,'Drive token and folder required');this.token=token;this.folderId=folderId;this.fetcher=fetcher;}
  async readAuthorizedFile(id){
    // Prevent confused-deputy exfiltration: user-submitted IDs must belong directly
    // to the explicit PCS intake folder accessible to this Drive service account.
    assert(typeof id==='string' && /^[A-Za-z0-9_-]+$/.test(id),'invalid Drive file ID');
    const url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,size,parents,mimeType,trashed&supportsAllDrives=true`;
    const r=await jsonFetch(this.fetcher,url,{headers:{Authorization:`Bearer ${this.token}`}});
    const meta=await r.json();
    assert(meta && meta.trashed!==true && Array.isArray(meta.parents) && meta.parents.includes(this.folderId),
      'SECURITY_BLOCKED: Drive source outside authorized intake folder');
    assert(!String(meta.mimeType||'').startsWith('application/vnd.google-apps.'),
      'SECURITY_BLOCKED: Google native docs require a controlled export pipeline');
    assert(meta.size!==undefined && Number(meta.size)>0 && Number(meta.size)<=2_000_000_000,
      'SECURITY_BLOCKED: Drive source missing size or exceeds limit');
    const data=await this.readFile(id);
    assert(data.length===Number(meta.size),'SOURCE_INTEGRITY_FAILED: Drive metadata size differs from response');
    return data;
  }
  async readFile(id){
    assert(typeof id==='string' && /^[a-zA-Z0-9_-]+$/.test(id),'invalid Drive file ID');
    const url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`;
    const r=await jsonFetch(this.fetcher,url,{headers:{Authorization:`Bearer ${this.token}`}});
    return Buffer.from(await r.arrayBuffer());
  }
  async upload(name,data,mime='application/octet-stream'){
    const meta={name:basename(name),parents:[this.folderId],description:'PCS3 project artifact; canonical manifest in GitHub'};
    let o;
    if(data.length <= 5_000_000){
      const boundary=`pcs_${randomUUID()}`;const p1=Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`);const p2=Buffer.from(`\r\n--${boundary}--\r\n`);const body=Buffer.concat([p1,data,p2]);
      const url='https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,md5Checksum,webViewLink';
      const r=await jsonFetch(this.fetcher,url,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':`multipart/related; boundary=${boundary}`},body});o=await r.json();
    }else{
      const u='https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,md5Checksum,webViewLink';
      const init=await jsonFetch(this.fetcher,u,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(data.length)},body:JSON.stringify(meta)});
      const dest=init.headers.get('location');assert(dest && dest.startsWith('https://www.googleapis.com/'),'Drive resumable session missing or unsafe');
      const r=await jsonFetch(this.fetcher,dest,{method:'PUT',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':mime,'Content-Length':String(data.length)},body:data,duplex:'half'});o=await r.json();
    }
    assert(o?.id && Number(o.size)===data.length,'Drive upload missing id or size mismatch');
    if(o.md5Checksum){const md5=createHash('md5').update(data).digest('hex');assert(md5===o.md5Checksum,'Drive MD5 mismatch');}
    return {storage:'google-drive',file_id:o.id,url:o.webViewLink??`https://drive.google.com/file/d/${encodeURIComponent(o.id)}/view`,bytes:data.length,sha256:sha256(data),name:o.name};
  }
}
const projectPath=slug=>`pcs3/projects/${slug}`;
export class PCS3 {
  constructor({github,drive=null,allowPublic=false}){this.github=github;this.drive=drive;this.allowPublic=allowPublic;}
  async ensurePrivacy(state,classification=null){
    // Fail closed if repository visibility cannot be verified.
    assert(typeof this.github.health==='function','REPOSITORY_VISIBILITY_UNKNOWN');
    const h=await this.github.health();
    assert(typeof h.private==='boolean','REPOSITORY_VISIBILITY_UNKNOWN');
    if(!h.private){
      assert(this.allowPublic,'PUBLIC_REPOSITORY_NOT_AUTHORIZED');
      assertPublicProjectSafe(state);
      if(classification!==null)assert(classification==='PUBLIC','PUBLIC_DATA_BLOCKED: artifact must be PUBLIC');
    }
    return h;
  }
  headPath(slug){assert(validSlug(slug),'invalid slug');return `${projectPath(slug)}/HEAD.json`;}
  eventPath(slug,id){return `${projectPath(slug)}/events/${id}.json`;}
  async load(slug){const h=await this.github.getFile(this.headPath(slug));if(!h)return null;const head=JSON.parse(h.buffer.toString());
    assert(head.schema==='pcs3.head.v1' && head.state?.slug===slug,'HEAD invalid');validateState(head.state);
    assert(head.state_hash===sha256(stable(head.state)),'HEAD state hash mismatch');return {...head,blob_sha:h.sha};}
  async init(slug,name,actor='agent',{requestId=null,requestDigest=null}={}){
    const state=emptyState(slug,name,actor);
    if(arguments[3]?.publicProjectReviewed===true){state.policy.repository_visibility='PUBLIC';state.policy.public_content_reviewed=true;state.policy.content_classification='PUBLIC';}
    await this.ensurePrivacy(state);assert(!(await this.load(slug)), `project already exists ${slug}`);
    return this.commit(slug,state,{expectedRevision:null,actor,reason:'bootstrap from supplied project brief',requestId,requestDigest});
  }
  async commit(slug,state,{expectedRevision,actor='agent',reason='checkpoint',requestId=null,requestDigest=null}){
    validateState(state);assertSafeState(state);assert(state.slug===slug,'project slug mismatch');
    await this.ensurePrivacy(state);
    const prior=await this.load(slug);const actual=prior?.revision ?? null;
    assert(expectedRevision===actual,`CONFLICT expected revision ${expectedRevision}, current ${actual}; reload and reconcile`);
    const id=`MOM-${new Date().toISOString().replace(/[-:.]/g,'')}-${randomUUID()}`;
    const record={schema:'pcs3.event.v1',id,project:slug,actor,reason,...(requestId?{request_id:requestId,request_digest:requestDigest}:{}),at:now(),revision:(prior?.revision ?? 0)+1,previous_event:prior?.event_id??null,previous_hash:prior?.event_hash??null,state_hash:sha256(stable(state)),state};
    const eventHash=sha256(stable(record));await this.github.putImmutable(this.eventPath(slug,id),Buffer.from(JSON.stringify(record,null,2)+'\n'));
    const next={schema:'pcs3.head.v1',project:slug,revision:record.revision,event_id:id,event_hash:eventHash,state_hash:record.state_hash,state,updated_at:now()};
    try {await this.github.putFile(this.headPath(slug),Buffer.from(JSON.stringify(next,null,2)+'\n'),prior?.blob_sha??null,`PCS ${slug}: checkpoint r${record.revision} ${reason}`);}
    catch(e){throw new Error(`CHECKPOINT_NOT_PUBLISHED: event ${id} uploaded but HEAD not changed; retry from latest HEAD, orphan event may require reconciliation. ${e.message}`);}
    return {slug,revision:next.revision,event_id:id,event_hash:eventHash};
  }
  async findAppliedRequest(slug,requestId,requestDigest,{limit=2000}={}){
    assert(typeof requestId==='string' && /^REQ-[A-Za-z0-9._-]+\.json$/.test(requestId),'invalid request ID');
    const h=await this.load(slug);if(!h)return null;
    let id=h.event_id, expected=h.event_hash, count=0;
    while(id){
      assert(++count<=limit,'REQUEST_RECONCILIATION_BLOCKED: history exceeds search limit');
      const f=await this.github.getFile(this.eventPath(slug,id));assert(f,`missing event ${id}`);
      const event=JSON.parse(f.buffer.toString());
      assert(event.id===id && sha256(stable(event))===expected,`event hash mismatch during reconciliation: ${id}`);
      if(event.request_id===requestId){
        assert(event.request_digest===requestDigest,'REQUEST_ID_REUSE_CONFLICT: same id, different payload');
        return {slug,revision:event.revision,event_id:id,event_hash:expected,recovered:true};
      }
      id=event.previous_event;expected=event.previous_hash;
    }
    return null;
  }
  async verify(slug,limit=2000){const head=await this.load(slug);assert(head,`project not found ${slug}`);let id=head.event_id, expected=head.event_hash,count=0,revision=head.revision;
    while(id){assert(++count<=limit,'history exceeds verification limit');const f=await this.github.getFile(this.eventPath(slug,id));assert(f,`missing event ${id}`);const e=JSON.parse(f.buffer.toString());assert(e.id===id && sha256(stable(e))===expected,`event hash mismatch ${id}`);assert(e.revision===revision,`revision gap ${id}`);assert(e.state_hash===sha256(stable(e.state)),`event state tampered ${id}`);if(count===1)assert(e.state_hash===head.state_hash,'HEAD does not match latest event');id=e.previous_event;expected=e.previous_hash;revision--;}
    assert(revision===0, 'history does not reach genesis');return {verified:true,slug,revision:head.revision,moments:count};
  }
  async putArtifact(slug,file,{mime=null,actor='agent',drive=true,expectedRevision,classification='INTERNAL'}={}){
    const buf=await readFile(file);return this.putArtifactBuffer(slug,basename(file),buf,{mime,actor,drive,expectedRevision,classification});
  }
  async putArtifactBuffer(slug,name,buf,{mime='application/octet-stream',actor='agent',drive=true,expectedRevision,classification='INTERNAL',requestId=null,requestDigest=null,origin=null}={}){
    assert(Buffer.isBuffer(buf),'artifact must be buffer');assert(buf.length>0,'empty artifact');
    const head=await this.load(slug);assert(head,'project missing');assert(expectedRevision===head.revision,`CONFLICT expected revision ${expectedRevision}, current ${head.revision}`);
    await this.ensurePrivacy(head.state,classification);
    const originalSha=sha256(buf), originalBytes=buf.length;
    const security=encodeArtifact({bytes:buf,filename:name,slug,classification});
    buf=security.bytes; name=security.storedName; mime=security.encrypted?'application/octet-stream':mime;
    assert(buf.length<=2_000_000_000,'artifact exceeds GitHub release-asset reference limit; explicitly select another approved GitHub-backed mechanism');
    const digest=sha256(buf);let stored,warning=null;
    // PCS3 quality-first: GitHub ALWAYS holds a complete binary mirror. Drive is a convenient primary presentation link only.
    let mirror;
    if(buf.length <= 800_000){const path=`${projectPath(slug)}/artifacts/${digest}-${basename(name).replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
      const old=await this.github.getFile(path);if(!old)await this.github.putImmutable(path,buf);else assert(sha256(old.buffer)===digest,'GitHub artifact path conflict');
      mirror={storage:'github-contents',path,bytes:buf.length,sha256:digest,name:basename(name)};
    }else mirror=await this.github.putLargeAsset(slug,buf,name,mime);
    stored=mirror;
    if(drive && this.drive){try{
      const d=await this.drive.upload(name,buf,mime);
      stored={...d,github_mirror:mirror};
    }catch(e){warning=`Drive unavailable, GitHub mirror is authoritative fallback: ${e.message}`;}}
    const state=structuredClone(head.state);state.artifacts.push({id:`ART-${randomUUID()}`,created_at:now(),actor,source:stored,...(origin?{origin}:{}),mime,classification:security.classification,encrypted:security.encrypted,...(security.encrypted?{encryption:security.encryption,plaintext_sha256:originalSha,plaintext_bytes:originalBytes}:{}),sha256:digest,bytes:buf.length});state.updated_at=now();
    try{const checkpoint=await this.commit(slug,state,{expectedRevision:head.revision,actor,reason:`record artifact ${name}`,requestId,requestDigest});return {artifact:state.artifacts.at(-1),checkpoint,warning};}
    catch(e){throw Error(`ARTIFACT_ORPHANED: blob stored at ${JSON.stringify(stored)} but manifest not committed; reconcile before retry. ${e.message}`);}
  }
  async auditArtifacts(slug,{checkDrive=false}={}){
    const h=await this.load(slug);assert(h,'project missing');const results=[];
    for(const art of h.state.artifacts){
      const ref=art.source.github_mirror??art.source;
      let result={id:art.id,github:'NOT_CHECKED',drive:art.source.storage==='google-drive'?'NOT_CHECKED':'NA'};
      try{
        let data;
        if(ref.storage==='github-contents'){
          const f=await this.github.getFile(ref.path);assert(f,`mirror missing ${ref.path}`);data=f.buffer;
        }else if(ref.storage==='github-release')data=await this.github.getLargeAsset(ref.asset_id);
        else throw Error('unrecognized Github mirror');
        assert(data.length===art.bytes && sha256(data)===art.sha256,'Github mirror size/hash mismatch');result.github='PASS';
      }catch(e){result.github='FAIL';result.github_error=e.message;}
      if(checkDrive && art.source.storage==='google-drive'){
        if(!this.drive)result.drive='UNAVAILABLE';
        else try{const buf=await this.drive.readFile(art.source.file_id);assert(buf.length===art.bytes && sha256(buf)===art.sha256,'Drive byte mismatch');result.drive='PASS';}
          catch(e){result.drive='FAIL';result.drive_error=e.message;}
      }
      results.push(result);
    }
    return {slug,revision:h.revision,count:results.length,pass:results.filter(x=>x.github==='PASS').length,all_github_pass:results.every(x=>x.github==='PASS'),results};
  }
  async resume(slug){const h=await this.load(slug);assert(h,'project missing');return {project:h.project,revision:h.revision,name:h.state.name,phase:h.state.phase,current:h.state.current,source_refs:h.state.source_refs,counts:Object.fromEntries(['tasks','features','flows','releases','artifacts'].map(x=>[x,h.state[x].length])),head_sha:h.blob_sha,updated_at:h.updated_at};}
}
export async function importSourceFile(file){const ext=extname(file).toLowerCase();const data=await readFile(file);assert(['.md','.txt','.pdf','.docx'].includes(ext),'unsupported SRS format');return {name:basename(file),buffer:data,mime:ext==='.pdf'?'application/pdf':ext==='.docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'text/plain'};}
