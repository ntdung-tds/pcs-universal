# PCS 3.0.2 — Verification and acceptance report

**Date:** 2026-10-31 · **Scope:** local/offline reference implementation. No changes to IAICT production or repository.

## Automated tests

- **PCS v3.0.2:** 72/72 PASS (52 original PCS 3.0.1 tests plus 20 new tests for recovery, idempotency, large artifact references, authorization boundaries and pending statuses).
- **Legacy PCS 2.1:** 48/48 PASS when executed from archived source (independent suite); archived as reference rather than loaded into live chatbot knowledge.
- **Total:** 120/120 local automated tests PASS; package manifest and SHA-256 verified independently; Word handbook rendered and visually inspected.
- Security audit (`node tools/pcs-security-audit.mjs --root=.`): PASS, baseline detection only. Not a substitute for SAST, supply-chain review or penetration testing.

## Core test cases newly covered

1. Inbox file exists but Receipt absent (`SUBMITTED_PENDING`, not falsely QUEUED).
2. Missing request (`UNKNOWN`, no automatic resubmission).
3. Remote GitHub listing rather than stale checked-out files.
4. HEAD successfully written, Receipt write fails; resumed run reconstructs receipt from event without second revision.
5. Reused request ID with different payload rejected.
6. Ambiguous HEAD write error does not generate false terminal receipt; subsequent reconciliation can complete.
7. Scanner continues beyond first `limit` processed requests over multiple runs.
8. Multiple independent inbox requests in a burst all produce receipts.
9. Drive-reference artifact, hash verified and GitHub mirror readable.
10. Drive hash mismatch, no project revision change.
11. Confidential Drive-ref rejected before read.
12. GitHub release asset reference mismatched hash blocked.
13. Modified request detected when reading a receipt.
14. GitHub directory capacity reached: fail closed.
15. Applied event without receipt detectable by status tool.
16. Drive ID not in approved folder rejected before downloading bytes.
17. Approved Drive direct-child file downloaded only after metadata verification.
18. GitHub asset must belong to project-scoped release vault.
19. Google-native Docs require separate export pipeline rather than unsafe implicit download.
20. GitHub Actions YAML contains SHA-pinned GitHub App action, bounded queue, protected auth, scheduled reconciliation and explicit permissions.

## Known limitations / release gates

- GitHub Actions `queue: max` allows up to **100 waiting workflows**; additional runs may be canceled. A scheduled re-scan helps recover pending files but is neither infinite queue nor immediate service guarantee.
- GitHub Contents directory API at 1,000 entries: sample fails at saturation; production-scale needs audited request archive/partition.
- Branch protection and GitHub App permissions are environment-specific; **no live E2E runs have been executed** on the user's GitHub. An App rule bypass cannot be assumed.
- Private project repositories only by default; no unrestricted PII, secrets or RESTRICTED storage. DLP classifier is not complete.
- `CONFIDENTIAL` requires separate authenticated encrypted upload; web Inbox reference import limited to PUBLIC/INTERNAL.
- Drive reference requires direct child of allowed intake folder. OAuth refresh and privileged export of Google Docs are not implemented.
- A failed multipart upload or HEAD write may leave orphan events/blobs; refer to operations manual for human reconciliation.
- Cross-platform ChatGPT / Claude / Gemini write permissions are not verified live. No claim of deployment-ready connector UX until proven by E2E.
- Multi-writer flows still require canonical CAS and optional distributed coordination; no guarantee of exactly-once external actions.

## Manual E2E tests before production use

A. Setup private intake and canonical repos, scoped GitHub App, branch ruleset. Verify submitting a request doesn't allow editing workflow/runtime and App can update canonical without weakening branch protection.

B. Trigger 10–20 requests quickly; verify receipts, absence of duplicate commits and scheduled reconciliation after simulated missing workflow run.

C. Inject failure after HEAD before Receipt; verify exact same ID restores Receipt without duplicate business action.

D. Import a 2+ MB sample via allowed Drive folder and verify SHA-256 GitHub Release asset; then revoke Drive and prove GitHub-only recovery. Try unauthorized folder and wrong hash.

E. From ChatGPT send a task, from Claude read canonical HEAD and continue; repeat with Gemini only if available connector actually supports GitHub read/write.

F. Test expired App/Drive credentials, rate limits, queue cap and restart behavior; document timestamps, action run IDs, observations and explicit approvals.
