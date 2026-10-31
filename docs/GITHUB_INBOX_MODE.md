# PCS 3.0.2 — GitHub Inbox: reliability, security and reconciliation

**Canonical project state:** `pcs3/projects/<slug>/HEAD.json` + hash-chained events. **Submission:** `pcs3/inbox/REQ-<id>.json`. **Receipt:** `pcs3/receipts/REQ-<id>.json`. All are in private authorized GitHub repositories. A request is **not** considered completed until an `APPLIED` receipt is verified or the immutable event chain proves it was applied (`APPLIED_RECEIPT_PENDING`).

## Set up once: recommended two-repository topology

1. Establish a **private intake repository** where the approved AI/GitHub connectors can create `pcs3/inbox/REQ-*.json`. Protect `.github/workflows/`, `runtime/`, `tools/` and default branch using review rules/CODEOWNERS; mere ability to submit a request must not allow modifying runner code. If branch protection prohibits connector writes to default branch, use an **approved PR or separate intake branch (`PCS_INBOX_BRANCH`) + scheduled/manual reconciliation from the protected default branch**. Push runs on a non-default branch are intentionally ignored by the provided workflow; the protected default-branch job reads the configured intake branch during reconciliation. Do not weaken canonical branch protection.
2. Establish a separate **private canonical PCS repository** for HEAD, event history, receipts and all artifacts. Limit canonical Contents write to the processing GitHub App and authorized administrators. Restrict app access to the selected canonical repo, with bypass of protected rules only where explicitly approved and technically supported.
3. Install a GitHub App in the canonical repository with **Contents: read/write** (repository administration access is not needed). In the intake repository set `PCS_APP_CLIENT_ID` (variable), `PCS_APP_PRIVATE_KEY` (secret), `PCS_CANONICAL_REPO` (`OWNER/REPO` variable), `PCS_CANONICAL_REPO_NAME` (name variable), and `PCS_CANONICAL_BRANCH` (variable). Both repos must be within the owner selected by the sample workflow; otherwise adapt the App token installation target with a security review. The runner mints a **short-lived** GitHub App installation token at each run.
4. Configure Google Drive only if needed: `PCS_DRIVE_ACCESS_TOKEN` and `PCS_DRIVE_FOLDER_ID` secrets. For Drive reference imports, the source file must be a **direct child** of the configured intake folder. Token acquisition/refresh must be implemented in the deployment environment; a pasted OAuth access token alone will expire. Never store Drive credentials in JSON Inbox, prompts, or commits.
5. Put `runtime/`, `tools/` and `.github/workflows/pcs3-security.yml` into the **controlled private intake repository**; install `templates/private-intake/pcs3-inbox.yml` there as `.github/workflows/pcs3-inbox.yml`. Validate real deployment permissions with a harmless request. Setting up a GitHub App and repository permissions requires owner approval.

**Single-repo option:** possible when the connector can submit without violating branch protection and the GitHub App is permitted to write canonical PCS data. If not, choose the two-repo setup. Do not disable review/rulesets for convenience. The sample runner must run only from its protected default branch.

## Crash recovery and queue handling

- Workflow uses `concurrency: {queue: max, cancel-in-progress: false}` and serializes requests **within its single worker repo**. GitHub permits up to 100 waiting workflows; beyond that runs can still be cancelled. Workflow scheduling and ordering are not guaranteed. A scheduled and manual reconciliation run re-enumerates pending requests from the **GitHub API**, instead of assuming the checkout reflects the newest inbox.
- Each `REQ-*.json` has a stable unique filename; the runner hashes the JSON and attaches `request_id` + `request_digest` to the immutable Moment. If HEAD commit succeeds but Receipt creation fails, a retry scans the event chain and writes the missing receipt **without applying the command again**. If a request filename is reused with different payload, it is rejected.
- `git push`, `GITHUB_TOKEN` workflow triggers, runner startup and Contents API are **not transactional**. If the result cannot be proven, return `UNKNOWN`, preserve request ID and reconcile. Never fabricate an `APPLIED` result or submit a new ID because a receipt was slow.
- GitHub Contents directory listings cap at 1,000 entries; the runner **fails closed** when it reaches that cap. For high-volume installs, use audited archival/partitioning of processed requests *after* backing up full evidence. This sample is not a high-throughput queue service.
- Only one canonical writer is assumed. Separate inbox repos, Gateway writes and CLI writers must coordinate through the canonical GitHub compare-and-swap state, and can still produce conflicts. A topology with multiple processors must add a common distributed lock or queue. PCS records conflicts rather than silently overwriting.
- `workflow_dispatch` and scheduled reconciliation require enabled Actions, healthy quotas and valid App credentials. GitHub's schedule can be delayed. No service-level response-time guarantee.

## Status protocol for AI clients

| Status | Evidence and next step |
|---|---|
| `SUBMITTED_PENDING` | Verified request exists in GitHub but no receipt. Report ID; check Actions later. Do not claim it is queued or running without Actions evidence. |
| `APPLIED` | Verified matching Receipt. Read latest HEAD to continue. |
| `APPLIED_RECEIPT_PENDING` | No receipt, but authenticated canonical event chain records exact request ID/digest. Processor can regenerate receipt. |
| `REJECTED` | Verified terminal rejection; investigate reason, then prepare a **new** request for a genuinely corrected intent. |
| `UNKNOWN` | Request existence or outcome cannot be verified. Investigate connection, branch, Actions and state; **do not resubmit blindly**. |

CLI one-shot status (requires authorized GitHub credentials):

```bash
node runtime/pcs3-inbox-status.mjs --request=REQ-my-task.json --project=my-project
```

Web AI has no need to `sleep` or repeatedly poll. A single check and a truthful status is sufficient; a future turn or scheduled reconciliation can continue. To identify actual `QUEUED/PROCESSING`, inspect the authenticated workflow run API or GitHub Actions UI, not absence of Receipt.

## Safe large artifacts: do not paste big Base64 blobs into chat/Inbox

See `docs/LARGE_FILE_INTAKE.md`. The `artifact` command remains restricted to small `PUBLIC`/`INTERNAL` blobs. `artifact_drive_ref` accepts a **direct-child** file ID from the approved Drive intake folder, with file size/hash; the runner reads and verifies bytes, then stores a complete GitHub mirror. `artifact_github_asset` can import an asset **already in the project-specific PCS3 release vault**, again verifying bytes/hash and persisting a complete GitHub mirror. Neither command accepts `CONFIDENTIAL`/`RESTRICTED` via raw references.

## Claims this sample does NOT make

It does not prove real GitHub Actions live execution, all connectors' binary APIs, complete DLP, queue delivery under an indefinite outage, or branch bypass on every GitHub plan. Test a real private deployment and capture security, concurrency and failure evidence before production use.
