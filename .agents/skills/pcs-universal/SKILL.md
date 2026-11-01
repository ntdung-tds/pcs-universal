---
name: pcs-universal
description: Use when starting, resuming or handing off a PCS Multi-Agent project, delegating agents, checking progress, or changing SRS requirements using current GitHub task context.
---

# PCS Multi-Agent — optional portable Skill

Apply only to the user's **actual project repository**. The public `pcs-universal` repository is a toolkit, never the store for that project's state. The Skill is optional; `PROMPT.md` / `START_HERE.md` remain sufficient without installation.

1. **Resume:** Locate the already identified project repo. Read its latest `pcs/MOMENT.md`, reconcile canonical `pcs/STATE.json` revision with GitHub HEAD, then fetch only the active task/feature, relevant code, decisions and evidence. If repository identity is genuinely unknown, ask only for the link. Never paste the whole toolkit or history into context.
2. **Work:** Lead may assign and review ordinary contributor tasks; contributors act only within verified permissions. Follow actual PR/CI/branch rules and verify implementation/tests and the right Owner acceptance. Never claim unverified tools, approvals or writes.
3. **Requirement changes:** During a task, derive the task/feature reference automatically; append only the change delta and decision history to the **project's** `pcs/SRS_CHANGES.md`. Unknown SRS mapping is `UNMAPPED`, never guessed. Pending proposals do not replace the last approved effective requirement. **Do not change the original SRS/outline** until project completion and a separate explicit Owner decision.
4. **Checkpoint:** On real authorized writes, verify GitHub revision/HEAD and record a consistent state/Moment checkpoint. Report verified tests, commits/PRs, remaining risks, and the next action. Production, IAM, destructive, secret-handling and spending changes require appropriately verified authorization.

**Optional reference, only when relevant and accessible:** [PCS entrypoint](https://github.com/ntdung-tds/pcs-universal/blob/main/START_HERE.md), [requirement changes](https://github.com/ntdung-tds/pcs-universal/blob/main/docs/REQUIREMENT_CHANGE_CONTROL.md), [context selection](https://github.com/ntdung-tds/pcs-universal/blob/main/docs/CONTEXT_ENGINE.md). If you are inside a full PCS toolkit checkout, the same files can be read locally. This Skill remains usable on its own when they are not accessible; do not invent access.

**Not for:** an unrelated quick question, or a project that has not selected PCS. Do not activate optional Inbox/Gateway or other infrastructure as a prerequisite.
