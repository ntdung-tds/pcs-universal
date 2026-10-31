#!/usr/bin/env node
// Optional private HTTP integration bridge. Requires an authenticated HTTPS reverse proxy in remote deployments.
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import {GitHubStore,DriveStore,PCS3,assert} from './pcs3-core.mjs';

const MAX_BODY=1024*1024; // direct chat JSON max 1 MB; large binary -> CLI or provider tools
const ok=(res,status,data)=>{const b=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b);};
function safeAuth(header,secret){if(!secret || typeof header!=='string'||!header.startsWith('Bearer '))return false;const a=Buffer.from(header.slice(7)),b=Buffer.from(secret);return a.length===b.length && timingSafeEqual(a,b);}
async function body(req){let n=0,parts=[];for await(const p of req){n+=p.length;if(n>MAX_BODY)throw Object.assign(Error('payload exceeds 1 MiB'),{code:413});parts.push(p);}return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');}
const slugRx='[a-z0-9][a-z0-9-]{1,62}';
function route(p){if(p==='/health')return {name:'health'};if(p==='/projects')return {name:'projects'};const a=p.match(new RegExp(`^/projects/(${slugRx})/(resume|state|verify|checkpoint|artifacts)$`));return a?{name:a[2],slug:a[1]}:null;}
export function createGateway({pcs,github,secret}){
 assert(typeof secret==='string' && secret.length>=24,'PCS_GATEWAY_KEY must be at least 24 characters');
 const server=http.createServer(async(req,res)=>{
  try{
   if(!safeAuth(req.headers.authorization,secret)){ok(res,401,{error:'unauthorized'});return;}
   const u=new URL(req.url,'http://localhost');const r=route(u.pathname);if(!r){ok(res,404,{error:'not found'});return;}
   if(r.name==='health' && req.method==='GET'){const h=await github.health();ok(res,200,{ok:true,repo:h.full_name,private:h.private});return;}
   if(r.name==='projects' && req.method==='POST'){
     const data=await body(req);const result=await pcs.init(data.slug,data.name,data.actor || 'chat');ok(res,201,result);return;
   }
   if(r.name==='resume' && req.method==='GET'){ok(res,200,await pcs.resume(r.slug));return;}
   if(r.name==='state' && req.method==='GET'){const h=await pcs.load(r.slug);assert(h,'project not found');ok(res,200,{revision:h.revision,state:h.state});return;}
   if(r.name==='verify' && req.method==='GET'){ok(res,200,await pcs.verify(r.slug));return;}
   if(r.name==='checkpoint' && req.method==='POST'){
     const d=await body(req);assert(Number.isInteger(d.expected_revision),'expected_revision integer required');const x=await pcs.commit(r.slug,d.state,{expectedRevision:d.expected_revision,actor:d.actor || 'chat',reason:d.reason || 'chat checkpoint'});ok(res,200,x);return;
   }
   if(r.name==='artifacts' && req.method==='POST'){
     const d=await body(req);assert(Number.isInteger(d.expected_revision),'expected_revision integer required');assert(typeof d.base64==='string' && d.base64.length>0 && Buffer.byteLength(d.base64,'utf8')<950_000,'base64 max 950KB; use CLI for large files');
     assert(/^[A-Za-z0-9+/]*={0,2}$/.test(d.base64) && d.base64.length%4===0,'invalid base64');
     const x=await pcs.putArtifactBuffer(r.slug,d.name,Buffer.from(d.base64,'base64'),{expectedRevision:d.expected_revision,mime:d.mime || 'application/octet-stream',actor:d.actor||'chat',drive:d.drive!==false,classification:d.classification||'INTERNAL'});ok(res,200,x);return;
   }
   ok(res,405,{error:'method not allowed'});
  }catch(e){const msg=String(e.message);const status=e.code===413?413:/CONFLICT|409|already exists|CHECKPOINT_NOT_PUBLISHED|ARTIFACT_ORPHANED/.test(msg)?409:/missing|invalid|must |required|unsupported/.test(msg)?400:500;ok(res,status,{error:status===500?'internal error; check secured server logs':msg});}
 });return server;
}
if(process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href){
 const repo=process.env.PCS_GITHUB_REPO,token=process.env.PCS_GITHUB_TOKEN||process.env.GITHUB_TOKEN;
 const gh=new GitHubStore({repo,token,branch:process.env.PCS_GITHUB_BRANCH||'main'});
 const drive=process.env.PCS_DRIVE_ACCESS_TOKEN&&process.env.PCS_DRIVE_FOLDER_ID?new DriveStore({token:process.env.PCS_DRIVE_ACCESS_TOKEN,folderId:process.env.PCS_DRIVE_FOLDER_ID}):null;
 const s=createGateway({github:gh,pcs:new PCS3({github:gh,drive}),secret:process.env.PCS_GATEWAY_KEY});
 const host=process.env.PCS_GATEWAY_HOST||'127.0.0.1',port=Number(process.env.PCS_GATEWAY_PORT||8789);
 s.listen(port,host,()=>process.stderr.write(`PCS3 gateway on ${host}:${port}. Never expose without TLS and authentication.\n`));
}
