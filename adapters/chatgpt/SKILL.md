---
name: pcs-universal
version: 3.2.0
description: Use for starting, resuming, handing off, or changing requirements in a PCS Multi-Agent project, with GitHub state and minimal context.
---

# PCS Multi-Agent — optional Skill

This Skill is **optional**. Without it, the user can start from `PROMPT.md` / `START_HERE.md`; never require an installation, extra prompt, CLI, Gateway or a second Skill.

1. Read `START_HERE.md` as the short entrypoint; `adapters/UNIVERSAL_INSTRUCTIONS.md` holds operating rules. These are **toolkit instructions**, not the user's project state. Never load the entire repository.
2. For an existing project, use its latest `pcs/MOMENT.md` and verify `pcs/STATE.json` revision / GitHub HEAD. Select only the active Task/Feature, code, PR and tests needed. For a new project, initialize using the documented Simple Mode only if connected tools permit.
3. When the Owner changes a requirement during work, derive the relevant Task/Feature automatically. Record only the delta in the **project's** `pcs/SRS_CHANGES.md` following `docs/REQUIREMENT_CHANGE_CONTROL.md`. Do not ask the Owner to remember an SRS section; mark uncertain references `UNMAPPED`. Preserve the last approved effective change and the full audit trail; **do not rewrite the original SRS/outline**. After project completion, propose a change report for the Owner's separate decision.
4. Implement and test within verified permissions, respect GitHub PR/branch rules, keep the state/Moment checkpoint consistent and report verifiable evidence. Lead reviews ordinary contributor work; Owner accepts product outcomes. High-risk production, IAM, secrets, deletion or financial changes need genuine authorized approval.

Read `docs/CONTEXT_ENGINE.md` only for handoff/context selection. Missing GitHub/Drive or runtime capabilities mean report the limitation, never pretend to have saved or tested anything.
