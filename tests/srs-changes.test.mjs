import test from 'node:test';
import assert from 'node:assert/strict';
import {HEADER,parseLedger,appendEvent,activeContext,proposeFromActive,summary} from '../tools/pcs-srs-changes.mjs';
const doc={state:{current:{active_task:'TASK-5'},tasks:[{id:'TASK-5',srs_ref:'docs/SRS.md#security'}],features:[{id:'FEAT-2',required_tasks:['TASK-5']}]}};
const proposal=(id,before,after,base)=>({kind:'PROPOSE',id,task_id:'TASK-5',feature_id:'FEAT-2',item_key:'FEAT-2',srs_ref:'docs/SRS.md#security',at:'2026-11-01T10:00:00Z',before,after,reason:'Owner requested',based_on:base});
const decide=(id,decision='APPROVED')=>({kind:'DECIDE',id,decision,actor:'owner',ref:'https://github.com/example/repo/issues/10#issuecomment-3',at:'2026-11-01T10:01:00Z'});
test('no Owner SRS section needed: derive active task/feature',()=>{
 assert.equal(activeContext(doc).item_key,'FEAT-2');
 const out=proposeFromActive(HEADER,doc,{id:'CR-1',before:'12 characters',after:'8 characters',reason:'Owner change',requirement_key:'password-length'});
 assert.equal(out.event.item_key,'FEAT-2');assert.equal(parseLedger(out.markdown).events.length,1);
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

test('independent criteria in one Feature never overwrite each other',()=>{
 let m=proposeFromActive(HEADER,doc,{id:'CR-P1',requirement_key:'password-length',before:'min 12',after:'min 8',reason:'Owner'}).markdown;
 m=appendEvent(m,decide('CR-P1'));
 const independent=proposeFromActive(m,doc,{id:'CR-U1',requirement_key:'username-length',before:'max 24',after:'max 40',reason:'Owner'});
 assert.equal(independent.event.based_on,'BASELINE');
 assert.notEqual(independent.event.item_key,'FEAT-2.password-length');
 m=independent.markdown;
 const next=proposeFromActive(m,doc,{id:'CR-P2',requirement_key:'password-length',before:'min 8',after:'min 10',reason:'Owner'});
 assert.equal(next.event.based_on,'CR-P1');
 assert.equal(summary(next.markdown,{task_id:'TASK-5'}).total_items,2);
 assert.equal(summary(next.markdown,{feature_id:'FEAT-2'}).total_items,2);
 assert.throws(()=>proposeFromActive(m,doc,{id:'CR-P3',requirement_key:'password-length',before:'unrelated',after:'other',reason:'Owner'}),/DELTA_BASELINE_MISMATCH/);
 assert.throws(()=>proposeFromActive(m,doc,{id:'CR-BAD',before:'x',after:'y',reason:'Owner'}),/REQUIREMENT_KEY_REQUIRED/);
});
test('summary is bounded for many independent requirements',()=>{
 let m=HEADER;
 for(let i=0;i<14;i++)m=appendEvent(m,{...proposal('CR-Q'+i,'a','b','BASELINE'),item_key:'FEAT-2.aspect'+i,requirement_key:'aspect'+i});
 const out=summary(m,{task_id:'TASK-5'});
 assert.equal(out.total_items,14);assert.equal(out.items.length,8);assert.equal(out.remaining_items,6);
 assert.equal(summary(m,{max_items:20}).items.length,14);
 assert.throws(()=>summary(m,{max_items:100}),/INVALID_MAX_ITEMS/);
});

test('an existing unscoped v1 history requires explicit reconciliation before scoped writes',()=>{
 const old=appendEvent(HEADER,proposal('CR-LEGACY','12','10','BASELINE'));
 assert.equal(summary(old,{item_key:'FEAT-2'}).total_items,1);
 assert.throws(()=>proposeFromActive(old,doc,{id:'CR-NEW',requirement_key:'password-length',before:'10',after:'8',reason:'Owner'}),/LEGACY_SCOPE_REVIEW_REQUIRED/);
});

test('invalid or timezone-less timestamps cannot enter the append-only ledger',()=>{
 const bad=['2026-02-30T10:00:00Z','2026-11-01T10:00:00','2026-11-01','not-a-date'];
 for(const at of bad)assert.throws(()=>appendEvent(HEADER,{...proposal('CR-DATE','old','new','BASELINE'),at}),/INVALID_PROVENANCE/);
 const valid=appendEvent(HEADER,{...proposal('CR-OK','old','new','BASELINE'),at:'2026-11-01T17:00:00+07:00'});
 assert.equal(parseLedger(valid).events.length,1);
});
