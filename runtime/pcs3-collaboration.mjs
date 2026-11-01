/** PCS agent governance. One repository and one canonical PCS state.
 * GitHub comments are identity-bearing evidence; proposal bodies are untrusted.
 * Owner can approve, reject, revoke and designate lead. Delegated lead may
 * approve ordinary work only. No agent can approve its own join proposal.
 */
import {assert,stable,sha256,now,validateState} from './pcs3-core.mjs';

const IDENT=/^[A-Za-z][A-Za-z0-9._-]{1,63}$/;
const LOGIN=/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const statuses=new Set(['PENDING','APPROVED','REJECTED','REVOKED']);
const agents=new Set(['REQUESTED','IDLE','ACTIVE','REVOKED']);
const riskTypes=new Set(['NORMAL','SENSITIVE']);
const verifiedDecisionObjects=new WeakMap(); // context-bound immutable evidence
const safeStr=(v,n=300)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const cleanId=(v,name)=>{assert(IDENT.test(v??''),`invalid ${name}`);return v;};
const login=(v,name)=>{assert(LOGIN.test(v??''),`invalid ${name}`);return v.toLowerCase();};
const currentTime=()=>Date.now();
/** Absent, invalid and non-normal task classifications require Owner approval.
 * A proposal's self-reported risk never overrides the actual task.
 */
function taskRequiresOwner(state,id){
  const task=state.tasks.find(t=>t.id===id);
  if(!task)return true;
  // Match PCS 3.2 self-claim gates: delegated Lead must not bypass Owner-only flags.
  const ownerFlags=['security_sensitive','production','destructive','iam_change',
    'credentials_change','external_spend','data_migration','requires_owner_approval'];
  if(ownerFlags.some(flag=>task[flag]!==undefined&&task[flag]!==false))return true;
  if(typeof task.risk!=='string'||!['NORMAL','LOW'].includes(task.risk.trim().toUpperCase()))return true;
  if(task.classification!==undefined&&!['PUBLIC','INTERNAL'].includes(String(task.classification).trim().toUpperCase()))return true;
  return false;
}
function ownerOnlyScope(state,proposal,action,tasks){
  if(proposal?.risk==='SENSITIVE')return true;
  const scope=action==='revoke'
    ? state.collaboration.assignments.filter(a=>a.agent_id===proposal?.agent_id).map(a=>a.task_id)
    : tasks;
  return scope.some(id=>taskRequiresOwner(state,id));
}
function uniqueIds(a,label){assert(Array.isArray(a),`${label} must be array`);for(const x of a)cleanId(x,label);assert(new Set(a).size===a.length,`${label} duplicate IDs`);}

/** The `owner_login` is a repository metadata claim, independently checked
 * against GitHub when evaluating any decision. An organization repo requires
 * explicitly configured trusted owners; never assume an org login is a human.
 */
export function initCollaboration(state,{repoOwner,repoOwnerType='User',maxAgents=10}={}){
  validateState(state);assert(!state.collaboration,'collaboration already initialized');
  assert(repoOwnerType==='User', 'ORG_OWNER_REQUIRES_EXPLICIT_OWNER_POLICY');
  const owner=login(repoOwner,'repo owner');
  assert(Number.isInteger(maxAgents)&&maxAgents>=1&&maxAgents<=100,'invalid agent cap');
  state.collaboration={schema:'pcs3.collaboration.v1',policy:{owner_login:owner,max_active_agents:maxAgents,lead_can_approve_normal:true,self_claim_normal:true,owner_required_for_sensitive:true},lead:null,lead_epoch:0,agents:[],proposals:[],assignments:[],history:[]};
  validateCollaboration(state.collaboration);return state;
}
export function validateCollaboration(c){
  assert(c?.schema==='pcs3.collaboration.v1','collaboration schema invalid');
  login(c.policy?.owner_login,'owner');assert(Number.isInteger(c.policy?.max_active_agents)&&c.policy.max_active_agents>0&&c.policy.max_active_agents<=100,'invalid active agent cap');
  assert(Array.isArray(c.agents)&&Array.isArray(c.proposals)&&Array.isArray(c.assignments)&&Array.isArray(c.history),'collaboration arrays invalid');
  assert(Number.isSafeInteger(c.lead_epoch)&&c.lead_epoch>=0,'lead epoch counter invalid');
  const ids=new Set(), proposals=new Set(), assigned=new Set(), approvalComments=new Set();
  for(const a of c.agents){cleanId(a.id,'agent ID');assert(!ids.has(a.id),'duplicate agent ID');ids.add(a.id);login(a.github_login,'agent login');assert(agents.has(a.status),'invalid agent status');assert(safeStr(a.provider,50),'agent provider required');}
  for(const p of c.proposals){cleanId(p.id,'proposal ID');assert(!proposals.has(p.id),'duplicate proposal ID');proposals.add(p.id);assert(ids.has(p.agent_id),'proposal agent missing');assert(statuses.has(p.status),'invalid proposal status');assert(['SELF_PROPOSED','LEAD_SUGGESTED','OWNER_SUGGESTED'].includes(p.mode),'proposal mode invalid');assert(riskTypes.has(p.risk),'proposal risk invalid');assert(Number.isSafeInteger(p.issue_number)&&p.issue_number>0,'proposal issue number invalid');uniqueIds(p.suggested_tasks,'suggested tasks');assert(typeof p.summary==='string'&&p.summary.length<=2000,'invalid proposal summary');if(p.decision){assert(safeStr(p.decision.actor_login,50)&&Number.isSafeInteger(p.decision.comment_id)&&p.decision.comment_id>0,'decision provenance invalid');const k=`${p.issue_number}:${p.decision.comment_id}`;assert(!approvalComments.has(k),'decision comment reused');approvalComments.add(k);}}
  for(const x of c.assignments){cleanId(x.task_id,'task ID');cleanId(x.agent_id,'assigned agent');assert(ids.has(x.agent_id),'assigned agent missing');assert(!assigned.has(x.task_id),'duplicate task assignment');assigned.add(x.task_id);}
  if(c.lead!==null){assert(ids.has(c.lead.agent_id),'lead agent missing');assert(c.lead.delegation?.authority==='OWNER','lead must be owner-delegated');assert(Number.isInteger(c.lead.epoch)&&c.lead.epoch>0,'lead epoch invalid');assert(safeStr(c.lead.expires_at),'lead expiry required');assert(!Number.isNaN(Date.parse(c.lead.expires_at)),'invalid lead expiry');assert(c.lead.epoch===c.lead_epoch,'lead epoch mismatch');const leadAgent=c.agents.find(a=>a.id===c.lead.agent_id);assert(leadAgent.github_login===c.lead.github_login,'lead identity mismatch');assert(c.lead.delegation.actor_login===c.policy.owner_login&&c.lead.delegation.action==='designate-lead'&&c.lead.delegation.proposalId===c.lead.agent_id,'lead owner delegation provenance invalid');}
  assert(c.agents.filter(a=>['ACTIVE','IDLE'].includes(a.status)).length<=c.policy.max_active_agents,'maximum active agents exceeded');
  return true;
}
export function validateProjectCollaboration(state){if(!state.collaboration)return true;validateCollaboration(state.collaboration);const ids=new Set(state.tasks.map(t=>t.id));for(const a of state.collaboration.assignments)assert(ids.has(a.task_id),`assignment references missing task ${a.task_id}`);return true;}

/** Only a GitHub issue opened by the GitHub identity claiming the agent may
 * register it. The arbitrary agent label is not an authenticated identity.
 */
export function registerProposal(state,{id,agent_id,provider,github_login,summary='',suggested_tasks=[],risk='NORMAL',mode='SELF_PROPOSED',capabilities=[],issue_number},issueEvidence){
  assert(state.collaboration,'collaboration not initialized');
  const c=state.collaboration;cleanId(id,'proposal ID');cleanId(agent_id,'agent ID');login(github_login,'agent login');
  assert(!c.proposals.some(p=>p.id===id),'proposal ID already exists');
  assert(!c.agents.some(a=>a.id===agent_id),'agent ID already registered');
  assert(issueEvidence?.number===issue_number,'GitHub issue number mismatch');
  assert(issueEvidence?.user?.login?.toLowerCase()===github_login.toLowerCase(),'GitHub issue author does not match proposer');
  assert((issueEvidence?.body||'').includes(`<!-- pcs-agent-join:${id} -->`),'missing join marker in GitHub issue');
  assert(Number.isSafeInteger(issue_number)&&issue_number>0,'invalid issue number');
  assert(safeStr(provider,50),'invalid provider');assert(typeof summary==='string'&&summary.length<=2000,'invalid summary');
  assert(riskTypes.has(risk),'invalid risk');assert(['SELF_PROPOSED','LEAD_SUGGESTED','OWNER_SUGGESTED'].includes(mode),'invalid mode');
  assert(Array.isArray(capabilities)&&capabilities.length<=30&&capabilities.every(s=>safeStr(s,100)),'capabilities invalid');
  uniqueIds(suggested_tasks,'suggested tasks');
  for(const tid of suggested_tasks)assert(state.tasks.some(t=>t.id===tid),'proposed task not found: '+tid);
  c.agents.push({id:agent_id,provider,github_login:github_login.toLowerCase(),status:'REQUESTED',capabilities:[...capabilities],joined_at:null});
  c.proposals.push({id,agent_id,mode,risk,issue_number,summary,suggested_tasks:[...suggested_tasks],status:'PENDING',created_at:now(),decision:null});
  c.history.push({type:'JOIN_REQUESTED',proposal:id,at:now(),github_issue:issue_number});
  validateProjectCollaboration(state);return state;
}

function parseCommand(body){
  const s=String(body||'').trim();
  const m=/^\/pcs\s+(approve|reject|revoke|assign|designate-lead|clear-lead)\s+([A-Za-z][A-Za-z0-9._-]{1,63})(?:\s+([A-Za-z0-9._,\s-]+))?$/i.exec(s);
  assert(m,'invalid PCS command: must be an exact command comment');
  return {action:m[1].toLowerCase(),target:m[2],tasks:m[3]?m[3].split(',').map(x=>x.trim()).filter(Boolean):[]};
}
export function authorizeDecision(state,{
  repo,repoMetadata,issue,comment,action,proposalId,at=new Date()
}){
  const c=state.collaboration;assert(c,'collaboration not initialized');
  assert(repoMetadata?.full_name?.toLowerCase()===repo?.toLowerCase(),'repository metadata mismatch');
  assert(repoMetadata?.owner?.type==='User','ORG_OWNER_REQUIRES_EXPLICIT_OWNER_POLICY');
  assert(repoMetadata.owner.login.toLowerCase()===c.policy.owner_login,'owner mismatch: fail closed');
  assert(issue?.number>0&&typeof issue.body==='string','GitHub issue missing');
  assert(typeof comment?.id==='number'&&comment.id>0&&safeStr(comment.user?.login,50),'authenticated GitHub comment required');
  assert(comment.issue_url===`https://api.github.com/repos/${repo}/issues/${issue.number}`,'comment not on proposal issue');
  assert(!comment.deleted,'deleted approval comment rejected');
  const parsed=parseCommand(comment.body);assert(parsed.action===action&&parsed.target===proposalId,'approval command mismatch');
  const approver=comment.user.login.toLowerCase();
  const owner=approver===c.policy.owner_login;
  const lead=c.lead;
  const leadAgent=lead&&c.agents.find(a=>a.id===lead.agent_id);
  const leadValid=!!lead&&!!leadAgent&&leadAgent.github_login===approver&&['IDLE','ACTIVE'].includes(leadAgent.status)&&lead.epoch===c.lead_epoch&&Date.parse(lead.expires_at)>currentTime()&&lead.delegation?.authority==='OWNER'&&lead.delegation.actor_login===c.policy.owner_login;
  const proposal=c.proposals.find(p=>p.id===proposalId);
  const taskIds=action==='assign'?parsed.tasks:(proposal?.suggested_tasks??[]);
  const touchesSensitive=ownerOnlyScope(state,proposal,action,taskIds);
  if(['approve','reject','revoke','assign'].includes(action)){
    assert(proposal,'proposal not found');assert(issue.number===proposal.issue_number,'wrong proposal issue');
    assert(issue.body.includes(`<!-- pcs-agent-join:${proposalId} -->`),'issue does not identify proposal');
    assert(approver!==c.agents.find(a=>a.id===proposal.agent_id)?.github_login,'self-approval prohibited; same GitHub login cannot independently approve its own agent');
    if(proposal.risk==='SENSITIVE'||touchesSensitive)assert(owner,'sensitive work requires owner approval');
    else if(action==='revoke')assert(owner||leadValid,'only owner or delegated lead may revoke');
    else assert(owner||(leadValid&&c.policy.lead_can_approve_normal===true),'approval requires owner or delegated lead');
  }else {
    assert(owner,'lead designation/clearance requires owner');
    assert(issue.body.includes('<!-- pcs-lead-governance -->'),'lead command requires lead-governance Issue');
  }
  const decision=Object.freeze({action,proposalId,actor_login:approver,authority:owner?'OWNER':'DELEGATED_LEAD',issue_number:issue.number,comment_id:comment.id,comment_url:comment.html_url??null,observed_at:now(),command_digest:sha256(comment.body),tasks:Object.freeze([...parsed.tasks])});
  verifiedDecisionObjects.set(decision,{digest:sha256(stable(decision)),stateDigest:sha256(stable(state)),stateIdentity:state,lead_epoch:c.lead_epoch,owner_login:c.policy.owner_login});
  return decision;
}

export function applyDecision(state,evidence){
  const c=state.collaboration;assert(c,'collaboration not initialized');
  const seal=verifiedDecisionObjects.get(evidence);
  assert(seal&&seal.stateIdentity===state,'UNVERIFIED_DECISION: obtain evidence through GitHub identity verification for this state');
  assert(sha256(stable(evidence))===seal.digest,'TAMPERED_DECISION: evidence was modified after verification');
  assert(!c.history.some(h=>h.issue===evidence.issue_number&&h.comment===evidence.comment_id),'approval comment already applied');
  assert(c.lead_epoch===seal.lead_epoch,'STALE_LEAD_EPOCH: reauthorize on current project state');
  assert(c.policy.owner_login===seal.owner_login,'STALE_OWNER_POLICY: reauthorize');
  if(evidence.authority==='DELEGATED_LEAD'){
    const l=c.lead,la=c.agents.find(a=>a.id===l?.agent_id);
    assert(!!l&&l.epoch===c.lead_epoch&&la?.github_login===evidence.actor_login
      &&['IDLE','ACTIVE'].includes(la.status)&&Date.parse(l.expires_at)>Date.now()
      &&l.delegation?.authority==='OWNER'&&l.delegation.actor_login===c.policy.owner_login,
      'STALE_LEAD_AUTHORITY: revoked, expired or changed lead; reauthorize');
    assert(c.policy.lead_can_approve_normal===true,'lead approval policy revoked');
  }
  assert(sha256(stable(state))===seal.stateDigest,'STALE_GOVERNANCE_STATE: proposal, scope or permissions changed; reauthorize');
  assert(evidence.authority==='OWNER'?evidence.actor_login===c.policy.owner_login:true,'OWNER_IDENTITY_MISMATCH');
  assert(['OWNER','DELEGATED_LEAD'].includes(evidence.authority),'untrusted decision provenance');
  assert(Number.isSafeInteger(evidence.comment_id)&&evidence.comment_id>0,'decision comment ID required');
  const p=c.proposals.find(x=>x.id===evidence.proposalId);
  if(['approve','reject','revoke','assign'].includes(evidence.action)){
    assert(p,'proposal not found');
    const a=c.agents.find(x=>x.id===p.agent_id);assert(a,'agent missing');
    const assignedScope=evidence.action==='assign'?evidence.tasks:p.suggested_tasks;
    assert(evidence.actor_login!==a.github_login,'self-approval prohibited');
    assert(!ownerOnlyScope(state,p,evidence.action,assignedScope)||evidence.authority==='OWNER',
      'sensitive work requires owner approval at application');
    if(evidence.action==='approve'){
      assert(p.status==='PENDING','proposal already resolved');
      assert(c.agents.filter(x=>x.status==='ACTIVE'||x.status==='IDLE').length < c.policy.max_active_agents,'agent capacity reached');
      if(p.risk==='SENSITIVE')assert(evidence.authority==='OWNER','owner approval required for sensitive work');
      for(const taskId of p.suggested_tasks){
        assert(!c.assignments.some(x=>x.task_id===taskId),'task already assigned; obtain reassignment approval');
      }
      p.status='APPROVED';a.status=p.suggested_tasks.length?'ACTIVE':'IDLE';a.joined_at=now();
      for(const taskId of p.suggested_tasks)c.assignments.push({task_id:taskId,agent_id:a.id,proposal_id:p.id,at:now()});
    } else if(evidence.action==='reject') {
      assert(p.status==='PENDING','cannot reject nonpending proposal');p.status='REJECTED';a.status='REVOKED';
    } else if(evidence.action==='revoke'){
      assert(p.status==='APPROVED','only approved proposals can be revoked');p.status='REVOKED';a.status='REVOKED';c.assignments=c.assignments.filter(x=>x.agent_id!==a.id);if(c.lead?.agent_id===a.id){c.lead=null;c.lead_epoch=(c.lead_epoch??0)+1;}
    } else if(evidence.action==='assign'){
      assert(p.status==='APPROVED','only approved agents may receive tasks');uniqueIds(evidence.tasks,'assigned tasks');assert(evidence.tasks.length>0,'no tasks assigned');
      for(const taskId of evidence.tasks){assert(state.tasks.some(t=>t.id===taskId),'task missing');assert(!c.assignments.some(x=>x.task_id===taskId),'task already owned');}
      for(const taskId of evidence.tasks)c.assignments.push({task_id:taskId,agent_id:a.id,proposal_id:p.id,at:now()});a.status='ACTIVE';
    }
    if(evidence.action!=='assign')p.decision={...evidence};
  } else if(evidence.action==='designate-lead'){
    assert(evidence.authority==='OWNER','only owner can designate lead');
    const a=c.agents.find(x=>x.id===evidence.proposalId);assert(a&&['IDLE','ACTIVE'].includes(a.status),'lead must be approved and active/idle');
    assert(evidence.tasks.length===1&&/^\d{1,3}d$/.test(evidence.tasks[0]),'lead lease duration required (Nd)');
    const days=Number(evidence.tasks[0].slice(0,-1));assert(days>=1&&days<=30,'lead lease max 30 days');
    c.lead_epoch=(c.lead_epoch??0)+1;
    c.lead={agent_id:a.id,github_login:a.github_login,epoch:c.lead_epoch,expires_at:new Date(Date.now()+days*86400000).toISOString(),delegation:{...evidence}};
  } else if(evidence.action==='clear-lead'){
    assert(evidence.authority==='OWNER','only owner can clear lead');assert(c.lead?.agent_id===evidence.proposalId,'lead mismatch');c.lead=null;c.lead_epoch=(c.lead_epoch??0)+1;
  } else throw Error('unknown governance decision');
  c.history.push({type:evidence.action.toUpperCase(),target:evidence.proposalId,actor:evidence.actor_login,authority:evidence.authority,issue:evidence.issue_number,comment:evidence.comment_id,at:now()});
  validateProjectCollaboration(state);return state;
}

export class GitHubGovernanceSource {
  constructor({repo,token,fetcher=globalThis.fetch}){assert(/^[\w.-]+\/[\w.-]+$/.test(repo??''),'invalid repo');assert(safeStr(token,10000),'token required');this.repo=repo;this.token=token;this.fetcher=fetcher;}
  async get(endpoint){const r=await this.fetcher(`https://api.github.com/repos/${this.repo}${endpoint}`,{headers:{Authorization:`Bearer ${this.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});assert(r.ok,`GH IDENTITY_VERIFICATION_BLOCKED: HTTP ${r.status}`);return r.json();}
  async readIssue(issueNumber){assert(Number.isSafeInteger(issueNumber)&&issueNumber>0,'invalid issue number');const o=await this.get(`/issues/${issueNumber}`);assert(!o.pull_request,'pull requests are not approval issues');return o;}
  async registerFromIssue(state,proposal){const [meta,issue]=await Promise.all([this.get(''),this.readIssue(proposal.issue_number)]);assert(meta.full_name.toLowerCase()===this.repo.toLowerCase(),'wrong repo');assert(meta.owner.login.toLowerCase()===state.collaboration.policy.owner_login,'owner mismatch');return registerProposal(state,proposal,issue);}
  async decisionFromComment(state,{issueNumber,commentId,action,proposalId}){assert(Number.isSafeInteger(commentId)&&commentId>0,'comment ID invalid');const [meta,issue,comment]=await Promise.all([this.get(''),this.readIssue(issueNumber),this.get(`/issues/comments/${commentId}`)]);return authorizeDecision(state,{repo:this.repo,repoMetadata:meta,issue,comment,action,proposalId});}
}
