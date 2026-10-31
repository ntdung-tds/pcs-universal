# Migrate PCS 2.1 into PCS 3.0

PCS2.1 is preserved unchanged in `archive/PCS_2.1_LEGACY_ARCHIVE.zip` (open only during an explicit migration). Do not replace the working coding-agent repo or its authoritative SRS without explicit change control.

1. Choose an authorized private GitHub PCS repository and slug. Read PCS2.1 `pcs/project.json`, `tasks.json`, `features.json`, `flows.json`, `releases.json`, `current.json`, and referenced evidence. Ignore demo entries unless actually real.
2. Create PCS3 state via CLI/Gateway; import real SRS as artifact with hash and source reference.
3. Translate statuses preserving **exact** meaning; e.g. TECH_DONE remains TECH_DONE, NOT_RUN remains NOT_RUN. Keep code repo URL, commit SHA, PR/QA links as external evidence; distinguish source of truth vs implementation repo.
4. Translate approved product/architecture maps with traceability. Do not automatically mark any feature or release ACCEPTED just because task passed.
5. Commit a migration checkpoint with recorded actor/date, migration source commit, original files/zip, and remaining blockers.
6. Verify that fresh ChatGPT/Claude read the same GH HEAD and exact next action; compare independent reading to original record.

**v3.0 has no automatic converter:** migrations require agent review because old data may be incomplete/misleading, and automatic status promotion would be unsafe. Do not claim a project has been migrated just because the PCS3 ZIP includes PCS2.1.
