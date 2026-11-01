/**
 * PCS 3.1 — Contributor workflow.
 * Lead technical acceptance is deliberately separate from Owner product feedback.
 * GitHub-authenticated evidence is required for a verified approval; unverified
 * conversation feedback may guide revisions but cannot set Owner AGREED.
 */
import {assert, stable, sha256, now} from './pcs3-core.mjs';
import {GitHubGovernanceSource} from './pcs3-collaboration.mjs';
import {leanControl} from './pcs3-lean.mjs';

const identity=/^[A-Za-z][A-Za-z0-9._-]{1,63}$/;
const commitId=/^[a-f0-9]{40}$/i;
const scopeTypes=new Set(['feature','flow','release']);
const choices=new Map([['agree','AGREED'],['changes','CHANGES_REQUESTED'],['disagree','NOT_AGREED']]);
const seals=new WeakMap();
function id(v){assert(typeof v==='string'&&identity.test(v),'invalid identifier');return v;}
function digest(v){return sha256(stable(v));}
function scopeCollection(type){return {feature:'features',flow:'flows',release:'releases'}[type];}
function verifyLead(c,login){
  const l=c?.lead,agent=c?.agents.find(a=>a.id===l?.agent_id);
  assert(l&&agent&&l.epoch===c.lead_epoch&&l.github_login===login
    &&agent.github_login===login&&['IDLE','ACTIVE'].includes(agent.status)
    &&l.delegation?.authority==='OWNER'&&l.delegation.actor_login===c.policy.owner_login
    &&Date.parse(l.expires_at)>Date.now(),'LEAD_NOT_AUTHORIZED_OR_EXPIRED');
  return l;
}
function ensure(state){
  if(!state.delivery)state.delivery={
    schema:'pcs3.delivery.v1',technical_reviews:[],owner_feedback:[],owner_notes:[]
  };
  validateDelivery(state);
  return state.delivery;
}
export function validateDelivery(state){
  const d=state.delivery;
  if(d===undefined)return true;
  assert(d&&d.schema==='pcs3.delivery.v1','invalid delivery schema');
  assert(Array.isArray(d.technical_reviews)&&Array.isArray(d.owner_feedback)
    &&(d.owner_notes===undefined||Array.isArray(d.owner_notes)),'invalid delivery arrays');
  const tasks=new Set(state.tasks.map(t=>t.id)),seenPR=new Set(),seenComment=new Set();
  for(const r of d.technical_reviews){
    id(r.task_id);assert(tasks.has(r.task_id),'technical review task missing');
    id(r.agent_id);id(r.lead_agent_id);
    assert(r.status==='TECH_ACCEPTED','invalid technical review status');
    assert(Number.isSafeInteger(r.pr_number)&&r.pr_number>0,'invalid technical PR');
    assert(commitId.test(r.head_sha),'technical review commit invalid');
    assert(Number.isSafeInteger(r.review_id)&&r.review_id>0,'invalid lead review ID');
    assert(r.agent_id!==r.lead_agent_id,'self technical review');
    assert(!seenPR.has(r.pr_number+':'+r.task_id),'duplicate task PR review');
    seenPR.add(r.pr_number+':'+r.task_id);
  }
  for(const note of (d.owner_notes||[])){
    assert(scopeTypes.has(note.scope)&&state[scopeCollection(note.scope)].some(x=>x.id===note.target),
      'conversation note target missing');
    assert(['AGREED','CHANGES_REQUESTED','NOT_AGREED'].includes(note.preference),
      'invalid conversation feedback');
    assert(note.verification==='UNVERIFIED_CHAT','chat note cannot masquerade as verified Owner acceptance');
    assert(typeof note.summary==='string'&&note.summary.length<=1000,'invalid conversation note');
  }
  for(const f of d.owner_feedback){
    assert(scopeTypes.has(f.scope),'invalid owner review scope');id(f.target);
    assert(state[scopeCollection(f.scope)].some(v=>v.id===f.target),'owner review item missing');
    assert(choices.has(f.command),'invalid owner feedback command');
    assert(f.decision===choices.get(f.command),'owner feedback decision mismatch');
    assert(commitId.test(f.reviewed_sha),'owner feedback commit invalid');
    assert(f.actor_login===f.owner_login,'owner feedback actor is not verified Owner');
    assert(Number.isSafeInteger(f.issue_number)&&f.issue_number>0,'invalid owner review issue');
    assert(Number.isSafeInteger(f.comment_id)&&f.comment_id>0,'invalid owner review comment');
    assert(!seenComment.has(f.issue_number+':'+f.comment_id),'owner comment replay');
    seenComment.add(f.issue_number+':'+f.comment_id);
  }
  return true;
}
function seal(e,state){
  const immutable=Object.freeze(e);
  seals.set(immutable,{state,digest:digest(state),evidence:digest(immutable)});
  return immutable;
}
function check(e,state){
  const s=seals.get(e);
  assert(s&&s.state===state,'UNVERIFIED_DELIVERY_EVIDENCE');
  assert(s.evidence===digest(e),'DELIVERY_EVIDENCE_TAMPERED');
  assert(s.digest===digest(state),'STALE_DELIVERY_STATE: reload and reverify');
}
export function authorizeTechnicalAcceptance(state,{repoMetadata,pr,reviews,checks,taskId,agentId}){
  assert(state.collaboration,'collaboration policy required');
  const c=state.collaboration;
  const task=state.tasks.find(t=>t.id===id(taskId));
  assert(task&&['TECH_DONE','INTEGRATION_PENDING','ACCEPTED'].includes(task.status),
    'task is not ready for technical acceptance');
  const agent=c.agents.find(a=>a.id===id(agentId));
  assert(agent&&['ACTIVE','IDLE'].includes(agent.status),'agent not active');
  assert(c.assignments.some(a=>a.task_id===taskId&&a.agent_id===agentId),'task not assigned to agent');
  assert(pr&&pr.merged===true&&typeof pr.merged_at==='string'&&pr.merged_at,
    'PR_NOT_MERGED: technical review cannot be final');
  assert(Number.isSafeInteger(pr.number)&&pr.number>0,'invalid PR number');
  assert(pr.base?.repo?.full_name?.toLowerCase()===repoMetadata?.full_name?.toLowerCase(),
    'PR_WRONG_REPOSITORY');
  assert(pr.base?.ref===repoMetadata?.default_branch,'PR_WRONG_BASE');
  assert(commitId.test(pr.head?.sha),'PR_HEAD_INVALID');
  assert(pr.user?.login?.toLowerCase()===agent.github_login,'PR_AUTHOR_NOT_ASSIGNED_AGENT');
  assert(pr.body?.includes('<!-- pcs-task:'+taskId+' -->'),'PR_TASK_MARKER_MISSING');
  const lead=verifyLead(c,c.lead?.github_login);
  assert(c.lead.agent_id!==agentId&&agent.github_login!==lead.github_login,'SELF_TECHNICAL_APPROVAL');
  assert(Array.isArray(reviews)&&reviews.length>0&&reviews.length<100,'PR_REVIEWS_NOT_VERIFIABLE');
  const relevant=reviews.filter(r=>r.user?.login?.toLowerCase()===lead.github_login)
    .sort((a,b)=>String(a.submitted_at).localeCompare(String(b.submitted_at)));
  const last=relevant.at(-1);
  assert(last&&last.state==='APPROVED'&&last.commit_id===pr.head.sha
    &&Number.isSafeInteger(last.id),'LEAD_REVIEW_NOT_APPROVED_FOR_HEAD');
  assert(checks&&Array.isArray(checks.check_runs)&&checks.check_runs.length>0
    &&checks.check_runs.length<100&&Number.isInteger(checks.total_count)
    &&checks.total_count===checks.check_runs.length,'CHECK_RUNS_INCOMPLETE');
  assert(checks.check_runs.every(x=>x.status==='completed'&&x.conclusion==='success'),
    'CI_NOT_FULLY_GREEN');
  return seal(Object.freeze({
    type:'TECHNICAL',task_id:taskId,agent_id:agentId,lead_agent_id:c.lead.agent_id,
    lead_epoch:c.lead_epoch,pr_number:pr.number,review_id:last.id,head_sha:pr.head.sha,
    merge_commit_sha:pr.merge_commit_sha||null,checks_count:checks.check_runs.length,
    status:'TECH_ACCEPTED',at:now()
  }),state);
}
export function applyTechnicalAcceptance(state,evidence){
  check(evidence,state);
  assert(evidence.type==='TECHNICAL','wrong technical evidence type');
  const c=state.collaboration,lead=verifyLead(c,c.lead?.github_login);
  assert(lead.agent_id===evidence.lead_agent_id&&lead.epoch===evidence.lead_epoch,
    'STALE_LEAD_REVIEW');
  const d=ensure(state);
  assert(!d.technical_reviews.some(r=>r.task_id===evidence.task_id&&r.head_sha===evidence.head_sha),
    'technical review already recorded');
  assert(c.assignments.some(a=>a.task_id===evidence.task_id&&a.agent_id===evidence.agent_id),
    'assignment changed');
  d.technical_reviews.push({...evidence});
  c.assignments=c.assignments.filter(a=>a.task_id!==evidence.task_id);
  const a=c.agents.find(a=>a.id===evidence.agent_id);
  if(a&&!c.assignments.some(x=>x.agent_id===a.id))a.status='IDLE';
  c.history.push({type:'TECH_ACCEPTED',task:evidence.task_id,agent:evidence.agent_id,
    reviewer:evidence.lead_agent_id,pr:evidence.pr_number,at:now()});
  validateDelivery(state);
  return state;
}
export function recommendNextTasks(state,{limit=5}={}){
  assert(Number.isInteger(limit)&&limit>0&&limit<=30,'invalid suggestion limit');
  const assigned=new Set(state.collaboration?.assignments.map(a=>a.task_id)||[]);
  const accepted=new Set(state.delivery?.technical_reviews.map(r=>r.task_id)||[]);
  return state.tasks.filter(t=>t.status==='PLANNED'&&!assigned.has(t.id)
    &&!accepted.has(t.id)&&Array.isArray(t.dependencies||[])
    &&(t.dependencies||[]).every(x=>accepted.has(x)||state.tasks.some(v=>v.id===x&&v.status==='ACCEPTED')))
    .slice(0,limit).map(t=>{
      const c=state.collaboration;
      const free=!!c?.agents.some(a=>a.status==='IDLE'
        &&c.proposals.some(p=>p.agent_id===a.id&&p.status==='APPROVED'));
      const canClaim=!!c?.policy?.self_claim_normal&&free
        &&!leanControl(state,t.id).requires_owner;
      return {task_id:t.id,title:t.title||t.name||t.id,
        requires_assignment_approval:!canClaim,
        self_claim_available_to_authorized_idle_agent:canClaim};
    });
}
export function authorizeOwnerFeedback(state,{repoMetadata,issue,comment,scope,target,reviewedSha,branchSha}){
  assert(scopeTypes.has(scope),'invalid owner feedback scope');
  assert(state[scopeCollection(scope)].some(x=>x.id===id(target)),'reviewed deliverable missing');
  assert(repoMetadata?.owner?.type==='User','OWNER_IDENTITY_NOT_CONFIGURED_FOR_ORG');
  const ownerLogin=repoMetadata.owner.login.toLowerCase();
  assert(!state.collaboration||state.collaboration.policy.owner_login===ownerLogin,
    'OWNER_IDENTITY_POLICY_MISMATCH');
  assert(comment?.user?.login?.toLowerCase()===ownerLogin,
    'OWNER_COMMENT_REQUIRED');
  assert(issue?.number>0&&!issue.pull_request
    &&issue.body?.includes('<!-- pcs-owner-review:'+scope+':'+target+' -->'),
    'OWNER_REVIEW_ISSUE_MARKER_MISSING');
  const repo=repoMetadata.full_name;
  assert(comment.issue_url==='https://api.github.com/repos/'+repo+'/issues/'+issue.number,
    'OWNER_COMMENT_WRONG_ISSUE');
  assert(Number.isSafeInteger(comment.id)&&comment.id>0,'invalid GitHub owner comment');
  assert(commitId.test(reviewedSha)&&reviewedSha===branchSha,
    'REVIEWED_COMMIT_NOT_CURRENT');
  const m=/^\/pcs (agree|changes|disagree) (feature|flow|release) ([A-Za-z][A-Za-z0-9._-]{1,63}) ([a-f0-9]{40})$/i.exec(String(comment.body||'').trim());
  assert(m&&m[2].toLowerCase()===scope&&m[3]===target
    &&m[4].toLowerCase()===reviewedSha.toLowerCase(),
    'OWNER_FEEDBACK_COMMAND_MISMATCH');
  return seal(Object.freeze({type:'OWNER_FEEDBACK',scope,target,command:m[1].toLowerCase(),
    decision:choices.get(m[1].toLowerCase()),reviewed_sha:reviewedSha.toLowerCase(),
    issue_number:issue.number,comment_id:comment.id,
    actor_login:comment.user.login.toLowerCase(),owner_login:ownerLogin,at:now()}),state);
}
export function applyOwnerFeedback(state,evidence){
  check(evidence,state);
  assert(evidence.type==='OWNER_FEEDBACK'&&evidence.actor_login===evidence.owner_login
    &&(!state.collaboration||state.collaboration.policy.owner_login===evidence.actor_login),
    'ONLY_VERIFIED_OWNER_MAY_ACCEPT_PRODUCT');
  const d=ensure(state);
  assert(!d.owner_feedback.some(f=>f.issue_number===evidence.issue_number
    &&f.comment_id===evidence.comment_id),'OWNER_FEEDBACK_REPLAY');
  d.owner_feedback.push({...evidence});
  if(evidence.decision!=='AGREED'){
    state.current.blockers=Array.isArray(state.current.blockers)?state.current.blockers:[];
    const note='Owner '+evidence.decision+': '+evidence.scope+' '+evidence.target;
    if(!state.current.blockers.includes(note))state.current.blockers.push(note);
  }
  validateDelivery(state);return state;
}
/** Capture an owner-like comment from chat as a *reported preference only*.
 * It can guide the next task, but never counts as verified Owner approval.
 * It must not automatically trigger sensitive changes or a production release.
 */
export function noteConversationFeedback(state,{scope,target,preference,summary}){
  assert(scopeTypes.has(scope)&&state[scopeCollection(scope)].some(x=>x.id===target),
    'conversation note deliverable missing');
  assert(['AGREED','CHANGES_REQUESTED','NOT_AGREED'].includes(preference),
    'invalid preference');
  assert(typeof summary==='string'&&summary.trim()&&summary.length<=1000,
    'missing human-readable feedback');
  const d=ensure(state);
  if(!d.owner_notes)d.owner_notes=[];
  d.owner_notes.push({scope,target,preference,summary,verification:'UNVERIFIED_CHAT',at:now()});
  validateDelivery(state);
  return state;
}
export function latestOwnerFeedback(state,scope,target){
  return [...(state.delivery?.owner_feedback||[])].reverse()
    .find(f=>f.scope===scope&&f.target===target)??null;
}
export class GitHubDeliverySource extends GitHubGovernanceSource{
  async technicalEvidence(state,{taskId,agentId,prNumber}){
    assert(Number.isSafeInteger(prNumber)&&prNumber>0,'invalid PR');
    const [meta,pr,reviews]=await Promise.all([
      this.get(''),this.get('/pulls/'+prNumber),
      this.get('/pulls/'+prNumber+'/reviews?per_page=100')
    ]);
    assert(meta.full_name.toLowerCase()===this.repo.toLowerCase(),'repository mismatch');
    const checks=await this.get('/commits/'+pr.head.sha+'/check-runs?per_page=100');
    return authorizeTechnicalAcceptance(state,{repoMetadata:meta,pr,reviews,checks,taskId,agentId});
  }
  async ownerEvidence(state,{issueNumber,commentId,scope,target,reviewedSha,branch='main'}){
    const [meta,issue,comment,ref]=await Promise.all([
      this.get(''),this.readIssue(issueNumber),
      this.get('/issues/comments/'+commentId),
      this.get('/git/ref/heads/'+encodeURIComponent(branch))
    ]);
    assert(meta.full_name.toLowerCase()===this.repo.toLowerCase(),'repository mismatch');
    assert(branch===meta.default_branch,'owner approval must target default branch');
    return authorizeOwnerFeedback(state,{repoMetadata:meta,issue,comment,
      scope,target,reviewedSha,branchSha:ref.object?.sha});
  }
}
