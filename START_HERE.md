# PCS Multi-Agent 3.2 — AI entrypoint

This repository is the **public PCS toolkit**, not a project state store. **Read this entrypoint first, then load only task-relevant PCS files. Never bulk-read the repo or historical archives.** The user's project, requirements and current verified state take priority over PCS reference material.

## Standard resume command

User command: **"Tiếp tục dự án theo PCS, sử dụng trạng thái mới nhất trên GitHub."** Treat this as resume intent for the **identified project repository**, not this public PCS toolkit. If the project repo is already known, proceed without asking the user to repeat configuration. If it is not known or multiple projects are plausible, request only its link; never guess. Read the latest project Moment, verify canonical STATE revision and GitHub HEAD, inspect only relevant changes, task, evidence and policies, then continue within actual permissions. Write a verified checkpoint only when authorized; otherwise report what was blocked. No full documentation reload or automatic claim of GitHub access.

## Start or resume
1. Identify the **project repository** and current task. For an existing project, first read `pcs/MOMENT.md`, check its revision against the canonical `pcs/STATE.json` and HEAD, then inspect only the selected task, relevant PR/Issues, requirements and code. Do not paste the full state into the context by default. Do not reload unchanged PCS handbook/code in each chat. For a new project, read `docs/SIMPLE_MODE.md` and use `templates/simple/STATE.example.json` only to initialize a single `pcs3.simple.v1` state in a **private** project repo by default.
2. Check real connector, GitHub, filesystem, test and deployment access. Do not invent access, CI, approvals or changes. If persistence is blocked, report it and do safe work only.
3. Plan and execute meaningful tasks, respecting dependencies, integration and test evidence. Lead reviews contributor work; the human Owner reviews product outcomes (feature/flow/milestone/release), not every routine task. Chat feedback guides work but never impersonates verified production approval.
4. For writes, verify repository permissions, branch rules and revision/HEAD, obey PR/CI protection and record a consistent project STATE/Moment checkpoint. If review is required, do not mark proposed changes applied. Never bypass a protected branch.
5. Present verified results, remaining risks/blocked items and the **next actionable step**. Resume from the new project state, not a fresh PCS documentation crawl.

## Read only when the trigger occurs

| Trigger | Read |
| --- | --- |
| New project or state bootstrap | `docs/SIMPLE_MODE.md`, `templates/simple/STATE.example.json` |
| Agent joins, task assignment, self-claim or lead delegation | `docs/PCS_3_2_LEAN.md`, then `docs/AGENT_COLLABORATION.md` for authorization |
| Lead technical review or Owner acceptance | `docs/PCS_3_1_UNIFIED.md` |
| Configuring/changing branch governance | `docs/BRANCH_GOVERNANCE.md` (first do a read-only inspection); never assume Administration API |
| SRS/outline item is revised, superseded or approved | `docs/REQUIREMENT_CHANGE_CONTROL.md` (baseline, change records, final approved version) |
| Selecting a bounded task context or preparing a cross-agent handoff | `docs/CONTEXT_ENGINE.md`; optional `tools/pcs-context.mjs` when Node is available |
| State grows large, debugging revision differences or Public project classification | `docs/STATE_OPERATIONS.md` (only the relevant section) |
| Sensitive data, production, credentials, deletion | `SECURITY.md`, `docs/DATA_CLASSIFICATION.md` and related relevant policy |
| Advanced Inbox, Gateway or migration | `docs/GITHUB_INBOX_MODE.md`, `docs/ARCHITECTURE.md` and relevant migration guides |
| Working on PCS runtime/CI itself | The specific `runtime/`, `tests/`, schemas, manifest and CI files affected |

**Skip on ordinary project sessions:** `README.md`, `PROMPT.md`, `RELEASE_NOTES.md`, `TEST_REPORT.md`, `reviews/`, `archive/`, handbook DOCX, unrelated adapters, and all runtime source/tests unless needed. Those files remain available for users, maintenance, audits and historical reference; their existence is not a reading mandate.

## Invariants (apply without rereading all policies)

- One canonical project PCS state; do not silently mix `pcs3.simple.v1` and legacy `pcs3.head.v1`.
- Agents cannot grant themselves GitHub authority. Sensitive/unknown risk needs verified Owner approval; an agent must not review its own PR.
- GitHub Issue closed or PR merged alone does not prove tests, integration or Owner acceptance. Use real evidence and classify unverified claims accurately.
- State updates must use current revision and GitHub concurrency controls; never silently overwrite another contributor.
- Do not include secrets or restricted project data in the public PCS repository. High-risk operations require real platform permissions and independently verifiable authorization.

**Rule of thumb:** index filenames/short summaries first; fetch the smallest relevant section of a file, then expand if uncertainty or risk demands it. Optimizing context must never remove necessary security or technical verification.
