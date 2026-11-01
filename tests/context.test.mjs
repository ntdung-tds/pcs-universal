import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSimpleState} from '../runtime/pcs3-simple.mjs';
import {contextPacket} from '../tools/pcs-context.mjs';

test('bounded context does not leak task descriptions or repeat the backlog',()=>{
  const s=makeSimpleState('sample-project','Sample');
  s.state.tasks=Array.from({length:220},(_,i)=>({id:'T'+i,title:'Private story '+i,
    status:'PLANNED',risk:'NORMAL',dependencies:[]}));
  s.state.current.active_task='T219';
  const before=JSON.stringify(s);
  const packet=contextPacket(s,{role:'contributor',limit:5});
  assert.equal(packet.task.id,'T219');assert.equal(packet.backlog.shown.length,5);
  assert.equal(packet.backlog.remaining,215);
  assert.ok(!JSON.stringify(packet).includes('Private story'));
  assert.equal(JSON.stringify(s),before);
});
test('unknown risk and sensitive operation require owner review, even when context is compact',()=>{
  const s=makeSimpleState('sample-project','Sample');
  s.state.tasks=[{id:'T1',title:'Do not print',status:'PLANNED',production:true}];
  const p=contextPacket(s,{taskId:'T1'});
  assert.equal(p.task.owner_review_required,true);
  assert.ok(p.task.sensitive_flags.includes('production'));
  assert.equal(p.handoff_contract.owner_approval,'NOT_VERIFIED');
  assert.throws(()=>contextPacket(s,{taskId:'X'}),/TASK_NOT_FOUND/);
  assert.throws(()=>contextPacket(s,{limit:100}),/INVALID_LIMIT/);
  assert.throws(()=>contextPacket(s,{role:'admin'}),/INVALID_ROLE/);
});
