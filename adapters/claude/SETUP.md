# Claude setup

Create a Claude Project or reusable instruction containing `PROJECT_INSTRUCTIONS.md` and `UNIVERSAL_INSTRUCTIONS.md`. Connect GitHub, and optionally Google Drive, via supported Connectors under Claude settings. Connector availability and write actions depend on plan, region, permissions and provider implementation. Test exact actions and permissions.

If using remote MCP, host a proper MCP endpoint and configure authorized OAuth/access; this package's REST gateway is not silently MCP-compatible. Do not share tokens in project knowledge. Check supported source files in the Project and connector permissions before promising workflow automation.

Source: https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities


## PCS 3.0.2 operational guardrails

Before saying a GitHub Inbox request is complete, verify its Receipt or the canonical Moment `request_id`+digest. If missing, report `SUBMITTED_PENDING` (request exists) or `UNKNOWN` (not verifiable), never invent queue status or resubmit a new ID automatically. For large files follow `docs/LARGE_FILE_INTAKE.md`; for active instructions exclude `archive/PCS_2.1_LEGACY_ARCHIVE.zip`. Preserve branch protection and secure data classes.
