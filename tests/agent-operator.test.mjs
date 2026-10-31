import test from 'node:test';
import assert from 'node:assert/strict';
import {AgentGovernanceOperator} from '../runtime/pcs3-agent-operator.mjs';
import {makeSimpleState} from '../runtime/pcs3-simple.mjs';
import {initCollaboration} from '../runtime/pcs3-collaboration.mjs';

function fixture({race=false,deny=false}={}){
  const doc=makeSimpleState('website-demo','Demo');
  doc.state.tasks=[{id:'T1',status:'PLANNED',title:'Homepage'}];initCollaboration(doc.state,{repoOwner:'alice'});
  doc.state.collaboration.agents.push({id:'AGENT01',provider:'ChatGPT',github_login:'worker',status:'REQUESTED',capabilities:['web'],joined_at:null});
  doc.state.collaboration.proposals.push({id:'JOIN01',agent_id:'AGENT01',mode:'SELF_PROPOSED',risk:'NORMAL',issue_number:10,summary:'Can build homepage',suggested_tasks:['T1'],status:'PENDING',created_at:'2026-01-01T00:00:00Z',decision:null});
  const calls=[], head='a'.repeat(40); let current=head, counter=0;
  const meta={full_name:'alice/project',private:true,owner:{login:'alice',type:'User'}};
  const responder=async(url,opts={})=>{
    const path=new URL(url).pathname.replace('/repos/alice/project',''); const method=opts.method??'GET';calls.push({method,path,body:opts.body?JSON.parse(opts.body):null});
    let data={};let status=200;
    if(path==='')data=meta;
    else if(path==='/git/ref/heads/main'&&method==='GET')data={object:{sha:current}};
    else if(path.startsWith('/git/commits/')&&method==='GET')data={tree:{sha:'b'.repeat(40)}};
    else if(path.startsWith('/contents/pcs/STATE.json')&&method==='GET')data={encoding:'base64',content:Buffer.from(JSON.stringify(doc)).toString('base64')};
    else if(path==='/issues/10')data={number:10,user:{login:'worker'},body:'<!-- pcs-agent-join:JOIN01 -->'};
    else if(path==='/issues/comments/99')data={id:99,user:{login:'alice'},body:'/pcs approve JOIN01',issue_url:'https://api.github.com/repos/alice/project/issues/10'};
    else if(path==='/git/blobs'&&method==='POST')data={sha:`blob${++counter}`};
    else if(path==='/git/trees'&&method==='POST')data={sha:'c'.repeat(40)};
    else if(path==='/git/commits'&&method==='POST'){data={sha:'d'.repeat(40)};if(race)current='e'.repeat(40);}
    else if(path==='/git/refs/heads/main'&&method==='PATCH'){
      if(deny)status=403;
      else if(current!==head)status=422;
      else{assert.equal(JSON.parse(opts.body).force,false);current=JSON.parse(opts.body).sha;data={ref:'refs/heads/main'};}
    }else throw Error('mock unexpected route '+method+' '+path);
    return new Response(JSON.stringify(data),{status});
  };
  return {fetcher:responder,calls,doc,getHead:()=>current};
}
test('agent operator performs authenticated GitHub comment approval as atomic 3-file commit',async()=>{
  const f=fixture();const o=new AgentGovernanceOperator({repo:'alice/project',token:'token',fetcher:f.fetcher});
  const result=await o.decide({expectedRevision:1,issueNumber:10,commentId:99,action:'approve',target:'JOIN01'});
  assert.equal(result.revision,2);assert.equal(result.commit,'d'.repeat(40));
  assert.equal(f.calls.filter(x=>x.path==='/git/blobs'&&x.method==='POST').length,3);
  const tree=f.calls.find(x=>x.path==='/git/trees'&&x.method==='POST').body;
  assert.deepEqual(tree.tree.map(x=>x.path).sort(),['pcs/MOMENT.md','pcs/STATE.json','pcs/moments/'+result.event].sort());
  assert.equal(f.getHead(),'d'.repeat(40));
});
test('optimistic checkpoint: stale writer cannot push over another writer',async()=>{
  const f=fixture({race:true});const o=new AgentGovernanceOperator({repo:'alice/project',token:'token',fetcher:f.fetcher});
  await assert.rejects(()=>o.decide({expectedRevision:1,issueNumber:10,commentId:99,action:'approve',target:'JOIN01'}),/GITHUB_WRITE_BLOCKED_422/);
  assert.equal(f.getHead(),'e'.repeat(40));
});
test('branch rules 403 causes no claim of published governance',async()=>{
  const f=fixture({deny:true});const o=new AgentGovernanceOperator({repo:'alice/project',token:'token',fetcher:f.fetcher});
  await assert.rejects(()=>o.decide({expectedRevision:1,issueNumber:10,commentId:99,action:'approve',target:'JOIN01'}),/GITHUB_WRITE_BLOCKED_403/);
});
test('expected revision is mandatory to avoid silent overwrite',async()=>{
  const f=fixture();const o=new AgentGovernanceOperator({repo:'alice/project',token:'token',fetcher:f.fetcher});
  await assert.rejects(()=>o.decide({expectedRevision:5,issueNumber:10,commentId:99,action:'approve',target:'JOIN01'}),/CONFLICT/);
  assert.equal(f.calls.filter(x=>x.method==='POST').length,0);
});
