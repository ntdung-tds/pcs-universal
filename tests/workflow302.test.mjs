import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../templates/private-intake/pcs3-inbox.yml',import.meta.url));
test('3.0.2 workflow: bounded serialized queue with reconciliation schedule and pinned action',async()=>{
 const y=await readFile(file,'utf8');
 assert.match(y,/queue:\s*max/);
 assert.match(y,/cancel-in-progress:\s*false/);
 assert.match(y,/workflow_dispatch:/);
 assert.match(y,/schedule:/);
 assert.match(y,/uses:\s*actions\/create-github-app-token@[a-f0-9]{40}/);
 assert.match(y,/PCS_INBOX_BRANCH:/);
 assert.match(y,/permission-contents:\s*write/);
 assert.match(y,/permissions:\s*\n\s*contents:\s*read/);
});
