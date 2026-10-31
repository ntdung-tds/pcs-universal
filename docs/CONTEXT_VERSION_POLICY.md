> **Simple Mode:** `pcs/STATE.json` là nguồn trạng thái ở repository dự án; **Advanced Mode:** `pcs3/projects/<slug>/HEAD.json`. Chọn một chế độ và chỉ chuyển đổi theo migration được kiểm chứng; không dùng hai dạng đồng thời.

# PCS 3.0.2 — Active knowledge, legacy isolation and precedence

Only upload the **active adapter for your platform**, `adapters/UNIVERSAL_INSTRUCTIONS.md`, and selected relevant `docs/` into the conversational assistant's Knowledge. Do **NOT** upload the entire ZIP or `archive/PCS_2.1_LEGACY_ARCHIVE.zip` into a chatbot Knowledge store. Legacy PCS 2.1 has a different state model and is stored only for migration/reference use.

**Authority order:** (1) owner-approved project-specific policies and explicit decisions, (2) current PCS 3.0.2 instructions and authenticated HEAD/Moments, (3) current verified code/evidence, (4) past notes/examples/legacy documents. Distinguish current implementation from future design. Discrepancies must be surfaced, not hidden.

`pcs/current.json` + `pcs/moments/` belongs to the legacy coding-agent standard. `pcs3/projects/<slug>/HEAD.json` + `pcs3/projects/<slug>/events/` is the canonical state for universal PCS. `legacy` assets are archives, **not** bootstrap templates or automatic instructions. When migrating an old project, produce an explicit reconciliation mapping with provenance and review; do not auto-merge two state stores silently.

The in-bundle `archive/PCS_2.1_LEGACY_ARCHIVE.zip` preserves the exact previous package for existing projects and migration work without flooding conversational AI context.
