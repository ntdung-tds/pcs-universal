#!/usr/bin/env node
// A single read. No sleep, polling, auto-retry or duplicate submissions.
import {GitHubStore} from './pcs3-core.mjs';
import {requestStatus} from './pcs3-inbox.mjs';
const args=Object.fromEntries(process.argv.slice(2).filter(s=>s.startsWith('--')&&s.includes('=')).map(s=>{const i=s.indexOf('=');return [s.slice(2,i),s.slice(i+1)];}));
if(!args.request)throw Error('Usage: node runtime/pcs3-inbox-status.mjs --request=REQ-id.json [--project=slug]');
const repo=process.env.PCS_GITHUB_REPO||process.env.GITHUB_REPOSITORY;
const token=process.env.PCS_GITHUB_TOKEN||process.env.GITHUB_TOKEN;
const github=new GitHubStore({repo,token,branch:process.env.PCS_GITHUB_BRANCH||'main'});
const inboxGithub=new GitHubStore({repo:process.env.PCS_INBOX_REPO||repo,token:process.env.PCS_INBOX_TOKEN||token,branch:process.env.PCS_INBOX_BRANCH||process.env.PCS_GITHUB_BRANCH||'main'});
console.log(JSON.stringify(await requestStatus({github,inboxGithub,filename:args.request,project:args.project||null}),null,2));
