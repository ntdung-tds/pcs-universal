# ChatGPT setup: Plugins/Skills, not a new Custom GPT

As of October 2026, OpenAI is migrating Custom GPTs to Plugins and has announced planned retirement in December 2026 (availability and account exceptions vary). Therefore use **Plugin Creator** to create a private PCS plugin with the canonical `.agents/skills/pcs-universal/SKILL.md` and `adapters/UNIVERSAL_INSTRUCTIONS.md` as skill/reference content; add **GitHub** and **Google Drive** apps where available and authorize the intended repository/folder. Confirm write permissions with a harmless test file or draft/PR, not an assertion.

If your workspace supports a custom integration/server via an approved plugin, the optional `schemas/openapi.json` and `runtime/pcs3-gateway.mjs` provide a bridge; replace the placeholder host, deploy privately with HTTPS + credential storage, and separately test permissions. A JSON specification does NOT automatically install a plugin or create a hosted service.

A public GitHub repository by itself does not install this Skill into ChatGPT. For Codex/Gemini-compatible workspaces, use the canonical `.agents/skills/pcs-universal/` folder in a discoverable workspace or explicitly install it at an authorized user/project Skill location.

When no such plugin feature is accessible, use Project instructions referencing `UNIVERSAL_INSTRUCTIONS.md` and the connected apps available in the conversation. User still only needs to upload SRS and request project execution; setup is once per application/account, not per project.

**Important:** Do not instruct user to create new Custom GPT as the primary long-term path.

References: https://help.openai.com/en/articles/20001256-plugins-in-chatgpt ; https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq


## PCS 3.0.2 operational guardrails

Before saying a GitHub Inbox request is complete, verify its Receipt or the canonical Moment `request_id`+digest. If missing, report `SUBMITTED_PENDING` (request exists) or `UNKNOWN` (not verifiable), never invent queue status or resubmit a new ID automatically. For large files follow `docs/LARGE_FILE_INTAKE.md`; for active instructions exclude `archive/PCS_2.1_LEGACY_ARCHIVE.zip`. Preserve branch protection and secure data classes.
