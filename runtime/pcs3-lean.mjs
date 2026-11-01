/** PCS 3.2 — risk-adaptive task self-claim for already approved contributors.
 * No new canonical store, no agent daemon, no Owner impersonation.
 * GitHub caller identity MUST be read by a trusted connector/operator, not supplied by a prompt.
 */
import {assert,stable,sha256,now,validateState} from './pcs3-core.mjs';
import {validateProjectCollaboration} from './pcs3-collaboration.mjs';

const seals=new WeakMap();
const safeRisk=new Set(['LOW','NORMAL']);
const safeClassification=new Set(['PUBLIC','INTERNAL']);
const ownerFlags=['security_sensitive','production','destructive','iam_change',
  'credentials_change','external_spend','data_migration','requires_owner_approval'];

function ownerGate(task) {
  if(!task)return 'TASK_NOT_FOUND';
  if(!safeRisk.has(String(task.risk??'').trim().toUpperCase()))return 'RISK_UNKNOWN_OR_SENSITIVE';
  if(task.classification!==undefined &&
      !safeClassification.has(String(task.classification).trim().toUpperCase()))
    return 'DATA_CLASSIFICATION_SENSITIVE';
  if(ownerFlags.some(flag=>task[flag]!==undefined&&task[flag]!==false))
    return 'OWNER_ONLY_SCOPE';
  return null;
}

export function leanControl(state,taskId){
  validateState(state);
  const task=state.tasks.find(t=>t.id===taskId);
  assert(task,'TASK_NOT_FOUND');
  const restricted=ownerGate(task);
  const contributors=state.collaboration?.agents.filter(a=>['ACTIVE','IDLE'].includes(a.status)).length??0;
  const mode=restricted?'CONTROLLED':contributors>1?'COLLABORATIVE':'SOLO';
  const missing=(task.dependencies||[]).filter(id=>
    !state.tasks.some(x=>x.id===id&&x.status==='ACCEPTED'));
  const assigned=!!state.collaboration?.assignments.some(a=>a.task_id===taskId);
  return {mode,task_id:taskId,requires_owner:!!restricted,
    control_reason:restricted,ready:task.status==='PLANNED'&&!assigned&&missing.length===0,
    blockers:[...(task.status==='PLANNED'?[]:['TASK_NOT_PLANNED']),
      ...(assigned?['TASK_ALREADY_ASSIGNED']:[]),
      ...(missing.length?['DEPENDENCIES_NOT_ACCEPTED']:[]),
      ...(restricted?[restricted]:[])]};
}

/** Authorize only an existing approved IDLE agent; a GitHub login is not an AI window identity.
 * Existing v3.1 projects without explicit self_claim_normal=true remain opt-out.
 */
export function authorizeLeanClaim(state,{repoMetadata,caller,taskId,agentId}={}){
  validateProjectCollaboration(state);
  const c=state.collaboration;
  assert(c&&c.policy?.self_claim_normal===true,'SELF_CLAIM_NOT_ENABLED');
  assert(repoMetadata?.private===true&&repoMetadata.owner?.type==='User'
    &&repoMetadata.owner.login?.toLowerCase()===c.policy.owner_login,
    'REPOSITORY_OWNER_NOT_VERIFIED');
  const agent=c.agents.find(a=>a.id===agentId);
  assert(agent&&agent.status==='IDLE'&&c.proposals.some(p=>p.agent_id===agentId&&p.status==='APPROVED'),
    'AGENT_NOT_APPROVED_AND_IDLE');
  const actor=caller?.login?.toLowerCase();
  assert(actor&&actor===agent.github_login&&actor!==c.policy.owner_login,
    'INDEPENDENT_GITHUB_AGENT_IDENTITY_REQUIRED');
  const control=leanControl(state,taskId);
  assert(control.ready,'TASK_NOT_READY: '+control.blockers.join(','));
  assert(!control.requires_owner,'OWNER_APPROVAL_REQUIRED: '+control.control_reason);
  const evidence=Object.freeze({
    type:'LEAN_SELF_CLAIM',task_id:taskId,agent_id:agentId,actor_login:actor,at:now()
  });
  seals.set(evidence,{state, state_sha256:sha256(stable(state)), evidence_sha256:sha256(stable(evidence))});
  return evidence;
}

export function applyLeanClaim(state,evidence){
  const seal=seals.get(evidence);
  assert(seal&&seal.state===state,'UNVERIFIED_LEAN_CLAIM');
  assert(sha256(stable(evidence))===seal.evidence_sha256,'TAMPERED_LEAN_CLAIM');
  assert(sha256(stable(state))===seal.state_sha256,'STALE_LEAN_CLAIM: reload state');
  const c=state.collaboration;
  assert(c?.policy?.self_claim_normal===true,'SELF_CLAIM_POLICY_REVOKED');
  const agent=c.agents.find(a=>a.id===evidence.agent_id);
  assert(agent&&agent.status==='IDLE'&&agent.github_login===evidence.actor_login
    &&agent.github_login!==c.policy.owner_login,'AGENT_IDENTITY_CHANGED');
  assert(c.proposals.some(p=>p.agent_id===agent.id&&p.status==='APPROVED'),'AGENT_APPROVAL_REVOKED');
  const control=leanControl(state,evidence.task_id);
  assert(control.ready&&!control.requires_owner,'TASK_NO_LONGER_ELIGIBLE');
  const task=state.tasks.find(t=>t.id===evidence.task_id);
  task.status='IN_PROGRESS';
  c.assignments.push({task_id:task.id,agent_id:agent.id,
    proposal_id:c.proposals.find(p=>p.agent_id===agent.id&&p.status==='APPROVED').id,at:now()});
  agent.status='ACTIVE';
  c.history.push({type:'SELF_CLAIM',task:task.id,agent:agent.id,actor:evidence.actor_login,at:now()});
  validateState(state);
  validateProjectCollaboration(state);
  return state;
}
