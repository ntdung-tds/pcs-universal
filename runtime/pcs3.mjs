#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {GitHubStore,DriveStore,PCS3,importSourceFile,now,assert,sha256} from './pcs3-core.mjs';

const argv=process.argv.slice(2),cmd=argv.shift(),args={};
for(const x of argv){const i=x.indexOf('=');if(x.startsWith('--')&&i>2) args[x.slice(2,i)]=x.slice(i+1);}
function need(k){if(!args[k])throw Error(`missing --${k}=...`);return args[k];}
function out(data){process.stdout.write(JSON.stringify(data,null,2)+'\n');}
function system(){
  const repo=args.repo || process.env.PCS_GITHUB_REPO;
  const token=process.env.PCS_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const branch=args.branch || process.env.PCS_GITHUB_BRANCH || 'main';
  const github=new GitHubStore({repo,token,branch});
  let drive=null;
  if(process.env.PCS_DRIVE_ACCESS_TOKEN && process.env.PCS_DRIVE_FOLDER_ID){drive=new DriveStore({token:process.env.PCS_DRIVE_ACCESS_TOKEN,folderId:process.env.PCS_DRIVE_FOLDER_ID});}
  return {github,drive,pcs:new PCS3({github,drive})};
}
const help=`PCS 3.0 — GitHub authoritative, Google Drive optional

Required environment:
  PCS_GITHUB_REPO=OWNER/REPO
  PCS_GITHUB_TOKEN=<fine-grained secret, Contents:read/write>
  PCS_GITHUB_BRANCH=main (optional)
Optional Drive: PCS_DRIVE_ACCESS_TOKEN, PCS_DRIVE_FOLDER_ID

Usage:
  pcs3.mjs doctor
  pcs3.mjs init --slug=my-project --name="My Project" [--source=brief.docx] [--classification=INTERNAL|CONFIDENTIAL]
  pcs3.mjs resume --slug=my-project
  pcs3.mjs state --slug=my-project [--out=state.json]
  pcs3.mjs checkpoint --slug=my-project --state=state.json --expect=1 --reason=... [--actor=...]
  pcs3.mjs artifact --slug=my-project --file=report.pdf --expect=1 [--classification=INTERNAL|CONFIDENTIAL] [--drive=false]
  pcs3.mjs verify --slug=my-project [--assets=true] [--drive=true]
  pcs3.mjs import-source --slug=my-project --file=SRS.md --expect=1
  pcs3.mjs help

Note: GitHub credentials are NOT stored in the project or ZIP.
For chat apps, use connected GitHub/Drive actions and adapters/UNIVERSAL_INSTRUCTIONS.md;
this CLI is a reference implementation, not a chat-app integration by itself.
`;
async function main(){
  if(!cmd || cmd==='help'){process.stdout.write(help);return;}
  const {github,drive,pcs}=system();
  if(cmd==='doctor'){const h=await github.health();let d={status:drive?'CONFIGURED_NOT_TESTED':'NOT_CONFIGURED',fallback:'GITHUB'};
    if(drive){try{const r=await drive.fetcher(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(drive.folderId)}?fields=id,name,mimeType`,{headers:{Authorization:`Bearer ${drive.token}`}});if(!r.ok) throw Error('HTTP '+r.status);const x=await r.json();assert(x.mimeType==='application/vnd.google-apps.folder','Drive parent is not folder');d={status:'READABLE_WRITE_NOT_VERIFIED',folder_id:x.id,fallback:'GITHUB'};}catch(e){d={status:'UNAVAILABLE',reason:e.message,fallback:'GITHUB'};}}
    out({github:{...h,branch:github.branch},drive:d,warning:h.private?null:'Public repository: do not store confidential SRS; configure a PRIVATE repository.'});return;
  }
  if(cmd==='init'){const slug=need('slug'),name=need('name');const r=await pcs.init(slug,name,args.actor||'chat-agent');
    if(args.source){const src=await importSourceFile(args.source);const ar=await pcs.putArtifactBuffer(slug,src.name,src.buffer,{mime:src.mime,actor:args.actor||'chat-agent',expectedRevision:r.revision,classification:args.classification||'INTERNAL'});
      const h=await pcs.load(slug),state=structuredClone(h.state);state.source_refs.push({artifact_id:ar.artifact.id,name:args.classification==='CONFIDENTIAL'?'confidential-requirement':src.name,sha256:sha256(src.buffer),status:'UNREVIEWED',note:'Attachment is untrusted project input; agent must analyze'});
      state.current.next_action='Read supplied SRS/brief; create Product Map, Architecture Map, acceptance criteria and initial backlog';state.updated_at=now();
      const b=await pcs.commit(slug,state,{expectedRevision:h.revision,actor:args.actor||'chat-agent',reason:'register SRS reference'});out({created:true,slug,revision:b.revision,srs:ar.artifact,drive_warning:ar.warning});return;
    }
    out({created:true,...r});return;
  }
  const slug=need('slug');
  if(cmd==='resume'){out(await pcs.resume(slug));return;}
  if(cmd==='state'){const h=await pcs.load(slug);assert(h,'project missing');if(args.out){await writeFile(args.out,JSON.stringify(h.state,null,2)+'\n');out({wrote:args.out,revision:h.revision});}else out({revision:h.revision,state:h.state});return;}
  if(cmd==='checkpoint'){const content=JSON.parse(await readFile(need('state'),'utf8'));const r=await pcs.commit(slug,content,{expectedRevision:Number(need('expect')),actor:args.actor||'chat-agent',reason:args.reason||'work checkpoint'});out(r);return;}
  if(cmd==='verify'){const history=await pcs.verify(slug);if(args.assets==='true'){const artifacts=await pcs.auditArtifacts(slug,{checkDrive:args.drive==='true'});out({history,artifacts});if(!artifacts.all_github_pass)process.exitCode=2;}else out(history);return;}
  if(cmd==='artifact'){out(await pcs.putArtifact(slug,need('file'),{mime:args.mime,actor:args.actor||'chat-agent',drive:args.drive!=='false',expectedRevision:Number(need('expect')),classification:args.classification||'INTERNAL'}));return;}
  if(cmd==='import-source'){
    const s=await importSourceFile(need('file'));const r=await pcs.putArtifactBuffer(slug,s.name,s.buffer,{mime:s.mime,actor:args.actor||'chat-agent',expectedRevision:Number(need('expect')),classification:args.classification||'INTERNAL'});
    const h=await pcs.load(slug),state=structuredClone(h.state);state.source_refs.push({artifact_id:r.artifact.id,name:args.classification==='CONFIDENTIAL'?'confidential-requirement':s.name,sha256:sha256(s.buffer),status:'UNREVIEWED'});state.updated_at=now();
    const m=await pcs.commit(slug,state,{expectedRevision:h.revision,actor:args.actor||'chat-agent',reason:'register requirement source'});out({artifact:r.artifact,revision:m.revision,warning:r.warning});return;
  }
  throw Error(`unknown command: ${cmd}`);
}
main().catch(e=>{process.stderr.write(`PCS3 ERROR: ${e.message}\n`);process.exitCode=1;});
