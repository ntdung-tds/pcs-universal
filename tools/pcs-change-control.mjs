// Read-only requirement change ledger resolver (compatible with existing PCS schemas).
// The canonical project state stores compact change records; Git is the immutable audit trail.
// Approval fields are recorded claims: check authenticated GitHub review/commit independently.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ID=/^[A-Za-z][A-Za-z0-9._-]{0,79}$/;
const SHA=/^[a-fA-F0-9]{64}$/;
const STATES=new Set(['PROPOSED','REJECTED','APPROVED']);
const clean=(x)=>typeof x==='string'&&x.length>0&&x.length<=1024;
function fail(reason){throw Error('PCS_CHANGE_CONTROL: '+reason);}
export function effectiveRequirements(changes,{itemId,limit=8}={}){
 if(!Array.isArray(changes))fail('INVALID_LEDGER');
 if(!Number.isSafeInteger(limit)||limit<1||limit>50)fail('INVALID_LIMIT');
 if(itemId!==undefined&&!ID.test(itemId))fail('INVALID_ITEM_ID');
 const byId=new Map(),groups=new Map();
 for(const c of changes){
  if(!c||typeof c!=='object'||!ID.test(c.id??'')||!ID.test(c.item_id??'')||
     !STATES.has(c.status)||!clean(c.baseline_ref)||!ID.test(c.based_on??'' )&&c.based_on!=='BASELINE')
    fail('INVALID_CHANGE_RECORD');
  if(byId.has(c.id))fail('DUPLICATE_CHANGE_ID');
  if(c.baseline_sha256!==undefined&&!SHA.test(c.baseline_sha256))fail('INVALID_BASELINE_DIGEST');
  if(c.status==='APPROVED'&&(!SHA.test(c.baseline_sha256??'')||!SHA.test(c.final_sha256??'')||
    !clean(c.final_ref)||!clean(c.decision?.by)||!clean(c.decision?.ref)))
    fail('APPROVAL_EVIDENCE_FIELDS_REQUIRED');
  byId.set(c.id,c);
  if(!groups.has(c.item_id))groups.set(c.item_id,[]);
  groups.get(c.item_id).push(c);
 }
 for(const [item,items] of groups){
  const source=items[0].baseline_ref, pinned=items.find(x=>x.baseline_sha256)?.baseline_sha256;
  for(const x of items)if(x.baseline_ref!==source||x.baseline_sha256&&pinned&&x.baseline_sha256!==pinned)fail('BASELINE_MISMATCH:'+item);
  const approved=items.filter(x=>x.status==='APPROVED'),children=new Map();
  for(const x of approved){
   if(x.based_on!=='BASELINE'){
    const previous=byId.get(x.based_on);
    if(!previous||previous.item_id!==item||previous.status!=='APPROVED')fail('UNAPPROVED_PREDECESSOR:'+x.id);
   }
   if(children.has(x.based_on))fail('AMBIGUOUS_APPROVED_BRANCH:'+item);
   children.set(x.based_on,x);
  }
  if(approved.length){
   let previous='BASELINE',visited=0;
   while(children.has(previous)){const next=children.get(previous);previous=next.id;visited++;if(visited>approved.length)fail('CHANGE_CYCLE:'+item);}
   if(visited!==approved.length)fail('DISCONNECTED_APPROVAL_CHAIN:'+item);
  }
 }
 const summary=[];
 for(const [item,items] of groups){
  if(itemId&&item!==itemId)continue;
  let current='BASELINE',record=null;
  const candidates=items.filter(x=>x.status==='APPROVED');
  while(true){const next=candidates.find(x=>x.based_on===current);if(!next)break;record=next;current=next.id;}
  const proposals=items.filter(x=>x.status==='PROPOSED');
  summary.push({item_id:item,baseline_ref:items[0].baseline_ref,
   effective_change_id:record?.id??null,
   effective_ref:record?.final_ref??items[0].baseline_ref,
   pending_count:proposals.length,approved_count:candidates.length,
   rejected_count:items.filter(x=>x.status==='REJECTED').length,
   stale_proposals:proposals.filter(x=>x.based_on!==current).map(x=>x.id).slice(0,limit),
   recent_change_ids:items.slice(-limit).map(x=>({id:x.id,status:x.status})),
   approval_externally_verified:false,
   warning:'Recorded final is a state claim until GitHub decision identity, pinned source and revision are independently verified.'});
 }
 if(itemId&&!groups.has(itemId))return {schema:'pcs.requirement-changes.v1',items:[],
  warning:'No override: use original SRS baseline. Absence of records is not proof requirements were reviewed.'};
 return {schema:'pcs.requirement-changes.v1',items:summary,
  warning:'Read-only view. Do not infer implemented/tested/accepted from an approved requirement change.'};
}
async function main(){
 const options={};for(const arg of process.argv.slice(2)){const i=arg.indexOf('=');if(!arg.startsWith('--')||i<3)fail('INVALID_OPTION');options[arg.slice(2,i)]=arg.slice(i+1);}
 if(!options.file)fail('Usage: node tools/pcs-change-control.mjs --file=/project/pcs/STATE.json [--item=FEAT-001] [--limit=8]');
 const doc=JSON.parse(await readFile(options.file,'utf8'));
 const values=doc.state?.requirement_changes??doc.requirement_changes??[];
 const result=effectiveRequirements(values,{itemId:options.item,limit:options.limit===undefined?8:Number(options.limit)});
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
