// Optional, read-only PCS state inspector. Output intentionally excludes secret-bearing free text.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSimple} from '../runtime/pcs3-simple.mjs';

const GROUPS=['tasks','features','flows','releases'];
const ALL=[...GROUPS,'decisions','risks','approvals','artifacts'];
const idOf=(x,i)=>typeof x?.id==='string'?x.id:'#'+(i+1);
const small=(s)=>typeof s==='string'?s.slice(0,80):null;
function opts(o={}) {
 const limit=o.limit===undefined?12:Number(o.limit);
 if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw Error('INVALID_LIMIT: 1..50');
 if(o.group!==undefined&&!ALL.includes(o.group))throw Error('INVALID_GROUP');
 return {limit,group:o.group};
}
export function inspect(doc,options={}) {
 validateSimple(doc);
 const {limit,group}=opts(options), s=doc.state;
 const groups=group?[group]:ALL;
 const counts=Object.fromEntries(ALL.map(k=>[k,{total:s[k].length,open:GROUPS.includes(k)?s[k].filter(x=>!['ACCEPTED','CANCELLED'].includes(x.status)).length:undefined}]));
 const selected={};
 for(const k of groups){
   const rows=s[k];
   const open=GROUPS.includes(k)?rows.filter(x=>!['ACCEPTED','CANCELLED'].includes(x.status)):rows;
   const current=s.current?.active_task;
   const focus=open.filter(x=>x.id===current);
   const priority=open.filter(x=>x.id!==current&&['BLOCKED','IN_PROGRESS','TECH_DONE','INTEGRATION_PENDING'].includes(x.status));
   const rest=open.filter(x=>x.id!==current&&!priority.includes(x));
   const picked=[...focus,...priority,...rest].slice(0,limit);
   selected[k]={shown:picked.map(x=>({id:idOf(x,rows.indexOf(x)),status:x.status??null,classification:x.classification??null})),remaining:open.length-picked.length};
 }
 return {schema:'pcs.state-inspect.v1',revision:doc.revision,project:small(s.slug),phase:small(s.phase),active_task:small(s.current.active_task),next_action_present:!!s.current.next_action,counts,selected};
}
export function compareState(before,after,options={}) {
 validateSimple(before);validateSimple(after);
 const {limit}=opts(options);
 if(before.state.slug!==after.state.slug)throw Error('PROJECT_MISMATCH');
 if(after.revision<=before.revision)throw Error('NON_INCREMENTAL_REVISION');
 const changes={};let total=0;
 for(const k of ALL){
   const left=new Map(before.state[k].map((x,i)=>[idOf(x,i),x]));
   const right=new Map(after.state[k].map((x,i)=>[idOf(x,i),x]));
   const rows=[];
   for(const [id,v] of right)if(!left.has(id))rows.push({id,kind:'ADDED'});
     else if(JSON.stringify(left.get(id))!==JSON.stringify(v)){
       const prev=left.get(id);
       rows.push({id,kind:'CHANGED',status_before:prev.status??null,status_after:v.status??null,
         fields_changed:[...new Set([...Object.keys(prev),...Object.keys(v)])].filter(field=>JSON.stringify(prev[field])!==JSON.stringify(v[field])).slice(0,20)});
     }
   for(const [id] of left)if(!right.has(id))rows.push({id,kind:'REMOVED'});
   total+=rows.length;changes[k]={total:rows.length,shown:rows.slice(0,limit),remaining:Math.max(0,rows.length-limit)};
 }
 return {schema:'pcs.state-diff.v1',project:before.state.slug,from:before.revision,to:after.revision,total_changes:total,changes,
   warning:'This structural diff is not a test/evidence or approval verification. Free-text and secrets are intentionally omitted.'};
}
async function main(){
 const args=process.argv.slice(2),cmd=args[0],p={};for(const a of args.slice(1)){const i=a.indexOf('=');if(!a.startsWith('--')||i<3)throw Error('INVALID_OPTION');p[a.slice(2,i)]=a.slice(i+1);}
 if(!['inspect','diff'].includes(cmd))throw Error('Usage: inspect --file=pcs/STATE.json [--group=tasks] [--limit=12] | diff --before=old.json --after=new.json [--limit=12]');
 const read=async path=>JSON.parse(await readFile(path,'utf8'));
 const result=cmd==='inspect'?inspect(await read(p.file),p):compareState(await read(p.before),await read(p.after),p);
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error('PCS_STATE_INSPECT: '+e.message);process.exitCode=1;});
