# Gemini setup

Create a Gem, paste `GEM_INSTRUCTIONS.md`, attach `UNIVERSAL_INSTRUCTIONS.md` or upload as knowledge, optionally attach Drive reference files. This sets behavior, **not storage permissions**. Confirm independently whether your Gemini experience can read/write GitHub. The web/mobile Gem file-knowledge workflow alone does not implement GitHub writes; if unavailable, use a compatible integration/runtime or produce a handoff for a write-capable AI.

Source: https://support.google.com/gemini/answer/15146780?hl=en


## PCS 3.0.2 operational guardrails

Before saying a GitHub Inbox request is complete, verify its Receipt or the canonical Moment `request_id`+digest. If missing, report `SUBMITTED_PENDING` (request exists) or `UNKNOWN` (not verifiable), never invent queue status or resubmit a new ID automatically. For large files follow `docs/LARGE_FILE_INTAKE.md`; for active instructions exclude `archive/PCS_2.1_LEGACY_ARCHIVE.zip`. Preserve branch protection and secure data classes.
