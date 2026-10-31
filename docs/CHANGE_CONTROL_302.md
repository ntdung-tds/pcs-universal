# PCS 3.0.2 — Reviewer finding → implementation traceability

Basis: user-provided `reviews/PRIMARY_GROWTH_AREAS.md` (three concerns) plus independent branch-protection finding raised in prior assessment.

| Source finding | Implemented change | Test evidence / limitation |
|---|---|---|
| Inbox concurrent requests and delayed receipt | `queue: max`, scheduled/manual reconciliation, remote-list scanner, request-ID+digest persisted in Moment and recovery after receipt-write crash, status protocol | `tests/reliability302.test.mjs`; no live Actions test yet |
| Connector payloads and large files | `artifact_drive_ref`, `artifact_github_asset`, safe source boundaries, source hash+size verification, mandatory GitHub binary mirror | Tests include invalid hash, wrong Drive folder, project asset vault; real binary tools/permissions depend on connectors |
| Conflicting PCS 2.1/3.0 knowledge | Old tree removed from active project root; isolated `archive/PCS_2.1_LEGACY_ARCHIVE.zip`; adapter instructions updated | Package tree/manifest verification; manual Knowledge scope still required |
| Branch protection vs. Inbox write access | Separate intake and canonical topology, GitHub App token minted per workflow run, documented permission mapping | Requires real owner-authorized App and branch ruleset test; not automatically bypassed |

**Remaining operational risks:** GitHub workflow 100 pending queue cap, 1,000 item directory limit, limited per-run processing, GitHub/Drive provider outages, token issuance, GitHub Actions quotas, blob orphan events when a GitHub write fails partway, source-file classification/DLP limits, and multi-worker coordination. PCS must not falsely label those cases ACCEPTED or persisted. No guarantee of exactly-once side effects outside canonical state; events provide dedupe for canonical state when published.
