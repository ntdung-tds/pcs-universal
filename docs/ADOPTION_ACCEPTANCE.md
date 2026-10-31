# Adoption & Acceptance — PCS 3.0

## Acceptance levels

- **Core locally tested:** Node tests for canonical state/history/checkpoints, CAS rejection, fake Drive/GitHub fallback, HTTP gateway; no external API writes.
- **Provider sandbox tested:** real GitHub private test repo + Drive test folder; uploader, Releases, OAuth scopes, 409 conflict; requires user's authorization and has NOT been performed.
- **App connected:** ChatGPT Plugin with GitHub/Drive tools, Claude Project/connectors, Gemini Gem with actual GitHub write integration each pass operations; NOT verified.
- **Cross-platform acceptance:** Task created ChatGPT → Claude consumes same canonical state → Gemini writes authenticated checkpoint → ChatGPT resumes latest; cannot declare PASS until conducted. Gemini read-only outcome must be classified partial.
- **Production adoption:** privacy review, credential rotation, backups, branch protection, disaster recovery, access audit and release approvals.

## Independent test suite to run in real integrations

| ID | Test | Pass criteria |
|---|---|---|
| P3-E2E-01 | ChatGPT receives SRS, creates private GH project | Full original source + canonical state + verified Moment |
| P3-E2E-02 | Claude resumes same project | Correct current task, revision and integration dependencies |
| P3-E2E-03 | Gemini tries to update without GH writes | Honest PERSISTENCE_BLOCKED, no false claims |
| P3-E2E-04 | Drive connected | Source content Drive + pointer/hash in GH |
| P3-E2E-05 | Drive unavailable | Original bytes on GH, pointer verified |
| P3-E2E-06 | Two agents write from same revision | One rejected, no lost update |
| P3-E2E-07 | Broken/forged test link | Cannot pass acceptance from metadata alone, auditor checks link |
| P3-E2E-08 | Prompt injection in SRS | No unauthorized secret leakage/deployment |
| P3-E2E-09 | PDF/DOCX large or Drive quota | Fallback complete or explicitly blocked with exact reason |
| P3-E2E-10 | Delete/alter historical event | Verify alerts; stop and investigate |
| P3-E2E-11 | Project from PCS2.1 | No DEMO data imported; real state preserved |
| P3-E2E-12 | Release to production | Explicit owner approval and real provider evidence |

## Performance metrics (not hard limits)

Priority: correctness/acceptance, stability/security, E2E coverage, recoverability, collaboration quality. Efficiency, elapsed time and token spend are secondary diagnostics, never hard ceilings when quality requires deeper work.
