#!/usr/bin/env node
// Read-only configuration assessment. Requires GitHub API access; UNKNOWN != PASS.
const API='https://api.github.com';
export async function assessGitHubSecurity({repo,token,branch=null,fetcher=globalThis.fetch}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo||''))throw Error('PCS_GITHUB_REPO must be OWNER/REPO');
 if(!token)throw Error('GitHub read credential required in PCS_GITHUB_TOKEN/GITHUB_TOKEN');
 const head={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'};
 async function query(path){try{const r=await fetcher(`${API}/repos/${repo}${path}`,{headers:head});if(!r.ok)return {status:'UNKNOWN',http_status:r.status};if(r.status===204)return {status:'ENABLED'};return {status:'OBSERVED',data:await r.json()};}catch{return {status:'UNKNOWN',reason:'network_error'};}}
 const base=await query('');if(base.status!=='OBSERVED')return {repo,overall:'UNKNOWN',repository:base};
 const b=branch||base.data.default_branch;
 const [protection,rulesets,actions,codeql,vulnerability]=await Promise.all([
  query(`/branches/${encodeURIComponent(b)}/protection`),
  query('/rulesets?includes_parents=true'),
  query('/actions/permissions/workflow'),
  query('/code-scanning/default-setup'),
  query('/vulnerability-alerts')
 ]);
 const privateRepo=base.data.private===true;
 const hasRuleArray=rulesets.status==='OBSERVED'&&Array.isArray(rulesets.data);
 const activeRules=hasRuleArray?rulesets.data.filter(x=>x.enforcement==='active').length:null;
 const protectedBranch=protection.status==='OBSERVED'||base.data?.default_branch===b&&base.data?.default_branch_protected===true;
 return {repo,branch:b,overall:privateRepo?'REVIEW_REQUIRED':'FAIL_PUBLIC_REPO',checks:{
  private_repository:{status:privateRepo?'PASS':'FAIL'},
  protected_branch:{status:protectedBranch?'OBSERVED':protection.http_status===404?'NOT_VERIFIED':'UNKNOWN',http_status:protection.http_status??null},
  active_rulesets:{status:hasRuleArray?'OBSERVED':'UNKNOWN',count:activeRules},
  workflow_permissions:{status:actions.status==='OBSERVED'?'OBSERVED':'UNKNOWN',default_workflow_permissions:actions.data?.default_workflow_permissions??null},
  codeql_setup:{status:codeql.status==='OBSERVED'?'OBSERVED':'UNKNOWN',state:codeql.data?.state??null},
  vulnerability_alerts:{status:vulnerability.status==='ENABLED'?'ENABLED':'UNKNOWN',http_status:vulnerability.http_status??null},
  secret_scanning_and_push_protection:{status:'NOT_VERIFIED',note:'Must inspect repo Settings / Security / Advanced Security; licensing and permissions vary'},
  mfa_and_owner_review:{status:'NOT_VERIFIED',note:'Requires org/user controls and authenticated human review'}
 }};
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
 const repo=process.env.PCS_GITHUB_REPO,token=process.env.PCS_GITHUB_TOKEN||process.env.GITHUB_TOKEN;
 try{const res=await assessGitHubSecurity({repo,token,branch:process.env.PCS_GITHUB_BRANCH});console.log(JSON.stringify(res,null,2));if(res.overall==='FAIL_PUBLIC_REPO')process.exitCode=2;}
 catch(e){console.error('Security doctor failed:',e.message);process.exitCode=1;}
}
