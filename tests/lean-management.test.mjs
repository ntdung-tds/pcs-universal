import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../runtime/pcs3-core.mjs';
import {initCollaboration} from '../runtime/pcs3-collaboration.mjs';
import {leanControl,authorizeLeanClaim,applyLeanClaim} from '../runtime/pcs3-lean.mjs';

function fixture(){
  const s=emptyState('lean-test','Lean test');
  s.tasks=[{id:'T1',title:'Normal task',status:'PLANNED',risk:'LOW',dependencies:[]}];
  initCollaboration(s,{repoOwner:'owner'});
  const c=s.collaboration;
  c.agents.push({id:'Bot01',github_login:'bot-one',provider:'ChatGPT',status:'IDLE',
    capabilities:[],joined_at:'2026-11-01T00:00:00Z'});
  c.proposals.push({id:'Join01',agent_id:'Bot01',mode:'SELF_PROPOSED',risk:'NORMAL',
    issue_number:10,summary:'',suggested_tasks:[],status:'APPROVED',
    created_at:'2026-11-01T00:00:00Z',
    decision:{actor_login:'owner',comment_id:20}});
  const repoMetadata={full_name:'owner/sandbox',private:true,owner:{type:'User',login:'owner'}};
  return {s,repoMetadata,caller:{login:'bot-one'}};
}
function authorize(f){return authorizeLeanClaim(f.s,{repoMetadata:f.repoMetadata,
  caller:f.caller,taskId:'T1',agentId:'Bot01'});}

test('solo state needs no contributor registry',()=>{
  const s=emptyState('solo-test','Solo');s.tasks=[{id:'T1',status:'PLANNED',risk:'NORMAL'}];
  assert.equal(leanControl(s,'T1').mode,'SOLO');
});
test('new collaboration policy opts in approved normal self-claim',()=>{
  const f=fixture();assert.equal(f.s.collaboration.policy.self_claim_normal,true);
  assert.equal(leanControl(f.s,'T1').ready,true);
});
test('claim changes task and assignment without a per-task Owner comment',()=>{
  const f=fixture();applyLeanClaim(f.s,authorize(f));
  assert.equal(f.s.tasks[0].status,'IN_PROGRESS');
  assert.equal(f.s.collaboration.agents[0].status,'ACTIVE');
  assert.equal(f.s.collaboration.assignments[0].agent_id,'Bot01');
  assert.equal(f.s.collaboration.history.at(-1).type,'SELF_CLAIM');
  assert.equal(validateState(f.s),true);
});
test('cannot double claim assigned task',()=>{
  const f=fixture();applyLeanClaim(f.s,authorize(f));
  assert.throws(()=>authorize(f),/AGENT_NOT_APPROVED_AND_IDLE|TASK_NOT_READY/);
});
test('high risk and missing risk require Owner',()=>{
  for(const risk of ['HIGH','critical','SENSITIVE',undefined]){
    const f=fixture();f.s.tasks[0].risk=risk;
    assert.equal(leanControl(f.s,'T1').requires_owner,true);
    assert.throws(()=>authorize(f),/OWNER_APPROVAL_REQUIRED/);
  }
});
test('confidential, restricted and unknown classification blocked',()=>{
  for(const classification of ['CONFIDENTIAL','RESTRICTED','UNKNOWN']){
    const f=fixture();f.s.tasks[0].classification=classification;
    assert.throws(()=>authorize(f),/OWNER_APPROVAL_REQUIRED/);
  }
});
test('production, IAM, destructive and financial operations need Owner',()=>{
  for(const flag of ['production','destructive','iam_change','external_spend','credentials_change','requires_owner_approval']){
    const f=fixture();f.s.tasks[0][flag]=true;
    assert.throws(()=>authorize(f),/OWNER_APPROVAL_REQUIRED/);
  }
});
test('dependencies block claim before acceptance',()=>{
  const f=fixture();f.s.tasks.unshift({id:'T0',status:'PLANNED',risk:'LOW'});
  f.s.tasks[1].dependencies=['T0'];
  assert.equal(leanControl(f.s,'T1').ready,false);
  assert.throws(()=>authorize(f),/TASK_NOT_READY/);
});
test('owner or shared connector identity cannot pose as agent',()=>{
  const f=fixture();f.caller={login:'owner'};
  assert.throws(()=>authorize(f),/INDEPENDENT_GITHUB_AGENT_IDENTITY_REQUIRED/);
});
test('unapproved agent cannot self-claim',()=>{
  const f=fixture();f.s.collaboration.proposals[0].status='PENDING';
  assert.throws(()=>authorize(f),/AGENT_NOT_APPROVED_AND_IDLE/);
});
test('legacy projects without opt-in remain locked',()=>{
  const f=fixture();delete f.s.collaboration.policy.self_claim_normal;
  assert.throws(()=>authorize(f),/SELF_CLAIM_NOT_ENABLED/);
});
test('metadata or GitHub caller identity unknown fails closed',()=>{
  const f=fixture();f.repoMetadata.private=false;
  assert.throws(()=>authorize(f),/REPOSITORY_OWNER_NOT_VERIFIED/);
  f.repoMetadata.private=true;f.caller={};
  assert.throws(()=>authorize(f),/INDEPENDENT_GITHUB_AGENT_IDENTITY_REQUIRED/);
});
test('fabricated evidence object cannot mutate state',()=>{
  const f=fixture();
  assert.throws(()=>applyLeanClaim(f.s,{type:'LEAN_SELF_CLAIM',
    task_id:'T1',agent_id:'Bot01'}),/UNVERIFIED_LEAN_CLAIM/);
});
test('changing task, permission or state after authorization fails',()=>{
  for(const mutate of [
    s=>s.tasks[0].risk='HIGH',
    s=>s.collaboration.policy.self_claim_normal=false,
    s=>s.current.next_action='Changed'
  ]){
    const f=fixture(),e=authorize(f);
    mutate(f.s);
    assert.throws(()=>applyLeanClaim(f.s,e),/STALE_LEAN_CLAIM/);
  }
});
test('evidence cannot be replayed and does not produce accepted QA',()=>{
  const f=fixture(),e=authorize(f);applyLeanClaim(f.s,e);
  assert.throws(()=>applyLeanClaim(f.s,e),/STALE_LEAN_CLAIM/);
  assert.notEqual(f.s.tasks[0].status,'ACCEPTED');
});
test('second approved contributor chooses collaborative mode',()=>{
  const f=fixture();f.s.collaboration.agents.push({id:'Bot02',github_login:'bot-two',
    provider:'Claude',status:'IDLE',capabilities:[],joined_at:'2026-11-01T00:00:00Z'});
  assert.equal(leanControl(f.s,'T1').mode,'COLLABORATIVE');
});
