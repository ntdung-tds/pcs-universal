import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveRequirements} from '../tools/pcs-change-control.mjs';
const h='a'.repeat(64);
const record=(id,status,based_on='BASELINE',item_id='FEAT-001')=>({
 id,item_id,status,based_on,baseline_ref:'docs/srs.md#3-2',baseline_sha256:h,
 ...(status==='APPROVED'?{final_ref:'docs/project/changes/'+id+'.md',final_sha256:'b'.repeat(64),
   decision:{by:'owner',ref:'https://github.com/example/repo/issues/1#issuecomment-10'}}:{})
});
test('multiple proposed versions never replace last approved final',()=>{
 const records=[record('CR-001','APPROVED'),record('CR-002','APPROVED','CR-001'),
  record('CR-003','PROPOSED','CR-002')];
 const out=effectiveRequirements(records,{itemId:'FEAT-001'});
 assert.equal(out.items[0].effective_change_id,'CR-002');
 assert.equal(out.items[0].pending_count,1);
 assert.equal(out.items[0].approved_count,2);
 assert.equal(out.items[0].approval_externally_verified,false);
});
test('reject an ambiguous second approved final and stale baseline',()=>{
 assert.throws(()=>effectiveRequirements([record('CR-001','APPROVED'),record('CR-002','APPROVED')]),/AMBIGUOUS/);
 const wrong=record('CR-002','APPROVED','CR-001');wrong.baseline_sha256='c'.repeat(64);
 assert.throws(()=>effectiveRequirements([record('CR-001','APPROVED'),wrong]),/BASELINE_MISMATCH/);
});
test('rejected proposals remain in history without altering effective',()=>{
 const output=effectiveRequirements([record('CR-001','APPROVED'),record('CR-002','REJECTED','CR-001'),
  record('CR-003','PROPOSED','BASELINE')]);
 assert.equal(output.items[0].effective_change_id,'CR-001');
 assert.deepEqual(output.items[0].stale_proposals,['CR-003']);
 assert.equal(output.items[0].rejected_count,1);
});
test('unverified or missing approval source fails closed',()=>{
 const a=record('CR-001','APPROVED');delete a.decision;
 assert.throws(()=>effectiveRequirements([a]),/APPROVAL_EVIDENCE_FIELDS_REQUIRED/);
 assert.throws(()=>effectiveRequirements([record('CR-002','APPROVED','CR-999')]),/UNAPPROVED_PREDECESSOR/);
 assert.throws(()=>effectiveRequirements([record('CR-001','PROPOSED'),record('CR-001','PROPOSED')]),/DUPLICATE/);
});
test('read-only, bounded output and missing records',()=>{
 const a=record('CR-001','APPROVED');a.free_text='Private secret 123';
 const before=JSON.stringify(a),out=effectiveRequirements([a],{limit:1});
 assert.ok(!JSON.stringify(out).includes('Private secret 123'));
 assert.equal(JSON.stringify(a),before);
 assert.equal(effectiveRequirements([],{itemId:'FEAT-001'}).items.length,0);
 assert.throws(()=>effectiveRequirements([],{limit:0}),/INVALID_LIMIT/);
});
