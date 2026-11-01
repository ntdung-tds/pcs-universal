import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../runtime/pcs3-core.mjs';
import {initCollaboration,registerProposal,authorizeDecision,applyDecision,validateProjectCollaboration} from '../runtime/pcs3-collaboration.mjs';

const repo='alice/site',meta={full_name:repo,private:true,owner:{login:'alice',type:'User'}};
const gov={number:80,body:'<!-- pcs-lead-governance -->'};
function setup(){
  const s=emptyState('website-test','Website');
  s.tasks=[{id:'T1',status:'PLANNED',risk:'NORMAL'},{id:'T2',status:'PLANNED',risk:'NORMAL'}];
  initCollaboration(s,{repoOwner:'alice'});
  return s;
}
function register(s,id,agent,who,tasks=[],risk='NORMAL',issueNo=10){
  const issue={number:issueNo,body:'<!-- pcs-agent-join:'+id+' -->',user:{login:who}};
  registerProposal(s,{id,agent_id:agent,provider:'Claude',github_login:who,summary:'new agent',suggested_tasks:tasks,risk,mode:'SELF_PROPOSED',capabilities:[],issue_number:issueNo},issue);
  return issue;
}
let sequence=500;
function auth(s,who,command,action,target,number=10,issue=null){
  const commentId=++sequence;
  const i=issue??{number,body:'<!-- pcs-agent-join:'+target+' -->'};
  return authorizeDecision(s,{repo,repoMetadata:meta,issue:i,comment:{
    id:commentId,user:{login:who},body:command,
    issue_url:'https://api.github.com/repos/'+repo+'/issues/'+number
  },action,proposalId:target});
}
function withLead(){
  const s=setup();
  register(s,'JOIN01','AGENT01','leaduser');
  applyDecision(s,auth(s,'alice','/pcs approve JOIN01','approve','JOIN01'));
  applyDecision(s,auth(s,'alice','/pcs designate-lead AGENT01 7d','designate-lead','AGENT01',80,gov));
  return s;
}
test('SEC-01: mixed-case HIGH risk requires Owner for proposed tasks',()=>{
  const s=withLead();s.tasks[0].risk='high';
  register(s,'JOIN02','AGENT02','newuser',['T1'],'NORMAL',11);
  assert.throws(()=>auth(s,'leaduser','/pcs approve JOIN02','approve','JOIN02',11),/sensitive work requires owner/);
});
test('SEC-01: missing/unknown task risk fails closed for delegated approval',()=>{
  const s=withLead();delete s.tasks[0].risk;
  register(s,'JOIN02','AGENT02','newuser',['T1'],'NORMAL',11);
  assert.throws(()=>auth(s,'leaduser','/pcs approve JOIN02','approve','JOIN02',11),/sensitive work requires owner/);
  s.tasks[0].risk='???';
  assert.throws(()=>auth(s,'leaduser','/pcs approve JOIN02','approve','JOIN02',11),/sensitive work requires owner/);
});
test('SEC-02: approval is immutable and cannot be transplanted to another action',()=>{
  const s=setup();register(s,'JOIN01','AGENT01','worker');
  const e=auth(s,'alice','/pcs approve JOIN01','approve','JOIN01');
  assert.throws(()=>{e.action='designate-lead';},TypeError);
  assert.throws(()=>{e.tasks.push('T1');},TypeError);
  assert.throws(()=>applyDecision(s,{...e,action:'designate-lead'}),/UNVERIFIED_DECISION/);
  applyDecision(s,e);
});
test('SEC-02: cross-state reuse is not an authenticated approval',()=>{
  const a=setup(),b=setup();register(a,'JOIN01','AGENT01','worker');register(b,'JOIN01','AGENT01','worker');
  const e=auth(a,'alice','/pcs approve JOIN01','approve','JOIN01');
  assert.throws(()=>applyDecision(b,e),/UNVERIFIED_DECISION/);
});
test('SEC-03: old lead decision rejected after owner revokes lead',()=>{
  const s=withLead();register(s,'JOIN02','AGENT02','worker2',[], 'NORMAL',11);
  const pending=auth(s,'leaduser','/pcs approve JOIN02','approve','JOIN02',11);
  applyDecision(s,auth(s,'alice','/pcs clear-lead AGENT01','clear-lead','AGENT01',80,gov));
  assert.throws(()=>applyDecision(s,pending),/STALE_LEAD_EPOCH/);
  assert.equal(s.collaboration.proposals.find(p=>p.id==='JOIN02').status,'PENDING');
});
test('SEC-03: expired lead decision denied when applied',()=>{
  const s=withLead();register(s,'JOIN02','AGENT02','worker2',[], 'NORMAL',11);
  const pending=auth(s,'leaduser','/pcs approve JOIN02','approve','JOIN02',11);
  s.collaboration.lead.expires_at='2000-01-01T00:00:00.000Z';
  assert.throws(()=>applyDecision(s,pending),/STALE_LEAD_AUTHORITY/);
});
test('SEC-01: risk escalation after authorization is re-evaluated at apply',()=>{
  const s=withLead();register(s,'JOIN02','AGENT02','worker2',['T1'],'NORMAL',11);
  const pending=auth(s,'leaduser','/pcs approve JOIN02','approve','JOIN02',11);
  s.tasks[0].risk='CRITICAL';
  assert.throws(()=>applyDecision(s,pending),/STALE_GOVERNANCE_STATE|sensitive work requires owner/);
});
test('SEC-04: wrong lead epoch and forged delegation rejected by validator',()=>{
  const s=withLead();s.collaboration.lead.epoch+=10;
  assert.throws(()=>validateProjectCollaboration(s),/lead epoch mismatch/);
  s.collaboration.lead.epoch=s.collaboration.lead_epoch;
  s.collaboration.lead.delegation.actor_login='imposter';
  assert.throws(()=>validateProjectCollaboration(s),/owner delegation provenance invalid/);
});
test('SEC-01: owner can still approve sensitive scope',()=>{
  const s=setup();s.tasks[0].risk='high';register(s,'JOIN01','AGENT01','worker',['T1']);
  applyDecision(s,auth(s,'alice','/pcs approve JOIN01','approve','JOIN01'));
  assert.equal(s.collaboration.assignments[0].task_id,'T1');
});
test('SEC-01: delegated lead cannot assign an owner-only task to idle agent',()=>{
  const s=withLead();register(s,'JOIN02','AGENT02','worker2',[], 'NORMAL',11);
  applyDecision(s,auth(s,'alice','/pcs approve JOIN02','approve','JOIN02',11));
  s.tasks[0].risk='High';
  assert.throws(()=>auth(s,'leaduser','/pcs assign JOIN02 T1','assign','JOIN02',11),/sensitive work requires owner/);
});

test('SEC-02: proposal task list cannot be altered after approval verification',()=>{
  const s=setup();register(s,'JOIN01','AGENT01','worker',[]);
  const decision=auth(s,'alice','/pcs approve JOIN01','approve','JOIN01');
  s.collaboration.proposals[0].suggested_tasks=['T1'];
  assert.throws(()=>applyDecision(s,decision),/STALE_GOVERNANCE_STATE/);
});

test('PCS 3.2: delegated Lead also respects Owner-only operational flags',()=>{
  for(const flag of ['production','destructive','iam_change','credentials_change',
    'external_spend','data_migration','requires_owner_approval']){
    const s=withLead();s.tasks[0][flag]=true;
    register(s,'JOIN02','AGENT02','newuser',['T1'],'NORMAL',11);
    assert.throws(()=>auth(s,'leaduser','/pcs approve JOIN02','approve','JOIN02',11),
      /sensitive work requires owner/,flag);
    // The Owner remains authorized to approve these tasks.
    const proof=auth(s,'alice','/pcs approve JOIN02','approve','JOIN02',11);
    applyDecision(s,proof);
    assert.equal(s.collaboration.assignments[0].task_id,'T1');
  }
});
