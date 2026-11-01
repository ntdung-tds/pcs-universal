import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSimpleState} from '../runtime/pcs3-simple.mjs';
import {inspect,compareState} from '../tools/pcs-state-inspect.mjs';

test('inspector gives bounded, read-only summary for large state',()=>{
 const doc=makeSimpleState('project-1','Project');
 doc.state.tasks=Array.from({length:300},(_,i)=>({id:'T'+i,title:'Secret title '+i,status:'PLANNED'}));
 doc.state.current.active_task='T299';
 const original=JSON.stringify(doc);
 const result=inspect(doc,{group:'tasks',limit:8});
 assert.equal(result.counts.tasks.total,300);
 assert.equal(result.selected.tasks.shown.length,8);
 assert.equal(result.selected.tasks.shown[0].id,'T299');
 assert.equal(result.selected.tasks.remaining,292);
 assert.ok(!JSON.stringify(result).includes('Secret title'));
 assert.equal(original,JSON.stringify(doc));
});
test('inspector fails closed on invalid state or unknown collection',()=>{
 const d=makeSimpleState('project-1','Project');
 assert.throws(()=>inspect(d,{group:'bad'}),/INVALID_GROUP/);
 assert.throws(()=>inspect(d,{limit:2000}),/INVALID_LIMIT/);
 d.state.tasks.push({id:'T',status:'INVALID'});
 assert.throws(()=>inspect(d),/invalid status/);
});
test('diff reports only changed IDs/status/field names, not sensitive values',()=>{
 const a=makeSimpleState('project-1','Project');
 a.state.tasks=[{id:'T1',status:'PLANNED',title:'internal plan'}];
 const b=structuredClone(a);b.revision=2;
 b.state.tasks[0].status='IN_PROGRESS';b.state.tasks.push({id:'T2',status:'PLANNED',title:'Sensitive description'});
 const d=compareState(a,b);
 assert.equal(d.total_changes,2);
 assert.ok(d.changes.tasks.shown.some(x=>x.id==='T1'&&x.status_after==='IN_PROGRESS'));
 assert.ok(!JSON.stringify(d).includes('Sensitive description'));
 assert.throws(()=>compareState(a,a),/NON_INCREMENTAL_REVISION/);
});
