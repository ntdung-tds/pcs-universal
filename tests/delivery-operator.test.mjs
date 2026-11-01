import test from 'node:test';
import assert from 'node:assert/strict';
import {AgentGovernanceOperator} from '../runtime/pcs3-agent-operator.mjs';
import {makeSimpleState} from '../runtime/pcs3-simple.mjs';
import {initCollaboration} from '../runtime/pcs3-collaboration.mjs';

const head='a'.repeat(40),prsha='b'.repeat(40),mergedSha='c'.repeat(40),written='d'.repeat(40);
function makeFixture({taskReview=false}={}){
  const doc=makeSimpleState('demo-app','Demo');
  doc.state.releases=[{id:'R1',status:'IN_PROGRESS',title:'Release'}];
  if(taskReview){
    doc.state.tasks=[{id:'T1',status:'TECH_DONE',risk:'NORMAL'},
      {id:'T2',status:'PLANNED',dependencies:['T1'],risk:'NORMAL'}];
    initCollaboration(doc.state,{repoOwner:'alice'});
    const c=doc.state.collaboration;
    c.agents=[
      {id:'LEAD01',provider:'GPT',github_login:'lead',status:'IDLE',capabilities:[],joined_at:null},
      {id:'WORK01',provider:'Claude',github_login:'worker',status:'ACTIVE',capabilities:[],joined_at:null}
    ];
    c.lead_epoch=1;c.lead={agent_id:'LEAD01',github_login:'lead',epoch:1,
      expires_at:'2099-01-01T00:00:00Z',
      delegation:{authority:'OWNER',actor_login:'alice',action:'designate-lead',proposalId:'LEAD01'}};
    c.assignments=[{task_id:'T1',agent_id:'WORK01',proposal_id:'J1',at:'2026-10-01T00:00:00Z'}];
  }
  let current=head,counter=0;const calls=[];
  const fetcher=async(url,options={})=>{
    const u=new URL(url),method=options.method||'GET',
      path=u.pathname.replace('/repos/alice/project','')+u.search;
    calls.push({method,path,body:options.body?JSON.parse(options.body):null});
    let data,status=200;
    if(path==='')data={full_name:'alice/project',private:true,default_branch:'main',owner:{login:'alice',type:'User'}};
    else if(path==='/git/ref/heads/main')data={object:{sha:current}};
    else if(path==='/git/commits/'+current)data={tree:{sha:'e'.repeat(40)}};
    else if(path.startsWith('/contents/pcs/STATE.json'))data={encoding:'base64',content:Buffer.from(JSON.stringify(doc)).toString('base64')};
    else if(path==='/issues/80')data={number:80,body:'<!-- pcs-owner-review:release:R1 -->'};
    else if(path==='/issues/comments/77')data={id:77,user:{login:'alice'},
      body:'/pcs agree release R1 '+head,
      issue_url:'https://api.github.com/repos/alice/project/issues/80'};
    else if(path==='/pulls/7')data={number:7,merged:true,merged_at:'2026-11-01T01:00:00Z',
      body:'<!-- pcs-task:T1 -->',user:{login:'worker'},head:{sha:prsha},
      base:{ref:'main',repo:{full_name:'alice/project'}},merge_commit_sha:mergedSha};
    else if(path==='/pulls/7/reviews?per_page=100')data=[{id:42,user:{login:'lead'},state:'APPROVED',
      commit_id:prsha,submitted_at:'2026-11-01T01:01:00Z'}];
    else if(path==='/commits/'+prsha+'/check-runs?per_page=100')data={
      total_count:1,check_runs:[{status:'completed',conclusion:'success'}]};
    else if(method==='POST'&&path==='/git/blobs')data={sha:'blob'+(++counter)};
    else if(method==='POST'&&path==='/git/trees')data={sha:'f'.repeat(40)};
    else if(method==='POST'&&path==='/git/commits')data={sha:written};
    else if(method==='PATCH'&&path==='/git/refs/heads/main'){
      assert.equal(JSON.parse(options.body).force,false);
      current=written;data={ref:'refs/heads/main'};
    }else throw Error('Unexpected mock endpoint '+method+' '+path);
    return new Response(JSON.stringify(data),{status});
  };
  return {doc,calls,fetcher,getHead:()=>current};
}
test('3.1 operator: verifies GitHub Lead PR review and checkpoint as one Git commit',async()=>{
  const f=makeFixture({taskReview:true});
  const op=new AgentGovernanceOperator({repo:'alice/project',token:'mock',fetcher:f.fetcher});
  const result=await op.technicalReview({expectedRevision:1,taskId:'T1',agentId:'WORK01',prNumber:7});
  assert.equal(result.status,'APPLIED');
  assert.equal(result.revision,2);
  assert.deepEqual(result.recommended_next_tasks.map(x=>x.task_id),['T2']);
  assert.equal(f.getHead(),written);
  assert.equal(f.calls.filter(x=>x.method==='POST'&&x.path==='/git/blobs').length,3);
});
test('3.1 operator: verifies GitHub Owner comment bound to reviewed head',async()=>{
  const f=makeFixture();
  const op=new AgentGovernanceOperator({repo:'alice/project',token:'mock',fetcher:f.fetcher});
  const result=await op.ownerReview({expectedRevision:1,issueNumber:80,commentId:77,
    scope:'release',target:'R1',reviewedSha:head});
  assert.equal(result.status,'APPLIED');assert.equal(result.revision,2);
  assert.equal(f.getHead(),written);
  assert.equal(f.calls.filter(x=>x.method==='POST'&&x.path==='/git/blobs').length,3);
});
test('3.1 operator: outdated user-reviewed commit is rejected before writes',async()=>{
  const f=makeFixture();
  const op=new AgentGovernanceOperator({repo:'alice/project',token:'mock',fetcher:f.fetcher});
  await assert.rejects(()=>op.ownerReview({expectedRevision:1,issueNumber:80,commentId:77,
    scope:'release',target:'R1',reviewedSha:'0'.repeat(40)}),/STALE_REVIEWED_COMMIT/);
  assert.equal(f.calls.filter(x=>x.method==='POST').length,0);
});
