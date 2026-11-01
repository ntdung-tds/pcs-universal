/** PCS SRS delta ledger v1. Optional helper, does not update original SRS. */
import {readFile,writeFile,open,rename,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const HEADER='# PCS SRS Changes\n<!-- pcs-srs-changes:v1 -->\n';
const ID=/^[A-Za-z][A-Za-z0-9._-]{0,79}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
const good=(x,max=2000)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const validISO=s=>{
 if(typeof s!=='string')return false;
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(s);
 if(!m)return false;
 const d=new Date(s);if(!Number.isFinite(d.valueOf()))return false;
 const tz=m[7],offset=tz==='Z'?0:(tz[0]==='+'?1:-1)*(Number(tz.slice(1,3))*60+Number(tz.slice(4,6)));
 if(Math.abs(offset)>14*60)return false;
 const local=new Date(d.valueOf()+offset*60000).toISOString();
 return local.slice(0,19)===s.slice(0,19);
};
const check=(ok,msg)=>{if(!ok)throw Error('PCS_SRS_CHANGE: '+msg)};
export function parseLedger(markdown=HEADER){
 check(typeof markdown==='string'&&markdown.startsWith(HEADER),'INVALID_HEADER');
 const pattern=/^```pcs-change\n([^\n]+)\n```$/gm;
 const events=[],proposals=new Map(),decided=new Set(),tips=new Map();
 let match;
 while((match=pattern.exec(markdown))!==null){
  let e;try{e=JSON.parse(match[1])}catch{throw Error('PCS_SRS_CHANGE: INVALID_EVENT_JSON')}
  check(e&&typeof e==='object'&&!Array.isArray(e)&&ID.test(e.id??''),'INVALID_CHANGE_ID');
  if(e.kind==='PROPOSE'){
   check(!proposals.has(e.id),'DUPLICATE_CHANGE_ID');
   check(ID.test(e.item_key??'')&&ID.test(e.task_id??''),'INVALID_WORK_CONTEXT');
   check(e.feature_id===null||e.feature_id===undefined||ID.test(e.feature_id),'INVALID_FEATURE');
   check(e.srs_ref==='UNMAPPED'||good(e.srs_ref,512),'INVALID_SRS_REF');
   check(good(e.before)&&good(e.after)&&e.before!==e.after,'INVALID_DELTA');
   check(good(e.reason,512)&&good(e.at,64)&&validISO(e.at),'INVALID_PROVENANCE');
   check(e.based_on===(tips.get(e.item_key)??'BASELINE'),'STALE_PROPOSAL_BASE:'+e.id);
   proposals.set(e.id,e);
  }else if(e.kind==='DECIDE'){
   const p=proposals.get(e.id);
   check(p&&!decided.has(e.id),'MISSING_OR_DUPLICATE_PROPOSAL');
   check(e.decision==='APPROVED'||e.decision==='REJECTED','INVALID_DECISION');
   check(good(e.actor,256)&&good(e.ref,1024)&&good(e.at,64)&&validISO(e.at),'DECISION_PROVENANCE_REQUIRED');
   if(e.decision==='APPROVED'){
    check(p.based_on===(tips.get(p.item_key)??'BASELINE'),'STALE_APPROVAL_BASE:'+e.id);
    tips.set(p.item_key,e.id);
   }
   decided.add(e.id);
  }else check(false,'INVALID_EVENT_KIND');
  events.push(e);
 }
 check((markdown.match(/^```pcs-change$/gm)||[]).length===events.length,'UNPARSED_EVENT');
 return {events,proposals,decided,tips};
}
export function activeContext(doc,{tasks,features}={}){
 const s=doc?.state??doc, allTasks=tasks??s?.tasks, allFeatures=features??s?.features??[];
 const id=s?.current?.active_task??s?.project?.active_task_id;
 check(ID.test(id??'')&&Array.isArray(allTasks),'ACTIVE_TASK_REQUIRED');
 const task=allTasks.find(t=>t.id===id);check(task,'ACTIVE_TASK_NOT_FOUND');
 const related=allFeatures.filter(f=>f.required_tasks?.includes(id)||task.feature_ids?.includes(f.id));
 const feature=related.length===1?related[0]:null;
 const ref=task.srs_ref??task.requirement_ref??feature?.srs_ref??'UNMAPPED';
 return {task_id:id,feature_id:feature?.id??null,item_key:feature?.id??id,
  srs_ref:good(ref,512)?ref:'UNMAPPED',mapping:'ACTIVE_CONTEXT',ambiguous_features:related.length>1};
}
export function appendEvent(markdown,event){
 const before=parseLedger(markdown);
 const heading='### '+event.id+' — '+event.kind+(event.kind==='DECIDE'?' '+event.decision:'');
 const updated=markdown.replace(/\s*$/,'\n')+'\n'+heading+'\n\n```pcs-change\n'+JSON.stringify(event)+'\n```\n';
 check(parseLedger(updated).events.length===before.events.length+1,'EVENT_NOT_APPENDED');
 return updated;
}
export function proposeFromActive(markdown,doc,{tasks,features,id,before,after,reason,at,source_ref,requirement_key}={}){
 const c=activeContext(doc,{tasks,features});check(ID.test(id??''),'INVALID_CHANGE_ID');
 // The agent infers a short stable criterion slug; the human never supplies an SRS section number.
 // A Feature/Task is context, NOT a unique requirement. Never merge independent criteria.
 check(typeof requirement_key==='string'&&/^[a-z][a-z0-9-]{1,39}$/.test(requirement_key),'REQUIREMENT_KEY_REQUIRED');
 const item_key=c.item_key+'.'+requirement_key;
 check(ID.test(item_key),'REQUIREMENT_SCOPE_TOO_LONG');
 const ledger=parseLedger(markdown);
 // Existing v1 records keyed only by Feature/Task are ambiguous; do not silently fork or relabel.
 check(![...ledger.proposals.values()].some(p=>p.item_key===c.item_key&&p.requirement_key===undefined),'LEGACY_SCOPE_REVIEW_REQUIRED');
 const prior=ledger.proposals.get(ledger.tips.get(item_key));
 if(prior)check(before===prior.after,'DELTA_BASELINE_MISMATCH');
 const e={kind:'PROPOSE',id,...c,item_key,requirement_key,based_on:ledger.tips.get(item_key)??'BASELINE',
  before,after,reason,at:at??new Date().toISOString()};
 if(source_ref!==undefined)e.source_ref=source_ref;
 return {event:e,markdown:appendEvent(markdown,e)};
}
export function summary(markdown,{item_key,task_id,feature_id,limit=6,max_items=8}={}){
 check(Number.isInteger(limit)&&limit>=1&&limit<=20,'INVALID_LIMIT');
 check(Number.isInteger(max_items)&&max_items>=1&&max_items<=50,'INVALID_MAX_ITEMS');
 for(const x of [item_key,task_id,feature_id])if(x!==undefined)check(ID.test(x),'INVALID_FILTER');
 const {proposals,decided,tips}=parseLedger(markdown),all=[...proposals.values()];
 const keys=item_key?[item_key]:[...new Set(all.filter(p=>(!task_id||p.task_id===task_id)&&(!feature_id||p.feature_id===feature_id)).map(p=>p.item_key))];
 return {schema:'pcs.srs-changes.v1',total_items:keys.length,remaining_items:Math.max(0,keys.length-max_items),items:keys.slice(0,max_items).map(key=>{
  const records=[...proposals.values()].filter(p=>p.item_key===key),
   effective=tips.get(key)??null,final=effective?proposals.get(effective):null,
   pending=records.filter(p=>!decided.has(p.id));
  return {item_key:key,task_id:records.at(-1)?.task_id??null,
   feature_id:records.at(-1)?.feature_id??null,requirement_key:records.at(-1)?.requirement_key??null,
   srs_ref:records.at(-1)?.srs_ref??'UNMAPPED',effective_change_id:effective,
   effective_delta:final?{before:final.before,after:final.after}:null,
   pending_count:pending.length,history_count:records.length,
   recent_change_ids:records.slice(-limit).map(p=>p.id),verified_external_decision:false};
 }),warning:'Recorded decisions require independent GitHub verification; never auto-update original SRS.'};
}
async function main(){
 const a={};for(const arg of process.argv.slice(2)){const i=arg.indexOf('=');check(arg.startsWith('--')&&i>2,'INVALID_OPTION');a[arg.slice(2,i)]=arg.slice(i+1);}
 const root=resolve(a.root??'.'),file=join(root,'pcs','SRS_CHANGES.md');
 const read=()=>readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return HEADER;throw e});
 if(a.record){
  const lock=await open(file+'.lock','wx');
  try{
   const latest=await read();
   if(a.expect)check(sha(latest)===a.expect,'STALE_FILE_HASH');
   const record=JSON.parse(await readFile(a.record,'utf8'));
   let event;
   if(record.kind==='PROPOSE'){
    let doc,tasks,features;
    if(a.desktop==='true'){
     doc={project:JSON.parse(await readFile(join(root,'pcs','project.json'),'utf8'))};
     tasks=JSON.parse(await readFile(join(root,'pcs','tasks.json'),'utf8'));
     features=JSON.parse(await readFile(join(root,'pcs','features.json'),'utf8'));
    }else doc=JSON.parse(await readFile(join(root,'pcs','STATE.json'),'utf8'));
    event=proposeFromActive(latest,doc,{...record,tasks,features}).event;
   }else event=record;
   const next=appendEvent(latest,event),temp=file+'.'+randomUUID()+'.tmp';
   await writeFile(temp,next,{flag:'wx'});await rename(temp,file);
   process.stdout.write(JSON.stringify({recorded:event.id,kind:event.kind,sha256:sha(next)})+'\n');
  }finally{await lock.close();await rm(file+'.lock',{force:true});}
 }else process.stdout.write(JSON.stringify(summary(await read(),{item_key:a.item,task_id:a.task,feature_id:a.feature,limit:a.limit?Number(a.limit):6,max_items:a['max-items']?Number(a['max-items']):8}),null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1});
