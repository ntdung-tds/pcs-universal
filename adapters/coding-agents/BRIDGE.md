# Coding agents — PCS 3.2 bridge (legacy only when explicitly needed)

For active PCS 3.2 projects, begin with `START_HERE.md`, `adapters/UNIVERSAL_INSTRUCTIONS.md` and the actual project's `pcs/MOMENT.md`. Verify state revision and use task-specific source/test reads, per `docs/CONTEXT_ENGINE.md`. Do not load the PCS 2.1 archive or old advanced HEAD into a normal Simple project.

When **migrating an explicitly selected legacy PCS 2.1 project**, preserve its own canonical format and audit migration mappings before switching; never dual-write conflicting formats or silently upgrade acceptance. Agent can use local branch/worktree and tests, but must verify GitHub commits and approvals before reporting persisted completion. Respect least privilege, security classification and Owner-only gates.
