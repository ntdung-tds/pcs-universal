import test from 'node:test';import assert from 'node:assert/strict';
import {GitHubIssueAdapter} from '../runtime/pcs3-issues.mjs';
import {emptyState} from '../runtime/pcs3-core.mjs';
const s=()=>{const x=emptyState('project-x','Project X');x.tasks=[{id:'T1',title:'Build API',status:'PLANNED'}];return x};
function mock(issues=[]){const calls=[];const fetcher=async(url,o)=>{calls.push({url,method:o.method||'GET'});return {ok:true,json:async()=>o.method==='POST'?{number:12,html_url:'https://github.com/o/r/issues/12'}:issues}};return {adapter:new GitHubIssueAdapter({repo:'o/r',token:'test',fetcher}),calls};}
test('preview mode never creates issues',async()=>{const m=mock();const out=await m.adapter.sync(s());assert.equal(out.pending_create.length,1);assert(m.calls.every(x=>x.method==='GET'))});
test('existing marker yields link without issue creation',async()=>{const m=mock([{number:7,body:'<!-- pcs-task:T1 -->',html_url:'https://github.com/o/r/issues/7'}]);const out=await m.adapter.sync(s(),{apply:true});assert.equal(out.links[0].number,7);assert(m.calls.every(x=>x.method==='GET'))});
test('multiple issues for same task fail closed',async()=>{const m=mock([{body:'<!-- pcs-task:T1 -->'},{body:'<!-- pcs-task:T1 -->'}]);await assert.rejects(m.adapter.sync(s(),{apply:true}),/ISSUE_DUPLICATE/)});
test('apply creates exactly one issue when absent',async()=>{const m=mock();const out=await m.adapter.sync(s(),{apply:true});assert.equal(out.links[0].issue_url,'https://github.com/o/r/issues/12');assert.equal(m.calls.filter(x=>x.method==='POST').length,1)});
test('no permission does not silently claim success',async()=>{const a=new GitHubIssueAdapter({repo:'o/r',token:'x',fetcher:async()=>({ok:false,status:403})});await assert.rejects(a.sync(s(),{apply:true}),/HTTP 403/)});
