# PCS 3.1.1 — GitHub Branch Guard (2026-11-01)

PCS 3.1.1 bổ sung quy trình để **Lead Agent tự kiểm tra và cấu hình bảo vệ nhánh mặc định**, giảm thao tác GitHub thủ công của Owner:

- Read-only preflight: branch, HEAD, repo rulesets, effective rules và classic protection; fail-closed khi không nhìn được chính sách hiện có.
- Kế hoạch SHA-256 và comment GitHub Owner xác thực, kiểm tra chính caller độc lập với Owner, từ chối kế hoạch cũ.
- Sau phê duyệt, dùng quyền Administration:write tạm thời để tạo **một ruleset mới**; không sửa/xóa ruleset cũ, không bypass. Xác minh bằng GitHub readback trước khi báo APPLIED_VERIFIED.
- Baseline: PR bắt buộc, cấm force-push và xóa nhánh. Không tự bật required CI/reviewer nếu chưa xác minh được context, bảo vệ khỏi tự khóa repo solo.
- Test mock với tình huống thiếu quyền, giả mạo, dùng chung account, conflict/race, duplicate/existing rules, verification failure. Không phải E2E private repository thật.
- GitHub Free private repository có hạn chế rulesets theo gói; AI phải xác minh điều kiện tài khoản thay vì tự đoán.

**Không tự thay đổi branch protection của PCS public hoặc bất kỳ dự án production nào khi phát hành thư viện.** Xem docs/BRANCH_GOVERNANCE.md.

---

# PCS 3.1.0 — Unified Contributor Workflow & Owner-first Acceptance (2026-11-01)

**Release scope:** One Lead Agent with delegated authority, dynamic contributors who can propose work, technical acceptance by Lead, and final product feedback by Project Owner without requiring them to test code.

- Adds `runtime/pcs3-delivery.mjs`: strict Lead technical acceptance based on authenticated GitHub PR author/reviewer, merged status, PR-head SHA and complete successful check-runs; rejects self-review and stale decisions.
- Owner can agree/request changes/disagree on a feature, business flow or release using an authenticated GitHub Issue comment tied to the specific reviewed commit; event is separate from technical review.
- Informal chat feedback is retained in `delivery.owner_notes` with `UNVERIFIED_CHAT`, never promoted to formal Owner authorization. Lead can still plan and execute normal tasks based on it.
- `runtime/pcs3-agent-operator.mjs` supports `technical-review` and `owner-feedback` commands; `recommendNextTasks()` suggests available dependency-ready tasks after technical review. Protected-branch PR fallback is still `REVIEW_REQUIRED`, not applied.
- State schema: remains `pcs3.simple.v1` wrapper around `pcs3.project-state.v1`, with optional `delivery` ledger; single-agent and existing project states remain supported. New emptyState version field is `3.1.0`.
- New [unified workflow and acceptance guide](docs/PCS_3_1_UNIFIED.md), [Owner review Issue template](templates/owner/REVIEW_ISSUE.md), and security/regression tests.

**Not included / not certified:** automatic agent spawning across chat apps, always-on coordinator, verified human identity when using a shared GitHub token, live multi-provider E2E, automatic migration of historical Advanced HEAD repositories, production release, or independent validation of every external CI/QA claim. Enforce GitHub branch protection and independent principals before relying on automated approvals.

---

# PCS Governance Hardening — 2026-11-01

- Vá P0: chuẩn hóa/fail-closed rủi ro; bất biến bằng chứng phê duyệt theo toàn bộ state; chặn quyết định cũ sau khi Lead bị thu hồi/hết hạn.
- Vá P1 một phần: kiểm tra epoch/delegation; khi nhánh chính chặn push 403, tạo PR `REVIEW_REQUIRED`, không giả `APPLIED`.
- Bổ sung kiểm thử độc lập các tình huống từng khai thác và đường đi PR bảo vệ nhánh.
- **Chưa nghiệm thu E2E:** tài khoản GitHub chung, rulesets thực tế trên repo dự án, giám sát agent join liên tục, migration schema và xác minh QA bên ngoài.

# PCS 3.0.2 — Dynamic Agent Collaboration enhancement (2026-11-01)

- One project repo, one canonical `pcs/STATE.json`; optional `state.collaboration` extends state without introducing second governance store.
- One currently authorized Lead Agent; owner-approved delegation has bounded expiry/epoch; owner can reassign and clear.
- New agent may apply with no task, propose open tasks, receive Lead assignment or direct Owner assignment.
- Owner or delegated Lead may approve normal requests; Owner alone can approve sensitive work; self-approval and duplicate task claims blocked.
- Verified GitHub issue/comment metadata rather than user-supplied approval text. No automatic agent spawning or claim of E2E certification.
- Optional GitHub Git Data operator updates STATE + MOMENT + snapshot in one commit; non-forced branch ref prevents stale overwrite.
- Tests cover identity/spoofing, simultaneous updates, task conflicts, revoke, lease expiry and delegation.
- Strict security limitation: sharing the same GitHub identity between Owner and agent cannot provide independent authentication; deployment must separate principals / branch protections for secure approvals.

---

# PCS 3.0.2 — Simple Mode Enhancement (GitHub public edition)

- Simple Mode is now the default: user copies PROMPT.md and submits SRS, agent creates a private project repository and owns PCS setup. No mandatory GitHub App/Inbox/Gateway/CLI.
- Added `docs/SIMPLE_MODE.md`, `docs/SIMPLE_MODE_QUALITY.md`, minimal state/Moment templates and optional terminal helper `runtime/pcs3-simple.mjs`.
- GitHub Issues adapter `runtime/pcs3-issues.mjs`: preview-first, task marker and duplicate detection. GitHub Projects remains optional and is not falsely claimed to be auto-synchronized.
- Fixed task dependency cycle/self-dependency/duplicate checks and duplicate required tasks/features/flows.
- QA metadata remains *structural evidence only*; explicit external verification is required for CI/security/human acceptance.
- Simple Mode and Advanced Mode storage schemas are distinct and must not be mixed without migration.

# PCS 3.0.2 — Reliability & Interoperability Hardening (2026-10-31)

Retains every PCS 3.0.1 security feature. Follows user review "Các Vùng Cần Cải Thiện Chi Tiết (Primary Growth Areas)" and adds a fourth issue: branch protection vs. Inbox write capability.

## Fixed / added

1. Workflow concurrency uses `queue: max`, serialized reconciliation, periodic schedule and `workflow_dispatch`; runner scans live GitHub contents rather than stale checkout. **Not** guaranteed infinite queue; high-volume retention/partitioning remains an operational task.
2. Full request ID + digest recorded in canonical Moment. Re-processing after a crash when Receipt was missing recovers from immutable event rather than executing the operation twice. Ambiguous provider errors have no terminal REJECTED receipt.
3. `requestStatus` and CLI for truthful status: `APPLIED`, `APPLIED_RECEIPT_PENDING`, `SUBMITTED_PENDING`, `REJECTED`, `UNKNOWN`. No automatic retries/polling/re-submissions from conversational AI.
4. Large artifact reference intake via constrained Drive folder or project-scoped Release asset, validating source bytes/hash and retaining full GitHub content. No arbitrary URLs; no raw CONFIDENTIAL/RESTRICTED sources through Inbox.
5. Explicit separated private inbox/canonical topology, with short-lived GitHub App token, rather than disabling branch protection.
6. Legacy v2.1 documentation isolated in `archive/PCS_2.1_LEGACY_ARCHIVE.zip`; no stale instructions in active chatbot Knowledge.
7. New adversarial regression tests, deployment guidance and updated handbook.

## Important limits

This release is a **local reference implementation**, not a production-certified app or a GitHub Action already deployed to a real user repository. Branch ruleset bypass must be approved and validated. Drive OAuth refresh is deployment-specific, and native Google Docs export is not implemented in reference intake. GitHub directory listing has a limit; very large queues need archiving/partitioning. GitHub App token and Action permissions are not self-provisioning.

---

# PCS 3.0.1 — Security Hardening Patch (2026-10-31)

Bảo mật bổ sung trên PCS 3.0, không thay đổi dự án IAICT hay bất kỳ remote deployment nào.

- Dữ liệu phân loại PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED, chặn một số credential trước khi upload GitHub/Drive hoặc commit Moment.
- AES-256-GCM cho CONFIDENTIAL binary artifacts, GitHub + Drive giữ ciphertext, bắt buộc khóa riêng `PCS_ARTIFACT_KEY_B64`. RESTRICTED fail-closed.
- Kiểm tra repository private cho mọi checkpoint; Inbox chặn giả mạo approval/ACCEPTED.
- Read-only GitHub security doctor (private, branch protection/rulesets/workflow permissions, CodeQL và Dependabot cảnh báo theo quyền API), trạng thái UNKNOWN không bị coi là PASS.
- Workflow pin action SHAs, scoping quyền, security+regression CI; thêm scanner baseline, SECURITY.md, threat model, security gates, docs và các test.
- Lưu ý: quy tắc bảo mật repo phải được bật bằng GitHub Settings; scanner không phải DLP, encryption không bao gồm HEAD/metadata, confidentiality ở lớp chat app/connector không thuộc kiểm soát của bộ công cụ.

---

# PCS 3.0.0 Release Notes — 2026-10-31

**Product:** PCS Universal AI Project System (ChatGPT / Claude / Gemini / coding agents)

## Added
- GitHub canonical project state with full snapshot Moments and SHA256 history chain.
- GitHub-first **binary mirroring** for all artifacts, regardless of Drive status.
- Google Drive optional upload, fallback to GitHub Contents or draft Release assets.
- Optimistic concurrency (GitHub contents SHA + expected revision), orphan warnings and conflict reports.
- Four acceptance layers: task, feature, flow, release; evidence/approval metadata validation.
- Node CLI (`init`, `resume`, `state`, `checkpoint`, `artifact`, `verify --assets`, `doctor`).
- Node HTTP REST Gateway with Bearer key for compatible API integrations, OpenAPI description.
- **GitHub Actions Inbox processor** for chat app GitHub file-write connectors: `init`, `patch`, `artifact` and receipts; one-time central repository setup.
- ChatGPT Plugin Skill, Claude Project instruction, Gemini Gem instruction, coding agent bridge.
- PCS 2.1 fully preserved under `legacy/PCS_2.1`.
- Operations, security, source reference and adoption/test documents, Word handbook.

## Quality and reality

Local tests passed (see TEST_REPORT.md). No live GitHub, Drive or platform integrations were performed. Application-specific instructions are not the same as installed connectors. Deployment and secrets stay with the user environment and permissions.

## Compatibility

Requires Node.js >=20 for CLI/inbox/gateway; Word document is readable without Node; chat instructions can be used with platform tools after appropriate one-time authorization.
