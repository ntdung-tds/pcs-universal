// Optional read-only context selector. Validates the complete state; emits bounded metadata only.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSimple} from '../runtime/pcs3-simple.mjs';

const ROLES=new Set(['lead','contributor','solo']);
const SENSITIVE=['production','destructive','iam_change','credentials_change','external_spend','data_migration','security_sensitive','requires_owner_approval'];
const OPEN=x=>!['ACCEPTED','CANCELLED'].includes(x.status);
export function contextPacket(doc,{taskId,role='lead',limit=6}={}){
  validateSimple(doc);
  if(!ROLES.has(role))throw Error('INVALID_ROLE');
  if(!Number.isSafeInteger(Number(limit))||Number(limit)<1||Number(limit)>12)throw Error('INVALID_LIMIT');
  const s=doc.state, id=taskId??s.current?.active_task, selected=id?s.tasks.find(x=>x.id===id):null;
  if(id&&!selected)throw Error('TASK_NOT_FOUND');
  const inputRisk=String(selected?.risk??'UNKNOWN').toUpperCase();
  const risk=['LOW','NORMAL','HIGH','CRITICAL'].includes(inputRisk)?inputRisk:'UNKNOWN';
  const cls=selected?.classification;
  const classification=['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'].includes(cls)?cls:'UNCLASSIFIED';
  const deps=(selected?.dependencies??[]).map(x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9._-]{0,79}$/.test(x)?x:'REDACTED');
  const flags=SENSITIVE.filter(k=>selected?.[k]===true);
  const high=!!selected&&(!['LOW','NORMAL'].includes(risk)||
    !['PUBLIC','INTERNAL',undefined].includes(cls)||flags.length>0);
  const preview=s.tasks.filter(OPEN).sort((a,b)=>Number(b.id===id)-Number(a.id===id)).slice(0,Number(limit))
    .map(x=>({id:x.id,status:x.status}));
  return {
    schema:'pcs.context-packet.v1',revision:doc.revision,project:s.slug,role,
    active_task:s.current?.active_task??null,task:selected?{
      id:selected.id,status:selected.status,risk,
      classification,
      dependencies:deps.slice(0,20),
      dependencies_remaining:Math.max(0,deps.length-20),
      sensitive_flags:flags,owner_review_required:high
    }:null,
    backlog:{open:s.tasks.filter(OPEN).length,shown:preview,remaining:Math.max(0,s.tasks.filter(OPEN).length-preview.length)},
    blockers_count:s.current?.blockers?.length??0,next_action_present:!!s.current?.next_action,
    fetch_next:['pcs/MOMENT.md','task-specific code and tests','PR/Issue and verified evidence for selected task'],
    handoff_contract:{task_id:selected?.id??null,goal:'RETRIEVE_FROM_APPROVED_REQUIREMENTS',
      scope:'RETRIEVE_ONLY_RELEVANT_PATHS',acceptance:'VERIFY_AGAINST_SOURCE',
      pr:'NOT_VERIFIED',tests:'NOT_VERIFIED',owner_approval:'NOT_VERIFIED'},
    warning:'Metadata only. Never infer authorization, acceptance, test PASS or approval from this packet. Verify HEAD/revision and the full canonical state before writing.'
  };
}
async function main(){
  const a={};for(const s of process.argv.slice(2)){const i=s.indexOf('=');if(!s.startsWith('--')||i<3)throw Error('INVALID_OPTION');a[s.slice(2,i)]=s.slice(i+1);}
  if(!a.file)throw Error('Usage: node tools/pcs-context.mjs --file=pcs/STATE.json [--task=T1] [--role=lead] [--limit=6]');
  const doc=JSON.parse(await readFile(a.file,'utf8'));
  process.stdout.write(JSON.stringify(contextPacket(doc,{taskId:a.task,role:a.role,limit:a.limit===undefined?6:Number(a.limit)}),null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error('PCS_CONTEXT: '+e.message);process.exitCode=1;});
