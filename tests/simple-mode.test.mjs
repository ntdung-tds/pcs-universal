import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState, validateState} from '../runtime/pcs3-core.mjs';
import {validateSimple, renderMoment, makeSimpleState, planIssueSync} from '../runtime/pcs3-simple.mjs';

const add=(s,id,deps=[])=>s.tasks.push({id,status:'PLANNED',title:id,dependencies:deps});
test('rejects 2-task dependency cycle',()=>{const s=emptyState('my-project','X');add(s,'A',['B']);add(s,'B',['A']);assert.throws(()=>validateState(s),/dependency cycle/)});
test('rejects 3-task dependency cycle',()=>{const s=emptyState('my-project','X');add(s,'A',['B']);add(s,'B',['C']);add(s,'C',['A']);assert.throws(()=>validateState(s),/dependency cycle/)});
test('rejects self dependency',()=>{const s=emptyState('my-project','X');add(s,'A',['A']);assert.throws(()=>validateState(s),/self dependency/)});
test('rejects duplicate task dependency',()=>{const s=emptyState('my-project','X');add(s,'A');add(s,'B',['A','A']);assert.throws(()=>validateState(s),/duplicate dependency/)});
test('allows a DAG with shared dependencies',()=>{const s=emptyState('my-project','X');add(s,'A');add(s,'B',['A']);add(s,'C',['A']);add(s,'D',['B','C']);assert.equal(validateState(s),true)});
test('required feature tasks cannot duplicate',()=>{const s=emptyState('my-project','X');add(s,'A');s.features.push({id:'F1',status:'IN_PROGRESS',required_tasks:['A','A']});assert.throws(()=>validateState(s),/duplicate required task/)});
test('simple state has canonical PCS3 nested state and explicit revision',()=>{const x=makeSimpleState('my-project','X');assert.equal(validateSimple(x),true);assert.equal(x.revision,1);assert.equal(x.state.slug,'my-project');});
test('simple state rejects invalid revision',()=>{const x=makeSimpleState('my-project','X');x.revision=-1;assert.throws(()=>validateSimple(x),/revision/)});
test('simple state rejects malformed approval/acceptance metadata',()=>{const x=makeSimpleState('my-project','X');x.state.tasks.push({id:'A',status:'ACCEPTED',qa:{status:'NOT_RUN'}});assert.throws(()=>validateSimple(x),/verified evidence/)});
test('moment contains exact next action and status split',()=>{const x=makeSimpleState('my-project','X');x.state.current.next_action='Test integration with IAM';x.state.tasks.push({id:'A',status:'TECH_DONE'});let t=renderMoment(x);assert.match(t,/Test integration with IAM/);assert.match(t,/TECH_DONE/);assert.match(t,/not accepted/)});
test('Issue plan ignores work with existing GitHub issue link',()=>{const x=makeSimpleState('my-project','X');x.state.tasks=[{id:'T1',title:'Build API',status:'PLANNED'},{id:'T2',title:'Add UI',status:'IN_PROGRESS',github_issue:'https://github.com/a/b/issues/4'}];const p=planIssueSync(x.state);assert.deepEqual(p.map(y=>y.id),['T1']);assert.match(p[0].body,/pcs-task:T1/)});
test('Issue plan excludes cancelled tasks',()=>{const x=makeSimpleState('my-project','X');x.state.tasks=[{id:'T1',title:'Old',status:'CANCELLED'}];assert.deepEqual(planIssueSync(x.state),[])});

test('Moment remains compact with 150 tasks, keeping active and blocked work',()=>{
 const x=makeSimpleState('big-project','Big');
 x.state.tasks=Array.from({length:150},(_,i)=>({id:'T'+(i+1),title:'Task '+(i+1),status:'PLANNED'}));
 x.state.current.active_task='T150';
 x.state.tasks[147].status='BLOCKED';
 x.state.tasks[148].status='TECH_DONE';
 const m=renderMoment(x);
 assert.match(m,/T150: Task 150/);
 assert.match(m,/T148: Task 148/);
 assert.match(m,/T149: Task 149/);
 assert.match(m,/additional open items/);
 assert.ok(m.length<5000,'Moment should not include the entire backlog');
});
