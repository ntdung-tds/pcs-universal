/** Optional GitHub Issues adapter for PCS Simple Mode.
 * PCS state is canonical for acceptance; Issues are for tracking and discussion.
 * Preview-only unless --apply=true. Does not silently edit PCS state.
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assert} from './pcs3-core.mjs';
import {validateSimple,planIssueSync} from './pcs3-simple.mjs';

export class GitHubIssueAdapter {
  constructor({repo,token,fetcher=globalThis.fetch}){
    assert(/^[\w.-]+\/[\w.-]+$/.test(repo||''),'repo must be OWNER/REPO');
    assert(token,'GitHub token required for issue sync');
    this.repo=repo;this.token=token;this.fetcher=fetcher;
  }
  headers(){return {Authorization:`Bearer ${this.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};}
  url(s){return `https://api.github.com/repos/${this.repo}/issues${s}`;}
  async request(url,opts={}){
    const r=await this.fetcher(url,{...opts,headers:{...this.headers(),...opts.headers}});
    if(!r.ok)throw Error(`GitHub Issues HTTP ${r.status}; review permissions and retry without creating duplicate`);
    return r.json();
  }
  async listAll({maxPages=30}={}){
    const out=[];
    for(let page=1;page<=maxPages;page++){
      const rows=await this.request(this.url(`?state=all&per_page=100&page=${page}`));
      assert(Array.isArray(rows),'GitHub issues list invalid');
      out.push(...rows.filter(x=>!x.pull_request));
      if(rows.length<100)return out;
    }
    throw Error('ISSUE_SCAN_INCOMPLETE: too many Issues; refuse to create duplicates without full scan');
  }
  async sync(state,{apply=false}={}){
    const plans=planIssueSync(state);const existing=await this.listAll();
    const links=[],creates=[];
    for(const p of plans){
      const marker=`<!-- pcs-task:${p.id} -->`;
      const matches=existing.filter(i=>(i.body||'').includes(marker));
      if(matches.length>1)throw Error(`ISSUE_DUPLICATE: task ${p.id} mapped to multiple GitHub Issues`);
      if(matches.length===1){links.push({task_id:p.id,issue_url:matches[0].html_url,number:matches[0].number,created:false});continue;}
      if(!apply){creates.push({task_id:p.id,title:p.title});continue;}
      const issue=await this.request(this.url(''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:p.title,body:p.body})});
      assert(issue.number&&issue.html_url,'Issue created but response not verifiable');
      links.push({task_id:p.id,issue_url:issue.html_url,number:issue.number,created:true});
    }
    return {links,pending_create:creates,warning:'Commit github_issue links back into pcs/STATE.json using SHA/expected revision. GitHub issue closure is not PCS acceptance.'};
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  (async()=>{
    const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)]}));
    const doc=JSON.parse(await readFile(args.state||'pcs/STATE.json','utf8'));validateSimple(doc);
    const r=await new GitHubIssueAdapter({repo:args.repo||process.env.PCS_GITHUB_REPO,token:process.env.PCS_GITHUB_TOKEN||process.env.GITHUB_TOKEN}).sync(doc.state,{apply:args.apply==='true'});
    console.log(JSON.stringify(r,null,2));
  })().catch(e=>{console.error('PCS ISSUES ERROR:',e.message);process.exitCode=1});
}
