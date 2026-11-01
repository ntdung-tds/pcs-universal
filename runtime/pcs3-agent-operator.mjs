/** Optional agent governance operator, using real GitHub issue/comment metadata.
 * A commit updates STATE, readable Moment and audit snapshot as ONE Git commit.
 * This does not bypass branch rules; agents without protected write must open PR.
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {GitHubGovernanceSource,initCollaboration,registerProposal,authorizeDecision,applyDecision} from './pcs3-collaboration.mjs';
import {renderMoment,validateSimple} from './pcs3-simple.mjs';
import {GitHubDeliverySource,applyTechnicalAcceptance,applyOwnerFeedback,recommendNextTasks} from './pcs3-delivery.mjs';
import {assert,sha256,stable,now} from './pcs3-core.mjs';

export class AgentGovernanceOperator extends GitHubGovernanceSource {
  constructor({repo,token,branch='main',fetcher=globalThis.fetch}){
    super({repo,token,fetcher});
    assert(typeof branch==='string'&&branch.length<=150&&branch.split('/').every(part=>part.length>0&&part!=='.'&&part!=='..'&&/^[A-Za-z0-9._-]+$/.test(part)),'invalid branch');this.branch=branch;
  }
  async api(method,path,payload){
    const r=await this.fetcher(`https://api.github.com/repos/${this.repo}${path}`,{method,headers:{Authorization:`Bearer ${this.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify(payload)});
    assert(r.ok,`GITHUB_WRITE_BLOCKED_${r.status}: check branch protection and token permissions; nothing may be marked published`);return r.json();
  }
  async loadSnapshot(){
    const meta=await this.get('');assert(meta.private===true,'project repository must be private for governance state');
    const ref=await this.get(`/git/ref/heads/${encodeURIComponent(this.branch)}`);
    const commit=await this.get(`/git/commits/${ref.object.sha}`);
    const contents=await this.get(`/contents/pcs/STATE.json?ref=${encodeURIComponent(ref.object.sha)}`);
    assert(contents.encoding==='base64'&&typeof contents.content==='string','missing PCS state');
    const doc=JSON.parse(Buffer.from(contents.content.replace(/\s/g,''),'base64').toString('utf8'));
    validateSimple(doc);
    return {doc,sha:ref.object.sha,tree:commit.tree.sha,meta};
  }
  async makeBlob(buffer){const b=await this.api('POST','/git/blobs',{content:Buffer.from(buffer).toString('base64'),encoding:'base64'});assert(b.sha,'blob creation failed');return b.sha;}
  async commitSnapshot(before,updated,{reason,actor}){
    validateSimple(updated);assert(updated.revision===before.doc.revision+1,'revision must advance exactly one');
    const eventName=`MOM-${String(updated.revision).padStart(5,'0')}-${sha256(stable(updated)).slice(0,12)}.json`;
    const event={schema:'pcs3.simple-moment.v1',revision:updated.revision,previous_revision:before.doc.revision,previous_sha256:sha256(stable(before.doc)),state_sha256:sha256(stable(updated)),actor,reason,at:updated.updated_at,state:updated.state};
    const changes=[['pcs/STATE.json',JSON.stringify(updated,null,2)+'\n'],['pcs/MOMENT.md',renderMoment(updated)],['pcs/moments/'+eventName,JSON.stringify(event,null,2)+'\n']];
    const blobs=await Promise.all(changes.map(async ([path,content])=>({path,mode:'100644',type:'blob',sha:await this.makeBlob(content)})));
    const tree=await this.api('POST','/git/trees',{base_tree:before.tree,tree:blobs});
    const commit=await this.api('POST','/git/commits',{message:`PCS governance: ${reason} (r${updated.revision})`,tree:tree.sha,parents:[before.sha]});
    // Non-force branch update rejects stale commits when another agent advanced HEAD.
    try{
      await this.api('PATCH',`/git/refs/heads/${encodeURIComponent(this.branch)}`,{sha:commit.sha,force:false});
    }catch(error){
      // A protected default branch requires a reviewable PR, not a bypass or fake publish.
      if(!String(error).includes('GITHUB_WRITE_BLOCKED_403'))throw error;
      const current=await this.get(`/git/ref/heads/${encodeURIComponent(this.branch)}`);
      assert(current.object?.sha===before.sha,'CONFLICT: default branch changed before PR; reload');
      const reviewBranch='pcs/governance-r'+updated.revision+'-'+commit.sha.slice(0,10);
      await this.api('POST','/git/refs',{ref:'refs/heads/'+reviewBranch,sha:commit.sha});
      const pr=await this.api('POST','/pulls',{title:'PCS governance r'+updated.revision+': '+reason,
        head:reviewBranch,base:this.branch,body:'PCS governance change pending independent review. This PR is NOT an approved or published checkpoint. Validate GitHub identity evidence, project policy and CI before merging.',
        maintainer_can_modify:false});
      assert(pr.number>0,'PR_CREATION_UNVERIFIED');
      return {status:'REVIEW_REQUIRED',revision:updated.revision,proposed_commit:commit.sha,
        pr_number:pr.number,pr_url:pr.html_url,event:eventName,
        warning:'Governance state is NOT active until authorized PR merge and verification.'};
    }
    const confirmed=await this.get(`/git/ref/heads/${encodeURIComponent(this.branch)}`);
    assert(confirmed.object?.sha===commit.sha,'PUBLISH_UNVERIFIED: remote branch did not retain the governance checkpoint');
    return {status:'APPLIED',revision:updated.revision,commit:commit.sha,event:eventName,url:`https://github.com/${this.repo}/commit/${commit.sha}`};
  }
  async bootstrap({expectedRevision,maxAgents=10}){
    const prior=await this.loadSnapshot();assert(prior.doc.revision===expectedRevision,'CONFLICT: reload state');
    assert(prior.meta.owner?.type==='User','org repo requires approved owner allowlist workflow');
    const doc=structuredClone(prior.doc);initCollaboration(doc.state,{repoOwner:prior.meta.owner.login,repoOwnerType:prior.meta.owner.type,maxAgents});
    doc.revision++;doc.updated_at=now();
    return this.commitSnapshot(prior,doc,{actor:prior.meta.owner.login,reason:'initialize agent governance policy'});
  }
  async register({expectedRevision,proposal}){
    const prior=await this.loadSnapshot();assert(prior.doc.revision===expectedRevision,'CONFLICT: reload state');
    const doc=structuredClone(prior.doc);
    await this.registerFromIssue(doc.state,proposal);
    doc.revision++;doc.updated_at=now();
    return this.commitSnapshot(prior,doc,{actor:proposal.github_login,reason:`join request ${proposal.id}`});
  }
  async technicalReview({expectedRevision,taskId,agentId,prNumber}){
    const prior=await this.loadSnapshot();assert(prior.doc.revision===expectedRevision,'CONFLICT: reload state');
    const doc=structuredClone(prior.doc);
    const source=new GitHubDeliverySource({repo:this.repo,token:this.token,fetcher:this.fetcher});
    const proof=await source.technicalEvidence(doc.state,{taskId,agentId,prNumber});
    applyTechnicalAcceptance(doc.state,proof);
    doc.revision++;doc.updated_at=now();
    const result=await this.commitSnapshot(prior,doc,{actor:proof.lead_agent_id,reason:'technical acceptance '+taskId+' PR #'+prNumber});
    return {...result,recommended_next_tasks:result.status==='APPLIED'?recommendNextTasks(doc.state):[]};
  }
  async ownerReview({expectedRevision,issueNumber,commentId,scope,target,reviewedSha}){
    const prior=await this.loadSnapshot();assert(prior.doc.revision===expectedRevision,'CONFLICT: reload state');
    assert(prior.sha===reviewedSha,'STALE_REVIEWED_COMMIT: Owner viewed a different snapshot');
    const doc=structuredClone(prior.doc);
    const source=new GitHubDeliverySource({repo:this.repo,token:this.token,fetcher:this.fetcher});
    const proof=await source.ownerEvidence(doc.state,{issueNumber,commentId,scope,target,reviewedSha,branch:this.branch});
    applyOwnerFeedback(doc.state,proof);
    doc.revision++;doc.updated_at=now();
    return this.commitSnapshot(prior,doc,{actor:proof.actor_login,reason:'owner '+proof.decision+' '+scope+' '+target});
  }
  async decide({expectedRevision,issueNumber,commentId,action,target}){
    const prior=await this.loadSnapshot();assert(prior.doc.revision===expectedRevision,'CONFLICT: reload state');
    const doc=structuredClone(prior.doc);
    const evidence=await this.decisionFromComment(doc.state,{issueNumber,commentId,action,proposalId:target});
    applyDecision(doc.state,evidence);doc.revision++;doc.updated_at=now();
    return this.commitSnapshot(prior,doc,{actor:evidence.actor_login,reason:`${action} ${target}; GitHub comment ${commentId}`});
  }
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2);const cmd=argv[0];const opts={};
  for(const a of argv.slice(1))if(a.startsWith('--')&&a.includes('=')){const i=a.indexOf('=');opts[a.slice(2,i)]=a.slice(i+1);}
  (async()=>{
    const repo=opts.repo??process.env.PCS_GITHUB_REPO,token=process.env.PCS_GITHUB_TOKEN??process.env.GITHUB_TOKEN;
    assert(repo&&token,'PCS_GITHUB_REPO + GitHub token with authorized scope are required');
    const op=new AgentGovernanceOperator({repo,token,branch:opts.branch??'main'});
    if(cmd==='status'){
      const data=await op.loadSnapshot();const c=data.doc.state.collaboration;
      console.log(JSON.stringify({revision:data.doc.revision,lead:c?.lead??null,agents:c?.agents??[],proposals:c?.proposals??[],technical_reviews:data.doc.state.delivery?.technical_reviews??[],owner_feedback:data.doc.state.delivery?.owner_feedback??[],next_tasks:recommendNextTasks(data.doc.state)},null,2));return;
    }
    if(cmd==='bootstrap')return console.log(await op.bootstrap({expectedRevision:Number(opts.expect),maxAgents:opts.max?Number(opts.max):10}));
    if(cmd==='register')return console.log(await op.register({expectedRevision:Number(opts.expect),proposal:JSON.parse(await readFile(opts.proposal,'utf8'))}));
    if(cmd==='decide')return console.log(await op.decide({expectedRevision:Number(opts.expect),issueNumber:Number(opts.issue),commentId:Number(opts.comment),action:opts.action,target:opts.target}));
    if(cmd==='technical-review')return console.log(await op.technicalReview({expectedRevision:Number(opts.expect),taskId:opts.task,agentId:opts.agent,prNumber:Number(opts.pr)}));
    if(cmd==='owner-feedback')return console.log(await op.ownerReview({expectedRevision:Number(opts.expect),issueNumber:Number(opts.issue),commentId:Number(opts.comment),scope:opts.scope,target:opts.target,reviewedSha:opts.sha}));
    throw Error('Usage: status | bootstrap --expect=N | register --expect=N --proposal=... | decide --expect=N --issue=N --comment=N --action=approve|reject|revoke|assign|designate-lead|clear-lead --target=ID | technical-review --expect=N --task=T1 --agent=AGENT02 --pr=N | owner-feedback --expect=N --issue=N --comment=N --scope=feature|flow|release --target=ID --sha=40HEX');
  })().catch(e=>{console.error('PCS AGENT GOVERNANCE:',e.message);process.exitCode=1;});
}
