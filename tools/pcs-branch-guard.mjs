/** Optional CLI for trusted coding agents with secure token storage.
 * No writes without Owner-approved plan and separate admin-capable principal.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {GitHubBranchGuard} from '../runtime/pcs3-branch-guard.mjs';

export async function runBranchGuard({command,repo,token,issue,comment,fetcher}={}){
  const guard=new GitHubBranchGuard({repo,token,fetcher});
  if(command==='plan'||command==='inspect'||command==='verify'){
    const plan=await guard.inspect();
    return {status:plan.status,repository:plan.repo,default_branch:plan.default_branch,
      head_sha:plan.head_sha,existing_rule_types:plan.existing_rule_types,
      rulesets_visible:plan.rulesets_visible,
      plan_sha256:plan.plan_sha256,owner_approval_command:plan.approved_command,
      proposed_ruleset:plan.proposed_ruleset,explanation:plan.explanation};
  }
  if(command==='apply'){
    return guard.apply({issueNumber:Number(issue),commentId:Number(comment)});
  }
  throw Error('Usage: plan | verify | apply --issue=N --comment=N');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2),args={};
  for(const a of argv.slice(1))if(a.startsWith('--')&&a.includes('=')){
    const idx=a.indexOf('=');args[a.slice(2,idx)]=a.slice(idx+1);
  }
  runBranchGuard({
    command:argv[0],repo:args.repo||process.env.PCS_GITHUB_REPO,
    token:process.env.PCS_GITHUB_TOKEN||process.env.GITHUB_TOKEN,
    issue:args.issue,comment:args.comment
  }).then(v=>console.log(JSON.stringify(v,null,2)))
    .catch(e=>{console.error('PCS BRANCH GUARD:',e.message);process.exitCode=1;});
}
