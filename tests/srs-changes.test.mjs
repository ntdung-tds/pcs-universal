import test from 'node:test';
import assert from 'node:assert/strict';
import {HEADER,parseLedger,appendEvent,activeContext,proposeFromActive,summary} from '../tools/pcs-srs-changes.mjs';
const doc={state:{current:{active_task:'TASK-5'},tasks:[{id:'TASK-5',srs_ref:'docs/SRS.md#security'}],features:[{id:'FEAT-2',required_tasks:['TASK-5']}]}};
const proposal=(id,before,after,base)=>({kind:'PROPOSE',id,task_id:'TASK-5',feature_id:'FEAT-2',item_key:'FEAT-2',srs_ref:'docs/SRS.md#security',at:'2026-11-01T10:00:00Z',before,after,reason:'Owner requested',based_on:base});
const decide=(id,decision='APPROVED')=>({kind:'DECIDE',id,decision,actor:'owner',ref:'https://github.com/example/repo/issues/10#issuecomment-3',at:'2026-11-01T10:01:00Z'});
test('no Owner SRS section needed: derive active task/feature',()=>{
 assert.equal(activeContext(doc).item_key,'FEAT-2');
 const out=proposeFromActive(HEADER,doc,{id:'CR-1',before:'12 characters',after:'8 characters',reason:'Owner change'});
 assert.equal(out.event.item_key,'CR-1');assert.equal(parseLedger(out.markdown).events.length,1);
});
test('ambiguous mapping falls back to task, not invented section',()=>{
 const d={state:{...doc.state,features:[{id:'FEAT-1',required_tasks:['TASK-5']},{id:'FEAT-2',required_tasks:['TASK-5']}]}};
 assert.equal(activeContext(d).item_key,'TASK-5');assert.equal(activeContext(d).ambiguous_features,true);
 assert.equal(activeContext({state:{...doc.state,tasks:[{id:'TASK-5'}],features:[]}}).srs_ref,'UNMAPPED');
});
test('three revisions; latest approved wins, proposals do not override',()=>{
 let m=HEADER;for(const e of [proposal('CR-1','12','10','BASELINE'),decide('CR-1'),proposal('CR-2','10','8','CR-1'),decide('CR-2'),proposal('CR-3','8','9','CR-2')])m=appendEvent(m,e);
 const out=summary(m,{item_key:'FEAT-2'}).items[0];assert.equal(out.effective_change_id,'CR-2');
 assert.equal(out.effective_delta.after,'8');assert.equal(out.pending_count,1);assert.equal(out.history_count,3);
});
test('duplicate and conflicting concurrent approvals fail closed',()=>{
 let m=appendEvent(HEADER,proposal('CR-1','12','10','BASELINE'));
 assert.throws(()=>appendEvent(m,proposal('CR-1','12','9','BASELINE')),/DUPLICATE/);
 m=appendEvent(m,proposal('CR-2','12','8','BASELINE'));m=appendEvent(m,decide('CR-1'));
 assert.throws(()=>appendEvent(m,decide('CR-2')),/STALE_APPROVAL/);
});
test('missing approval provenance or broken ledger fails closed',()=>{
 let m=appendEvent(HEADER,proposal('CR-1','12','8','BASELINE'));
 assert.throws(()=>appendEvent(m,{kind:'DECIDE',id:'CR-1',decision:'APPROVED',actor:'owner',ref:'',at:'2026-11-01T10:00:00Z'}),/DECISION_PROVENANCE/);
 m=appendEvent(m,decide('CR-1','REJECTED'));
 assert.equal(summary(m,{item_key:'FEAT-2'}).items[0].effective_change_id,null);
 assert.throws(()=>parseLedger('arbitrary text'),/INVALID_HEADER/);
});

test('independent changes within one Feature remain separate; revisions link only intended CR',()=>{
 let m=HEADER;
 m=proposeFromActive(m,doc,{id:'CR-password',before:'12 chars',after:'8 chars',reason:'Owner password change'}).markdown;
 m=proposeFromActive(m,doc,{id:'CR-timeout',before:'30 min',after:'15 min',reason:'Owner session change'}).markdown;
 m=appendEvent(m,decide('CR-password'));m=appendEvent(m,decide('CR-timeout'));
 let out=summary(m,{item_key:'FEAT-2'});
 assert.equal(out.total_items,2);
 assert.deepEqual(out.items.map(i=>i.effective_change_id),['CR-password','CR-timeout']);
 const next=proposeFromActive(m,doc,{id:'CR-password-v2',revision_of:'CR-password',before:'8 chars',after:'10 chars',reason:'Owner revised password rule'});
 assert.equal(next.event.item_key,'CR-password');
 m=appendEvent(next.markdown,decide('CR-password-v2'));
 out=summary(m,{item_key:'FEAT-2'});
 assert.deepEqual(out.items.map(i=>i.effective_change_id),['CR-password-v2','CR-timeout']);
 assert.throws(()=>proposeFromActive(m,doc,{id:'CR-x',revision_of:'CR-missing',before:'a',after:'b',reason:'x'}),/UNKNOWN_REVISION/);
});
test('aggregate is bounded and pageable',()=>{
 let m=HEADER;
 for(let i=0;i<24;i++)m=proposeFromActive(m,doc,{id:'CR-'+i,before:'A',after:'B',reason:'Change'}).markdown;
 const a=summary(m),b=summary(m,{offset:10}),c=summary(m,{offset:20});
 assert.equal(a.total_items,24);assert.equal(a.items.length,10);assert.equal(a.next_offset,10);
 assert.equal(b.items.length,10);assert.equal(b.next_offset,20);
 assert.equal(c.items.length,4);assert.equal(c.next_offset,null);
 assert.throws(()=>summary(m,{max_items:100}),/INVALID_MAX_ITEMS/);
});
