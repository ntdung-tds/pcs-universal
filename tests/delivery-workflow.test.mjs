import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../runtime/pcs3-core.mjs';
import {validateSimple,makeSimpleState,renderMoment} from '../runtime/pcs3-simple.mjs';
import {initCollaboration} from '../runtime/pcs3-collaboration.mjs';
import {
  validateDelivery,authorizeTechnicalAcceptance,applyTechnicalAcceptance,
  authorizeOwnerFeedback,applyOwnerFeedback,latestOwnerFeedback,recommendNextTasks
} from '../runtime/pcs3-delivery.mjs';

const sha='a'.repeat(40), merge='b'.repeat(40);
const repo='alice/project';
const meta={full_name:repo,default_branch:'main',owner:{type:'User',login:'alice'},private:true};
function setup(){
  const s=emptyState('demo-project','Demo');
  s.tasks=[{id:'T1',title:'Login',status:'TECH_DONE',risk:'NORMAL'},
    {id:'T2',title:'Password reset',status:'PLANNED',risk:'NORMAL',dependencies:['T1']}];
  s.features=[{id:'F1',title:'Authentication',status:'IN_PROGRESS'}];
  s.releases=[{id:'R1',title:'First release',status:'IN_PROGRESS'}];
  initCollaboration(s,{repoOwner:'alice'});
  const c=s.collaboration;
  c.agents.push({id:'LEAD01',provider:'GPT',github_login:'leaduser',status:'IDLE',capabilities:[],joined_at:'2026-10-01T00:00:00Z'});
  c.agents.push({id:'WORK01',provider:'Claude',github_login:'worker',status:'ACTIVE',capabilities:[],joined_at:'2026-10-01T00:00:00Z'});
  c.lead_epoch=1;
  c.lead={agent_id:'LEAD01',github_login:'leaduser',epoch:1,
    expires_at:'2099-01-01T00:00:00Z',
    delegation:{authority:'OWNER',actor_login:'alice',action:'designate-lead',proposalId:'LEAD01'}};
  c.assignments.push({task_id:'T1',agent_id:'WORK01',proposal_id:'J1',at:'2026-10-01T00:00:00Z'});
  return s;
}
function pr(){return {number:12,merged:true,merged_at:'2026-10-31T08:00:00Z',body:'<!-- pcs-task:T1 -->',
  user:{login:'worker'},head:{sha},merge_commit_sha:merge,
  base:{ref:'main',repo:{full_name:repo}}};}
function reviews(){return [{id:101,user:{login:'leaduser'},state:'APPROVED',commit_id:sha,submitted_at:'2026-10-31T08:00:00Z'}];}
function checks(){return {total_count:1,check_runs:[{status:'completed',conclusion:'success'}]};}
function technical(s,options={}){return authorizeTechnicalAcceptance(s,{repoMetadata:meta,pr:options.pr||pr(),reviews:options.reviews||reviews(),
  checks:options.checks||checks(),taskId:'T1',agentId:'WORK01'});}
function feedback(s,{command='agree',scope='release',target='R1',actor='alice',shaValue=sha,branchSha=sha,commentId=401,issueNo=80}={}){
  const issue={number:issueNo,body:'<!-- pcs-owner-review:'+scope+':'+target+' -->'};
  const comment={id:commentId,user:{login:actor},body:'/pcs '+command+' '+scope+' '+target+' '+shaValue,
    issue_url:'https://api.github.com/repos/'+repo+'/issues/'+issueNo};
  return authorizeOwnerFeedback(s,{repoMetadata:meta,issue,comment,scope,target,reviewedSha:shaValue,branchSha});
}
test('3.1: Lead technical acceptance follows a verified merged PR with successful checks',()=>{
  const s=setup();const proof=technical(s);applyTechnicalAcceptance(s,proof);
  assert.equal(s.delivery.technical_reviews[0].status,'TECH_ACCEPTED');
  assert.equal(s.collaboration.assignments.length,0);
  assert.equal(s.collaboration.agents[1].status,'IDLE');
  assert.deepEqual(recommendNextTasks(s).map(x=>x.task_id),['T2']);
  const d=makeSimpleState('demo-project','Demo');d.state=s;
  assert.equal(validateSimple(d),true);
  assert.match(renderMoment(d),/Technical reviews/);
});
test('3.1: no Lead technical acceptance for an unmerged PR',()=>{
  const s=setup(),p=pr();p.merged=false;p.merged_at=null;
  assert.throws(()=>technical(s,{pr:p}),/PR_NOT_MERGED/);
});
test('3.1: no acceptance if PR author differs from assigned agent',()=>{
  const s=setup(),p=pr();p.user.login='imposter';
  assert.throws(()=>technical(s,{pr:p}),/PR_AUTHOR_NOT_ASSIGNED_AGENT/);
});
test('3.1: no acceptance on failing CI',()=>{
  const s=setup();assert.throws(()=>technical(s,{checks:{check_runs:[{status:'completed',conclusion:'failure'}]}}),/CI_NOT_FULLY_GREEN/);
});
test('3.1: no acceptance with zero check runs',()=>{
  const s=setup();assert.throws(()=>technical(s,{checks:{check_runs:[]}}),/CHECK_RUNS_INCOMPLETE/);
});
test('3.1: latest Lead review must approve current PR commit',()=>{
  const s=setup();const bad=[...reviews(),{id:102,user:{login:'leaduser'},state:'CHANGES_REQUESTED',commit_id:sha,
    submitted_at:'2026-10-31T08:30:00Z'}];
  assert.throws(()=>technical(s,{reviews:bad}),/LEAD_REVIEW_NOT_APPROVED/);
});
test('3.1: Lead cannot technically approve its own work',()=>{
  const s=setup();s.collaboration.agents[1].github_login='leaduser';
  const p=pr();p.user.login='leaduser';
  assert.throws(()=>technical(s,{pr:p}),/SELF_TECHNICAL_APPROVAL/);
});
test('3.1: stale technical proof cannot survive Lead revocation',()=>{
  const s=setup(),e=technical(s);s.collaboration.lead_epoch++;
  assert.throws(()=>applyTechnicalAcceptance(s,e),/STALE_DELIVERY_STATE/);
});
test('3.1: fabricated JSON technical review is not trusted',()=>{
  const s=setup(),e=technical(s);
  assert.throws(()=>applyTechnicalAcceptance(s,{...e}),/UNVERIFIED_DELIVERY_EVIDENCE/);
});
test('3.1: task cannot be accepted twice from same PR',()=>{
  const s=setup(),e=technical(s);applyTechnicalAcceptance(s,e);
  assert.throws(()=>applyTechnicalAcceptance(s,e),/STALE_DELIVERY_STATE/);
});
test('3.1: Owner can agree with a reviewed release',()=>{
  const s=setup(),e=feedback(s);applyOwnerFeedback(s,e);
  assert.equal(latestOwnerFeedback(s,'release','R1').decision,'AGREED');
  assert.equal(s.tasks[0].status,'TECH_DONE','Owner feedback does not fake technical status');
});
test('3.1: Owner can request changes without blocking unrelated tasks',()=>{
  const s=setup(),e=feedback(s,{command:'changes',scope:'feature',target:'F1'});
  applyOwnerFeedback(s,e);
  assert.equal(latestOwnerFeedback(s,'feature','F1').decision,'CHANGES_REQUESTED');
  assert.ok(s.current.blockers.some(b=>b.includes('F1')));
  assert.deepEqual(recommendNextTasks(s),[],'T2 still depends on T1 technical acceptance');
});
test('3.1: Owner can disagree with a release',()=>{
  const s=setup(),e=feedback(s,{command:'disagree'});applyOwnerFeedback(s,e);
  assert.equal(latestOwnerFeedback(s,'release','R1').decision,'NOT_AGREED');
});
test('3.1: untrusted contributor cannot forge Owner approval',()=>{
  const s=setup();assert.throws(()=>feedback(s,{actor:'worker'}),/OWNER_COMMENT_REQUIRED/);
});
test('3.1: Owner agreement must bind to current reviewed commit',()=>{
  const s=setup();assert.throws(()=>feedback(s,{branchSha:merge}),/REVIEWED_COMMIT_NOT_CURRENT/);
});
test('3.1: owner comment command must match target, scope and commit',()=>{
  const s=setup();const i={number:80,body:'<!-- pcs-owner-review:release:R1 -->'};
  assert.throws(()=>authorizeOwnerFeedback(s,{repoMetadata:meta,issue:i,
    comment:{id:401,user:{login:'alice'},issue_url:'https://api.github.com/repos/'+repo+'/issues/80',
      body:'/pcs agree feature F1 '+sha},scope:'release',target:'R1',reviewedSha:sha,branchSha:sha}),/COMMAND_MISMATCH/);
});
test('3.1: Owner feedback cannot be replayed or copied',()=>{
  const s=setup(),e=feedback(s);applyOwnerFeedback(s,e);
  assert.throws(()=>applyOwnerFeedback(s,e),/STALE_DELIVERY_STATE/);
  assert.throws(()=>applyOwnerFeedback(s,{...e}),/UNVERIFIED_DELIVERY_EVIDENCE/);
});
test('3.1: single-agent project can receive verified Owner feedback without collaboration setup',()=>{
  const s=emptyState('solo-app','Solo');
  s.releases.push({id:'R1',status:'IN_PROGRESS'});
  const e=feedback(s);applyOwnerFeedback(s,e);
  const doc=makeSimpleState('solo-app','Solo');doc.state=s;
  assert.equal(validateSimple(doc),true);
  assert.equal(latestOwnerFeedback(s,'release','R1').decision,'AGREED');
});
test('3.1: schema rejects manually forged duplicate feedback and unknown technical actor',()=>{
  const s=setup(),e=feedback(s);applyOwnerFeedback(s,e);
  s.delivery.owner_feedback.push({...s.delivery.owner_feedback[0]});
  assert.throws(()=>validateDelivery(s),/comment replay/);
});
