# PCS 3.0.2 — One-time activation for conversational AI

**You do not copy PCS into every project.** Deploy the PCS 3.0.2 runtime/workflow once into a controlled repository. For each new project, attach the SRS and instruct your authorized AI to create a PCS project. AI must not claim it wrote to GitHub if its connector lacks write capabilities.

## One-time prerequisites

1. Create a **private** canonical PCS repository for project state, Moments and binaries. Choose the default branch and protect it using an owner-approved ruleset. Approve an explicitly scoped GitHub App that can write PCS data to this canonical repository. Do not globally allow bypass for every user.
2. Create a **private** intake repository for chatbot requests (or use an intake branch with scheduled reconciliation). Protect the workflow processor, runtime and tools against unreviewed edits. Run the workflow from its protected default branch.
3. Deploy the active PCS 3.0.2 files `runtime/`, `tools/`, `.github/workflows/`, `examples/` to that intake repository. On the intake repo, configure variable `PCS_APP_CLIENT_ID`, secret `PCS_APP_PRIVATE_KEY`, variable `PCS_CANONICAL_REPO=OWNER/REPO`, variable `PCS_CANONICAL_REPO_NAME=REPO`, variable `PCS_CANONICAL_BRANCH=<protected branch>`. Set optional `PCS_INBOX_BRANCH` if you accept requests on a dedicated branch (the scheduled or manual default-branch run will read it).
4. If Drive is used, configure folder ID and a legitimate **renewable** Drive authorization flow. PCS 3.0.2 reference code only consumes the current OAuth token and does not implement its refresh. For file-ID intake, Drive source must be a direct child of the designated folder. Do not grant broader Drive access than necessary.
5. Verify GitHub Actions enabled, App installed on target, App write permitted by applicable rulesets and the test workflow completes with `APPLIED` receipt. Never solve a permissions error by disabling security controls.
6. For ChatGPT, Claude, Gemini, attach the **single platform-specific active adapter** from `adapters/` plus the minimal universal instructions. Do not load the entire ZIP or archived 2.1 into Knowledge. Connect the GitHub app/connector according to actual platform permissions. Chat applications without a GitHub write connector cannot fully automate PCS updates; report `PERSISTENCE_BLOCKED` or use an authorized Gateway.

## First harmless E2E check

1. From an authorized AI, write a unique JSON file in `pcs3/inbox/REQ-smoke-<nonce>.json` using `examples/REQ-init.json` and a new project slug.
2. Confirm that the intended input branch actually contains the request.
3. Trigger reconciliation, using `workflow_dispatch` if push processing cannot run automatically. Verify `pcs3/receipts/REQ-smoke-<nonce>.json` in **canonical PCS repository**.
4. Check `APPLIED` and exactly one HEAD revision / corresponding Moment; test `requestStatus` if receipt is slow. Compare hash/digest and verify that a second reconciliation does not commit again.
5. Try a non-sensitive multi-megabyte test file through approved Drive folder or project release vault; verify the GitHub copy. If any of these checks fails, keep status as unverified.

## Owner acceptance before real production use

Require evidence for controlled GitHub App scope, branch-protection enforcement, audit trail, Drive access limitation, 10+ fast consecutive requests, late receipt recovery, error handling, large artifact verification, and cross-platform handoff. The ZIP alone does **not** establish these controls in your GitHub account.
