/** PCS 3.1.1 — branch governance, optional CLI for a trusted Lead environment.
 * Read-only inspection is default. Any write requires authenticated GitHub Owner
 * approval of an exact plan, a separate caller identity and GitHub admin scope.
 * Never update/delete existing protection or bypass repository rules.
 */
import {assert,sha256,stable} from './pcs3-core.mjs';

export const PCS_RULESET_NAME='PCS managed default branch baseline v1';
const RULES=['deletion','non_fast_forward','pull_request'];
const commentRe=/^\/pcs protect-default ([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+) ([a-f0-9]{64})$/;
const repoRe=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
function assertRepo(r){assert(typeof r==='string'&&repoRe.test(r),'invalid GitHub repository');}
function baseline(branch){
  return {
    name:PCS_RULESET_NAME,
    target:'branch',enforcement:'active',
    conditions:{ref_name:{include:['refs/heads/'+branch],exclude:[]}},
    bypass_actors:[],
    rules:[
      {type:'deletion'},
      {type:'non_fast_forward'},
      {type:'pull_request',parameters:{
        dismiss_stale_reviews_on_push:true,
        require_code_owner_review:false,
        require_last_push_approval:false,
        required_approving_review_count:0,
        required_review_thread_resolution:false,
        allowed_merge_methods:['merge','squash','rebase']
      }}
    ]
  };
}
export class GitHubBranchGuard{
  constructor({repo,token,fetcher=globalThis.fetch}={}){
    assertRepo(repo);assert(typeof token==='string'&&token.length>0&&token.length<10000,
      'GitHub token from secret store required');
    assert(typeof fetcher==='function','fetcher required');
    this.repo=repo;this.token=token;this.fetcher=fetcher;
  }
  async request(method,path,body,absolute=false){
    const url=absolute?path:'https://api.github.com/repos/'+this.repo+path;
    const response=await this.fetcher(url,{
      method,headers:{
        Authorization:'Bearer '+this.token,
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28',
        ...(body===undefined?{}:{'Content-Type':'application/json'})
      },
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    let data=null;
    if(response.status!==204){
      try{data=await response.json();}catch{data=null;}
    }
    return {status:response.status,ok:response.ok,data};
  }
  async requireGet(path,allowed=[200],absolute=false){
    const r=await this.request('GET',path,undefined,absolute);
    assert(allowed.includes(r.status),'GITHUB_INSPECTION_BLOCKED_'+r.status+' '+(absolute?'identity':path));
    return r;
  }
  async inspect(){
    const repoResp=await this.requireGet('');
    const meta=repoResp.data;
    assert(meta?.full_name?.toLowerCase()===this.repo.toLowerCase(),
      'REPO_METADATA_MISMATCH');
    const branch=meta.default_branch;
    assert(typeof branch==='string'&&branch.length>0&&branch.length<150
      &&!branch.includes('..')&&!branch.includes('?')&&!branch.includes('#'),
      'invalid default branch');
    const ref=await this.requireGet('/git/ref/heads/'+encodeURIComponent(branch));
    assert(/^[a-f0-9]{40}$/i.test(ref.data?.object?.sha),'invalid branch HEAD');
    const [sets,rules,classic]=await Promise.all([
      this.request('GET','/rulesets?includes_parents=true&per_page=100'),
      this.request('GET','/rules/branches/'+encodeURIComponent(branch)+'?per_page=100'),
      this.request('GET','/branches/'+encodeURIComponent(branch)+'/protection')
    ]);
    // Unknown protection must not be mistaken for "none".
    const visible=sets.status===200&&Array.isArray(sets.data)
      &&sets.data.length<100&&rules.status===200&&Array.isArray(rules.data)
      &&rules.data.length<100&&[200,404].includes(classic.status);
    const active=new Set(visible?rules.data.map(r=>r.type):[]);
    const covered=RULES.every(rule=>active.has(rule));
    const managed=visible?sets.data.filter(s=>s.name===PCS_RULESET_NAME):[];
    const classicFound=classic.status===200;
    let status;
    if(!visible)status='INSPECTION_BLOCKED';
    else if(covered)status='ALREADY_PROTECTED';
    else if(classicFound||managed.length>0||rules.data.length>0||sets.data.length>0)
      status='EXISTING_POLICY_REVIEW';
    else status='OWNER_APPROVAL_REQUIRED';
    const payload=baseline(branch);
    const planBasis={
      schema:'pcs.branch-guard-plan.v1',
      repo:meta.full_name,default_branch:branch,head_sha:ref.data.object.sha,
      rule_name:PCS_RULESET_NAME,classic_status:classic.status,
      rulesets:visible?sets.data.map(s=>({id:s.id,name:s.name,
        enforcement:s.enforcement,source_type:s.source_type})):[],
      active_rule_types:visible?[...active].sort():[],
      proposal:payload
    };
    const digest=sha256(stable(planBasis));
    return {
      status,repo:meta.full_name,default_branch:branch,head_sha:ref.data.object.sha,
      existing_rule_types:visible?[...active].sort():null,classic_status:classic.status,
      rulesets_visible:visible,plan_sha256:digest,
      approved_command:'/pcs protect-default '+meta.full_name+' '+digest,
      proposed_ruleset:payload,
      explanation:status==='OWNER_APPROVAL_REQUIRED'
        ?'Owner must approve exact plan; Lead needs separate admin-capable identity.'
        :status==='INSPECTION_BLOCKED'
          ?'Cannot verify all existing protection; no changes permitted.'
          :status==='ALREADY_PROTECTED'
            ?'Baseline rules already active; do not duplicate.'
            :'Existing branch rules/protection need human review; never overwrite.'
    };
  }
  async verifyOwnerConsent(plan,{issueNumber,commentId}={}){
    assert(Number.isSafeInteger(issueNumber)&&issueNumber>0&&
      Number.isSafeInteger(commentId)&&commentId>0,'GitHub Issue/comment IDs required');
    const [meta,issue,comment,caller]=await Promise.all([
      this.requireGet(''),
      this.requireGet('/issues/'+issueNumber),
      this.requireGet('/issues/comments/'+commentId),
      this.requireGet('https://api.github.com/user',[200],true)
    ]);
    assert(meta.data?.owner?.type==='User',
      'ORG_OWNER_POLICY_NOT_CONFIGURED');
    const owner=meta.data.owner.login?.toLowerCase();
    assert(owner&&comment.data?.user?.login?.toLowerCase()===owner,
      'ONLY_GITHUB_OWNER_CAN_APPROVE');
    assert(caller.data?.login?.toLowerCase()&&caller.data.login.toLowerCase()!==owner,
      'SHARED_OWNER_TOKEN_NOT_INDEPENDENT: separate trusted automation identity required');
    assert(issue.data?.number===issueNumber&&!issue.data.pull_request
      &&typeof issue.data.body==='string'
      &&issue.data.body.includes('<!-- pcs-branch-guard -->'),
      'OWNER_APPROVAL_ISSUE_INVALID');
    assert(comment.data?.issue_url==='https://api.github.com/repos/'+this.repo+
      '/issues/'+issueNumber,'OWNER_APPROVAL_COMMENT_WRONG_ISSUE');
    const cmd=commentRe.exec(String(comment.data.body||'').trim());
    assert(cmd&&cmd[1].toLowerCase()===plan.repo.toLowerCase()
      &&cmd[2]===plan.plan_sha256,'OWNER_APPROVAL_PLAN_MISMATCH');
    return {owner,comment_id:commentId,issue_number:issueNumber};
  }
  async apply({issueNumber,commentId}={}){
    const before=await this.inspect();
    assert(before.status==='OWNER_APPROVAL_REQUIRED',
      'NOT_SAFE_TO_APPLY: '+before.status);
    await this.verifyOwnerConsent(before,{issueNumber,commentId});
    // Recheck after the Owner comment: branch/permissions/rules could have changed.
    const current=await this.inspect();
    assert(current.status==='OWNER_APPROVAL_REQUIRED'
      &&current.plan_sha256===before.plan_sha256,
      'STALE_BRANCH_PLAN: obtain fresh Owner approval');
    const created=await this.request('POST','/rulesets',current.proposed_ruleset);
    assert(created.status===201&&Number.isSafeInteger(created.data?.id),
      'GITHUB_ADMIN_WRITE_BLOCKED_'+created.status+
      ': check Administration write, plan support or repository ruleset limits');
    // Confirm both the actual created ruleset and rules effective on branch.
    const [readback,active]=await Promise.all([
      this.request('GET','/rulesets/'+created.data.id),
      this.request('GET','/rules/branches/'+encodeURIComponent(current.default_branch)+'?per_page=100')
    ]);
    const rulesOk=active.status===200&&Array.isArray(active.data)&&active.data.length<100
      &&RULES.every(r=>active.data.some(x=>x.type===r&&x.ruleset_id===created.data.id));
    const applied=readback.status===200&&readback.data?.id===created.data.id
      &&readback.data?.enforcement==='active'
      &&readback.data?.name===PCS_RULESET_NAME&&rulesOk;
    assert(applied,
      'RULESET_CREATED_BUT_UNVERIFIED: do not claim main is protected; inspect GitHub');
    return {status:'APPLIED_VERIFIED',repo:this.repo,branch:current.default_branch,
      ruleset_id:created.data.id,
      ruleset_url:'https://github.com/'+this.repo+'/rules/'+created.data.id,
      owner_comment:commentId,
      limitations:'PR required, force push/deletion prohibited. No required CI status or review count enforced until independently configured.'};
  }
}
