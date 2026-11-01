import test from 'node:test';
import assert from 'node:assert/strict';
import {GitHubBranchGuard,PCS_RULESET_NAME} from '../runtime/pcs3-branch-guard.mjs';
import {runBranchGuard} from '../tools/pcs-branch-guard.mjs';

const owner='alice',repo='alice/sample';
const sha='a'.repeat(40);
function fixture(options={}){
  const o={actor:'bot-operator',classic:404,rulesets:[],active:[],forbid:false,
    planChange:false,rejectWrite:false,readBlocked:false,allowBadReadback:false,
    head:sha,private:true,...options};
  let created=null,writeCount=0,inspections=0;
  const calls=[];
  const respond=async(url,opts={})=>{
    const u=new URL(url),method=opts.method||'GET',
      path=u.pathname.replace('/repos/'+repo,'')+u.search;
    calls.push({method,path,body:opts.body?JSON.parse(opts.body):undefined});
    let status=200,data;
    if(path==='')data={full_name:repo,default_branch:'main',owner:{type:'User',login:owner},private:o.private};
    else if(path==='/git/ref/heads/main'){
      inspections++;
      data={object:{sha:o.planChange&&inspections>=2?'b'.repeat(40):o.head}};
    }
    else if(path==='/rulesets?includes_parents=true&per_page=100'){
      status=o.readBlocked?403:200;
      data=created?[{id:103,name:PCS_RULESET_NAME,enforcement:'active',source_type:'Repository'}]:o.rulesets;
    }
    else if(path==='/rules/branches/main?per_page=100'){
      status=o.readBlocked?403:200;
      data=created&&!o.allowBadReadback?created.rules.map(r=>({type:r.type,ruleset_id:103})):o.active;
    }
    else if(path==='/branches/main/protection'){status=o.classic;data=status===200?{enabled:true}:{};}
    else if(path==='/issues/10')data={number:10,body:'<!-- pcs-branch-guard -->'};
    else if(path==='/issues/comments/20'){
      const cmd=o.command||'/pcs protect-default '+repo+' '+o.digest;
      data={id:20,user:{login:o.approver||owner},body:cmd,
        issue_url:'https://api.github.com/repos/'+repo+'/issues/'+(o.badIssue?11:10)};
    }
    else if(u.pathname==='/user'){status=o.identityBlocked?403:200;data={login:o.actor};}
    else if(path==='/rulesets'&&method==='POST'){
      writeCount++;status=o.rejectWrite?403:201;
      if(status===201){created=JSON.parse(opts.body);data={id:103,...created};}
      else data={message:'Resource not accessible by integration'};
    }
    else if(path==='/rulesets/103'){status=o.allowBadReadback?403:200;data={id:103,...created};}
    else throw Error('Unexpected GitHub mock endpoint '+method+' '+path);
    return new Response(JSON.stringify(data||{}),{status});
  };
  return {fetcher:respond,calls,getWrites:()=>writeCount,getCreated:()=>created,o};
}
function guard(f){return new GitHubBranchGuard({repo,token:'not-real-token',fetcher:f.fetcher});}
async function approved(f){
  const p=await guard(f).inspect();
  f.o.digest=p.plan_sha256;
  return p;
}
test('read-only plan identifies default branch and exact Owner command without writes',async()=>{
  const f=fixture(),p=await guard(f).inspect();
  assert.equal(p.status,'OWNER_APPROVAL_REQUIRED');
  assert.equal(p.default_branch,'main');
  assert.match(p.plan_sha256,/^[a-f0-9]{64}$/);
  assert.match(p.approved_command,/^\/pcs protect-default alice\/sample [a-f0-9]{64}$/);
  assert.equal(f.getWrites(),0);
});
test('plans only safe baseline: PR, no force-push/delete and no misleading required CI',async()=>{
  const f=fixture(),p=await guard(f).inspect();
  assert.deepEqual(p.proposed_ruleset.rules.map(x=>x.type),
    ['deletion','non_fast_forward','pull_request']);
  const pr=p.proposed_ruleset.rules.find(x=>x.type==='pull_request');
  assert.equal(pr.parameters.required_approving_review_count,0);
  assert.equal(p.proposed_ruleset.enforcement,'active');
  assert.deepEqual(p.proposed_ruleset.bypass_actors,[]);
});
test('already-protected branch does not receive duplicate ruleset',async()=>{
  const f=fixture({active:['deletion','non_fast_forward','pull_request'].map(type=>({type}))});
  assert.equal((await guard(f).inspect()).status,'ALREADY_PROTECTED');
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),/NOT_SAFE_TO_APPLY/);
  assert.equal(f.getWrites(),0);
});
test('existing classical protection never overwritten',async()=>{
  const f=fixture({classic:200});
  assert.equal((await guard(f).inspect()).status,'EXISTING_POLICY_REVIEW');
  assert.equal(f.getWrites(),0);
});
test('existing partial rules require review instead of mutating someone else ruleset',async()=>{
  const f=fixture({active:[{type:'deletion',ruleset_id:5}]});
  assert.equal((await guard(f).inspect()).status,'EXISTING_POLICY_REVIEW');
});
test('unrelated existing repository ruleset triggers safe review before adding managed one',async()=>{
  const f=fixture({rulesets:[{id:4,name:'team',enforcement:'active',source_type:'Repository'}]});
  assert.equal((await guard(f).inspect()).status,'EXISTING_POLICY_REVIEW');
});
test('inaccessible protection policy cannot be mistaken for unprotected',async()=>{
  const f=fixture({classic:403});
  assert.equal((await guard(f).inspect()).status,'INSPECTION_BLOCKED');
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),/NOT_SAFE_TO_APPLY/);
});
test('metadata-only rulesets access not available fails safely',async()=>{
  const f=fixture({readBlocked:true});
  assert.equal((await guard(f).inspect()).status,'INSPECTION_BLOCKED');
});
test('correct Owner approval and separate admin agent applies ruleset and reads effective rules',async()=>{
  const f=fixture();await approved(f);
  const r=await guard(f).apply({issueNumber:10,commentId:20});
  assert.equal(r.status,'APPLIED_VERIFIED');
  assert.equal(r.ruleset_id,103);
  assert.equal(f.getWrites(),1);
  assert.equal(f.getCreated().name,PCS_RULESET_NAME);
  assert.deepEqual(f.getCreated().conditions.ref_name.include,['refs/heads/main']);
  assert.equal((await guard(f).inspect()).status,'ALREADY_PROTECTED');
});
test('GitHub Owner login cannot act as independent bot operator on same token',async()=>{
  const f=fixture({actor:owner});await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /SHARED_OWNER_TOKEN_NOT_INDEPENDENT/);
  assert.equal(f.getWrites(),0);
});
test('untrusted comment author cannot approve',async()=>{
  const f=fixture({approver:'worker'});await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /ONLY_GITHUB_OWNER/);
});
test('wrong comment plan digest cannot approve',async()=>{
  const f=fixture({command:'/pcs protect-default alice/sample '+'f'.repeat(64)});
  await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /OWNER_APPROVAL_PLAN_MISMATCH/);
});
test('comment on different Issue cannot approve',async()=>{
  const f=fixture({badIssue:true});await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /OWNER_APPROVAL_COMMENT_WRONG_ISSUE/);
});
test('plan changed after Owner consent means no write and fresh Owner approval',async()=>{
  const f=fixture({planChange:true});await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /OWNER_APPROVAL_PLAN_MISMATCH|STALE_BRANCH_PLAN/);
  assert.equal(f.getWrites(),0);
});
test('missing Administration write permission fails without claiming success',async()=>{
  const f=fixture({rejectWrite:true});await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /GITHUB_ADMIN_WRITE_BLOCKED_403/);
});
test('created but not fully verifiable protection does not report success',async()=>{
  const f=fixture({allowBadReadback:true});await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /RULESET_CREATED_BUT_UNVERIFIED/);
  assert.equal(f.getWrites(),1);
});
test('cannot use unavailable caller identity to claim verified Owner independence',async()=>{
  const f=fixture({identityBlocked:true});await approved(f);
  await assert.rejects(()=>guard(f).apply({issueNumber:10,commentId:20}),
    /GITHUB_INSPECTION_BLOCKED_403 identity/);
});
test('CLI plan remains read only',async()=>{
  const f=fixture();const p=await runBranchGuard({
    command:'plan',repo,token:'token',fetcher:f.fetcher
  });
  assert.equal(p.status,'OWNER_APPROVAL_REQUIRED');
  assert.equal(f.getWrites(),0);
  assert.equal(p.repository,repo);
});
test('unexpected branch name is not guessed from main',async()=>{
  const f=fixture();const original=f.fetcher;
  f.fetcher=(url,opts)=>url.endsWith('/repos/alice/sample')
    ? Promise.resolve(new Response(JSON.stringify({full_name:repo,default_branch:'new-main',
      owner:{type:'User',login:owner}}),{status:200}))
    : original(url,opts);
  await assert.rejects(()=>guard(f).inspect(),/Unexpected GitHub mock endpoint/);
  assert.equal(f.getWrites(),0);
});
