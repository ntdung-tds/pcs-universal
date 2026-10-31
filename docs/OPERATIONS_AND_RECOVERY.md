# Operations, troubleshooting, disaster recovery

## First run / access

1. Create a **private** GitHub repository dedicated to PCS states (or choose an existing authorized private one); repo should have a real default branch.
2. Connect GitHub to AI app through supported UI; Drive optionally. If using Node CLI, set environment variables in terminal/secret store; do not paste values into chat.
3. Run `node runtime/pcs3.mjs doctor` and inspect branch, repo private and Drive status. Drive folder read is NOT a guarantee of write; test one small upload if permitted.
4. New project: `node runtime/pcs3.mjs init --slug=example-1 --name='Example' --source=./SRS.docx`. The source file is stored; product map remains DRAFT until agent analyzes it.
5. Continue: `resume`, then `state`/`verify`, work, write checkpoint with exact revision.

## Incident matrix

| Symptom | Interpretation | Safe recovery |
|---|---|---|
| 401/403 Github | No permission/expired token | Re-authorize; no fake saved state |
| 404 on GH repo | Wrong path, repo private/no permission or missing | Verify repo identity before creating new project |
| Drive 403/404/5xx | Drive unavailable | Upload to Github fallback, verify GH metadata |
| GitHub conflict / stale revision | Another agent wrote HEAD | Read newest, reconcile, commit again |
| ORPHANED artifact/event | blob committed but HEAD not updated | Identify source pointer and retry manifest safely, don't duplicate approvals |
| History hash mismatch | Tampering/corruption/non-atomic edits | Stop write; verify GitHub commit history, use protected backup |
| Large binary rejected | GH release storage permission/size/quota | Break into verified chunks or choose approved GitHub storage strategy |
| Gemini only reads Drive | No proven GitHub write capability | Export review/handoff; persist from write-capable agent |

## CLI command reference

`doctor`, `init`, `resume`, `state`, `checkpoint --expect=<latest>`, `artifact --file=... --expect=<latest>`, `import-source`, `verify --assets=true [--drive=true]`.

Đối với ChatGPT/Claude chat có GitHub file-write connector, khuyến nghị thêm chế độ `docs/GITHUB_INBOX_MODE.md` — không cần tự vận hành Gateway.

## Optional private API bridge

```bash
# Use a randomly generated 32+ character value stored securely
export PCS_GATEWAY_KEY='REPLACE_THIS_WITH_REAL_32_PLUS_CHAR_SECRET'
node runtime/pcs3-gateway.mjs
```

Default bind `127.0.0.1:8789`, HTTP for local use ONLY. To use from ChatGPT/Claude/Gemini, deploy behind an authenticated HTTPS endpoint and integrate according to their currently supported connector/action capabilities. REST Gateway does not become Claude MCP server simply by exposing a URL. Its reference implementation has limited tenant isolation/abuse defense; use behind mature gateway in production.

## Disaster recovery

Git clone/backup of repo recovers HEAD/events and GitHub fallback blobs/assets subject to Release availability and asset integrity; Drive-stored content needs separate export. For critical files, duplicate to Github even while Drive works or schedule periodic artifact audit (not implemented in v3.0 reference). Reconcile latest verified Git history before resuming.
