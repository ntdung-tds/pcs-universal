# PCS — Requirement Change History and Final-Effective Version (v1)

**Goal:** A user may revise an SRS/outline item repeatedly. Preserve the immutable original, every proposal and decision, and **one clearly identifiable most recently approved effective version** per item. A later proposal never silently overwrites the last approved version.

## Three layers
1. **Baseline (immutable):** SRS/outline file and section, stable item ID, source SHA-256; keep original intact. If source is revised, pin the prior version in Git and explicitly adopt a new baseline with an auditable decision.
2. **Change records (audit):** Each `CR-###` describes what changed, why, proposed final wording, impacted tasks/features/flows, tests, author, timestamps, GitHub Issue/PR/commit, decision and link to approval evidence. Store full detail in `docs/project/changes/CR-###.md` in the *project* repo with Git history; never overwrite previous CR files to hide superseded proposals.
3. **Effective version (compact canonical index):** Optional `state.requirement_changes[]` in Multi-Agent `pcs/STATE.json`, the same key in Solo `pcs/STATE.json`, or `pcs/project.json.requirement_changes[]` in Desktop 2.1. This is part of the **existing canonical project state** and does not create a second state file. Store small references to change evidence, not SRS paragraphs or unbounded logs.

## Record contract
```json
{
  "id": "CR-002",
  "item_id": "FEAT-001",
  "baseline_ref": "docs/SRS.md#3-2",
  "baseline_sha256": "<64-hex-digest-of-original>",
  "based_on": "CR-001",
  "status": "APPROVED",
  "final_ref": "docs/project/changes/CR-002.md",
  "final_sha256": "<64-hex-digest-of-final-wording>",
  "decision": {
    "by": "verified-owner-login",
    "ref": "https://github.com/org/project/issues/123#issuecomment-456"
  }
}
```
Use `based_on: "BASELINE"` for the first approved change; later approved changes point to the *previous approved* CR of the same item. Proposal statuses: `PROPOSED`, `REJECTED`, `APPROVED`. A new `PROPOSED` based on the current approved version does **not** change it. The newest approved chain tip is effective; concurrent approved forks, altered baseline digests, missing predecessor, missing approval reference or missing pinned final digest are invalid.

**Example:** SRS baseline 12 characters → CR-001 approved 10 → CR-002 approved 8 → CR-003 proposed 9. Effective requirement remains **CR-002 (8)** until a subsequent CR is actually approved. Revision order cannot replace an explicit approval.

## Workflow / checklist coupling
- On request: create a CR and link to stable SRS section, affected backlog item and current effective CR. Stage proposal and impact analysis. Agent/Lead may propose; the Owner closes substantive scope/acceptance decisions.
- On iteration: preserve CR-001/CR-002 history, record what supersedes what. Rejected and pending proposals remain auditable.
- On decision: use a GitHub-verifiable Owner decision for changes that need Owner approval; require stricter authentication for production/IAM/destructive/security/financial scope. Never accept fabricated/ambiguous chat or a forged approval as external verification.
- On approval: pin final wording and decision to a verifiable commit/review, then update the canonical change index with revision/HEAD check. Update affected task/feature acceptance criteria, QA/test cases, scope, schedule and checklist **in the same controlled workflow**. PR awaiting merge ≠ applied change.
- On resume: load the active item's latest *approved* CR and outstanding proposals (counts/links) only; fetch full history on demand. Display current final version, pending proposals, change count, source baseline, outdated implementations/tests and exactly what the Owner has not yet approved.
- On completion: `APPROVED CHANGE` ≠ `IMPLEMENTED` ≠ `TESTED` ≠ `OWNER ACCEPTED DELIVERABLE`. Each is a separate gate in the progress checklist.

## Safe usage
Optional read-only CLI, when environment allows:
```bash
node tools/pcs-change-control.mjs --file=/project/pcs/STATE.json --item=FEAT-001
```
For Desktop pass `--file=/project/pcs/project.json`. For Chat Solo use `python tools/pcs_requirements.py --file=/project/pcs/STATE.json --item=FEAT-001`.

The resolver **only validates the structure and finds the unique approved chain tip**. Its `approval_externally_verified:false` is intentional: it cannot independently verify a GitHub decision, the SHA-256 of referenced files or the true Owner identity. Do not mark sensitive approvals verified without actual source readback. Legacy state with no records remains valid, and no retroactive approval is fabricated.
