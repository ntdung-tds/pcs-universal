#!/usr/bin/env node
// Deterministic PCS baseline guard. Not a substitute for GitHub secret scanning/CodeQL/SAST.
import {readdir,readFile,lstat} from 'node:fs/promises';
import {join,relative,extname,basename} from 'node:path';
import {findHighConfidenceSecrets} from '../runtime/pcs3-security.mjs';

const root=process.argv.find(x=>x.startsWith('--root='))?.slice(7)||process.cwd();
const SKIP=new Set(['.git','node_modules','.venv','dist','build','coverage','__pycache__']);
const TEXT=new Set(['.md','.txt','.mjs','.js','.cjs','.ts','.tsx','.jsx','.json','.jsonl','.yml','.yaml','.sh','.py','.html','.css','.toml','.env','.gitignore']);
const findings=[];let checked=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 const path=join(dir,entry.name),rel=relative(root,path);
 if(SKIP.has(entry.name))continue;
 if(entry.isSymbolicLink()){findings.push({file:rel,issue:'UNEXPECTED_SYMLINK'});continue;}
 if(entry.isDirectory()){await walk(path);continue;}
 if(!entry.isFile())continue;
 if(entry.name==='.env' || /^\.env\./.test(entry.name) && !/\.example$|\.sample$/.test(entry.name)) {findings.push({file:rel,issue:'ENV_FILE_IN_PACKAGE'});continue;}
 if(!TEXT.has(extname(entry.name)) && !['Dockerfile','.gitignore'].includes(entry.name))continue;
 const size=(await lstat(path)).size;if(size>4_000_000)continue;
 const text=await readFile(path,'utf8');checked++;
 const hits=findHighConfidenceSecrets(text,{filename:rel});
 if(hits.length)findings.push({file:rel,issue:'POTENTIAL_SECRET',kinds:hits});
 if(rel.startsWith('.github/workflows/')&& /\.ya?ml$/.test(rel)){
   const unsafe=[...text.matchAll(/^\s*-\s*uses:\s*([^\s#]+)\s*/gm)].map(x=>x[1]).filter(x=>!(/^\.\/?/.test(x)||/@[0-9a-f]{40}$/.test(x)));
   if(unsafe.length)findings.push({file:rel,issue:'UNPINNED_ACTION',count:unsafe.length});
   if(!/^permissions:\s*$/m.test(text))findings.push({file:rel,issue:'MISSING_EXPLICIT_PERMISSIONS'});
 }
}}
await walk(root);
const report={tool:'PCS Security Audit',checked,findings,passed:findings.length===0};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(findings.length)process.exitCode=1;
