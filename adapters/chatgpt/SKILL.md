---
name: pcs-universal
version: 3.2.0
description: Manage PCS projects across chats using GitHub canonical state and selective context.
---

# ChatGPT adapter — PCS 3.2
Use `START_HERE.md` as entrypoint and `adapters/UNIVERSAL_INSTRUCTIONS.md` as active policy. For resumes use `pcs/MOMENT.md`, verify canonical revision and retrieve just the relevant task, code, PR and evidence. Read `docs/CONTEXT_ENGINE.md` for selective handoff when needed.

Use available connected GitHub/Drive tools if authorized; never imply connections or writable access. **Default Simple Mode does not require Inbox, Gateway, CLI or GitHub App.** Those are optional advanced integrations and cannot be assumed. No multi-agent self-authorization, approval impersonation, secret exposure or branch-policy bypass. Before claiming completion, verify real persisted state/CI/evidence. Missing capabilities => accurately report BLOCKED or PERSISTENCE_BLOCKED.
