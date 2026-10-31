import test from 'node:test';import assert from 'node:assert/strict';
import {createGateway} from '../runtime/pcs3-gateway.mjs';
import {PCS3,sha256} from '../runtime/pcs3-core.mjs';
function fake(){const m=new Map();const github={async health(){return {full_name:'private/test',private:true}},async getFile(p){const b=m.get(p);return b?{buffer:b,sha:sha256(b)}:null},async putFile(p,b,old){const cur=m.get(p);if(cur && sha256(cur)!==old)throw Error('CONFLICT');m.set(p,Buffer.from(b));},async putImmutable(p,b){if(m.has(p))throw Error('EXISTS');m.set(p,Buffer.from(b));}};return {github,pcs:new PCS3({github})};}
test('gateway blocks unauthorized and supports create/resume/checkpoint',async()=>{
 const {github,pcs}=fake(),secret='S'.repeat(30),server=createGateway({github,pcs,secret});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const url=`http://127.0.0.1:${server.address().port}`;let r=await fetch(url+'/projects');assert.equal(r.status,401);
   r=await fetch(url+'/projects',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({slug:'demo-1',name:'Demo'})});assert.equal(r.status,201);
   r=await fetch(url+'/projects/demo-1/resume',{headers:{Authorization:`Bearer ${secret}`}});assert.equal((await r.json()).revision,1);
   r=await fetch(url+'/projects/demo-1/state',{headers:{Authorization:`Bearer ${secret}`}});const data=await r.json();
   data.state.current.next_action='Develop UI';r=await fetch(url+'/projects/demo-1/checkpoint',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({expected_revision:1,state:data.state})});assert.equal(r.status,200);
   r=await fetch(url+'/projects/demo-1/verify',{headers:{Authorization:`Bearer ${secret}`}});assert.equal((await r.json()).moments,2);
   r=await fetch(url+'/projects/demo-1/checkpoint',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({expected_revision:1,state:data.state})});assert.equal(r.status,409);
 }finally{await new Promise(r=>server.close(r));}
});
test('gateway minimum secret required',()=>{const {github,pcs}=fake();assert.throws(()=>createGateway({github,pcs,secret:'short'}),/24/);});
