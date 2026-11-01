/** PCS Simple Mode: one project repository, one state file, no GitHub App/Inbox required.
 * A web AI can use the documented JSON structure with GitHub Contents SHA CAS.
 * This optional local helper is for agents that have a terminal.
 */
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,open,rename,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {emptyState,validateState,now,stable,sha256,assert,validSlug} from './pcs3-core.mjs';
import {assertSafeState} from './pcs3-security.mjs';
import {validateProjectCollaboration} from './pcs3-collaboration.mjs';
import {validateDelivery,latestOwnerFeedback} from './pcs3-delivery.mjs';

export function makeSimpleState(slug,name,actor='agent') {
  return {schema:'pcs3.simple.v1',revision:1,updated_at:now(),state:emptyState(slug,name,actor)};
}
export function validateSimple(doc) {
  assert(doc && doc.schema==='pcs3.simple.v1','simple schema must be pcs3.simple.v1');
  assert(Number.isSafeInteger(doc.revision) && doc.revision>0,'simple revision must be positive integer');
  validateState(doc.state); validateProjectCollaboration(doc.state); validateDelivery(doc.state); assertSafeState(doc.state);
  assert(!doc.updated_at || !Number.isNaN(Date.parse(doc.updated_at)),'simple updated_at invalid');
  assert(stable(doc).length<=750000,'simple state too large');
  return true;
}
export function renderMoment(doc) {
  validateSimple(doc);
  const s=doc.state;
  const group=(key)=>{
    const items=s[key], current=s.current?.active_task;
    const pending=items.filter(t=>!['ACCEPTED','CANCELLED'].includes(t.status));
    const focus=pending.filter(t=>t.id===current);
    const priority=pending.filter(t=>t.id!==current && ['IN_PROGRESS','BLOCKED','TECH_DONE','INTEGRATION_PENDING'].includes(t.status));
    const other=pending.filter(t=>t.id!==current && !priority.includes(t));
    const selected=[...focus,...priority,...other].slice(0,12);
    const recentDone=items.filter(t=>t.status==='ACCEPTED').slice(-3);
    const line=t=>`- ${t.id}: ${String(t.title||t.name||'Untitled').replace(/[\r\n]/g,' ').slice(0,120)} — ${t.status}${t.github_issue?` — ${t.github_issue}`:''}`;
    const unshown=pending.length-selected.length;
    return `- Total: ${items.length}; Open: ${pending.length}; Accepted: ${items.filter(t=>t.status==='ACCEPTED').length}; Cancelled: ${items.filter(t=>t.status==='CANCELLED').length}\n`+
      ([...selected,...recentDone].map(line).join('\n')||'- Chưa có')+
      (unshown?`\n- ... ${unshown} additional open items in pcs/STATE.json`:'')+
      (items.filter(t=>t.status==='ACCEPTED').length>recentDone.length?`\n- ... earlier accepted items in pcs/STATE.json`:'');
  };
  const pending=s.tasks.filter(t=>t.status==='TECH_DONE'||t.status==='INTEGRATION_PENDING').length;
  const c=s.collaboration;
  const collaboration=c?`## AI collaboration\n- **Lead:** ${c.lead?.agent_id??'Not owner-delegated'}\n- **Approved agents:** ${c.agents.filter(a=>a.status==='ACTIVE'||a.status==='IDLE').length}\n- **Pending requests:** ${c.proposals.filter(p=>p.status==='PENDING').length}\n\n`:'';
  return `# PCS Moment — ${s.name}\n\n`+
    `- **Source of truth:** \`pcs/STATE.json\` (revision ${doc.revision})\n`+
    `- **Updated:** ${doc.updated_at}\n`+
    `- **Phase:** ${s.phase||'DISCOVERY'}\n`+
    `- **Next action:** ${s.current.next_action}\n`+
    `- **Active task:** ${s.current.active_task||'None'}\n`+
    `- **Last completed step:** ${s.current.last_completed_step||'Not recorded'}\n`+
    `- **Blockers:** ${(s.current.blockers||[]).join('; ')||'None'}\n`+
    `- **Technically complete but not accepted:** ${pending}\n\n`+
    collaboration+`## Owner conversation notes (unverified)\n${s.delivery?.owner_notes?.length?s.delivery.owner_notes.slice(-5).map(n=>'- '+n.scope+' '+n.target+': '+n.preference+' (UNVERIFIED_CHAT)').join('\n'):'- Chưa có'}\n\n`+`## Owner feedback\n${s.delivery?.owner_feedback?.length? s.delivery.owner_feedback.slice(-5).map(f=>'- '+f.scope+' '+f.target+': '+f.decision+' — '+f.at).join('\n'):'- Chưa có phản hồi được xác minh'}\n\n## Technical reviews\n${s.delivery?.technical_reviews?.length?s.delivery.technical_reviews.slice(-5).map(r=>'- '+r.task_id+': '+r.status+' (PR #'+r.pr_number+')').join('\n'):'- Chưa có review kỹ thuật được xác minh'}\n\n`+`## Tasks\n${group('tasks')}\n\n## Features\n${group('features')}\n\n## Business flows\n${group('flows')}\n\n## Releases\n${group('releases')}\n\n`+
    `**Reminder:** Issue closed ≠ verified integration or accepted feature. Evidence is a recorded claim until its external source is independently checked.\n`;
}
export function planIssueSync(state) {
  validateState(state);
  return state.tasks.filter(t=>t.status!=='CANCELLED' && !t.github_issue).map(t=>({
    id:t.id,
    title:`[PCS ${t.id}] ${t.title||t.name||'Task'}`,
    body:`<!-- pcs-task:${t.id} -->\n\nProject: ${state.name}\nPCS task: ${t.id}\nStatus in PCS: ${t.status}\nDependencies: ${(t.dependencies||[]).join(', ')||'None'}\n\n${t.description||'See product requirements and PCS state.'}\n\nAcceptance criteria / DoD: ${(t.dod||t.acceptance_criteria||[]).join?.('; ')||'See PCS state'}\n\n**Closing this Issue does not automatically mark the PCS task ACCEPTED.**`,
  }));
}
export function auditSimple(doc) {
  validateSimple(doc);
  const accepted=[];
  for(const type of ['tasks','features','flows','releases']) for(const x of doc.state[type]) if(x.status==='ACCEPTED')accepted.push({id:x.id,type,external_verification:'NOT_CHECKED_BY_SIMPLE_MODE'});
  const unlinked=planIssueSync(doc.state).map(x=>x.id);
  return {valid:true,revision:doc.revision,accepted_structurally:accepted,unlinked_issue_tasks:unlinked,warning:'State/evidence checks are structural. Verify actual GitHub CI, QA runs and human approvals separately.'};
}
export async function initLocal(root,slug,name) {
  assert(validSlug(slug),'invalid slug');
  const doc=makeSimpleState(slug,name);
  const statePath=join(root,'pcs','STATE.json');
  await mkdir(dirname(statePath),{recursive:true});
  const file=await open(statePath,'wx');
  try{await file.writeFile(JSON.stringify(doc,null,2)+'\n');}finally{await file.close();}
  await mkdir(join(root,'pcs','moments'),{recursive:true});
  await writeFile(join(root,'pcs','MOMENT.md'),renderMoment(doc),{flag:'wx'});
  return {statePath,revision:1};
}
export async function checkpointLocal(root,updatedState,expectedRevision) {
  const p=join(root,'pcs','STATE.json'),lock=p+'.lock';
  const lockF=await open(lock,'wx');
  try{
    const old=JSON.parse(await readFile(p,'utf8'));validateSimple(old);
    assert(old.revision===expectedRevision,`CONFLICT expected ${expectedRevision} but current is ${old.revision}`);
    const fresh={schema:'pcs3.simple.v1',revision:old.revision+1,updated_at:now(),state:updatedState};
    validateSimple(fresh);
    const eventName=`MOM-${String(fresh.revision).padStart(5,'0')}-${randomUUID()}.json`;
    const eventP=join(root,'pcs','moments',eventName);
    await mkdir(dirname(eventP),{recursive:true});
    await writeFile(eventP,JSON.stringify({schema:'pcs3.simple-moment.v1',revision:fresh.revision,previous_revision:old.revision,previous_sha256:sha256(stable(old)),state_sha256:sha256(stable(fresh)),at:fresh.updated_at,state:fresh.state},null,2)+'\n',{flag:'wx'});
    // The Git commit storing STATE + Moment is the durable unit when published to GitHub.
    const tmp=p+'.'+randomUUID()+'.tmp';
    await writeFile(tmp,JSON.stringify(fresh,null,2)+'\n',{flag:'wx'});
    await rename(tmp,p);
    await writeFile(join(root,'pcs','MOMENT.md'),renderMoment(fresh));
    return {revision:fresh.revision,moment:eventName};
  }finally{await lockF.close();await rm(lock,{force:true});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [cmd,...a]=process.argv.slice(2);const opts={};for(const v of a){const i=v.indexOf('=');if(v.startsWith('--')&&i>2)opts[v.slice(2,i)]=v.slice(i+1);}
  (async()=>{
    const root=resolve(opts.root||'.');
    if(cmd==='init')return console.log(JSON.stringify(await initLocal(root,opts.slug,opts.name)));
    if(cmd==='verify'){const d=JSON.parse(await readFile(join(root,'pcs','STATE.json')));return console.log(JSON.stringify(auditSimple(d),null,2));}
    if(cmd==='checkpoint'){assert(opts.state&&opts.expect,'--state and --expect required');const s=JSON.parse(await readFile(opts.state,'utf8'));return console.log(JSON.stringify(await checkpointLocal(root,s,Number(opts.expect))));}
    console.log('PCS Simple Mode (optional for coding agents): init --slug=x --name=X; verify; checkpoint --state=state.json --expect=N');
  })().catch(e=>{console.error('PCS SIMPLE ERROR:',e.message);process.exitCode=1;});
}
