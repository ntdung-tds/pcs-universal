# PCS Context-Efficient Workflow (3.3 candidate; compatible with PCS 3.2 state)

## Principle
Load a map, not a manual. PCS owns **one canonical project state** at `pcs/STATE.json`. Context packets are read-only projections, not a second truth store, approvals or durable memory. No schema migration is required. The project's source requirements, signed/verified permissions and actual code outweigh a summary.

## Read sequence
1. **Cold start**: read PCS `START_HERE.md` once. Discover the chosen *project* repository, and check tools/permissions.
2. **Resume**: read `pcs/MOMENT.md` and its revision, then inspect changed GitHub commits/PRs and any active task. Do not paste the entire project state into chat by default.
3. **Select**: if Node is actually available, use `node tools/pcs-context.mjs --file=/project/pcs/STATE.json --role=lead --task=T1`. This command reads and validates the entire state locally but emits a bounded, content-minimized context packet. It never syncs to GitHub.
4. **Expand**: fetch only the selected requirements, dependencies, relevant code, tests, security policy and evidence. High-risk work MUST expand the security/approval context.
5. **Execute**: verify against live repository HEAD, affected integrations, CI, PR permissions and policy; never treat summaries as proof.
6. **Checkpoint**: update the canonical STATE and derived Moment under existing revision/branch protections. On a conflict, reconcile before retrying. Never persist unverified test/approval claims.

## Lead-to-contributor contract
A task handoff must identify: `task_id`, approved goal, code/document scope, dependencies, risk and required Owner gates, acceptance criteria, latest project revision/commit, and source links. An agent may obtain this data from approved project sources; NEVER fabricate missing fields. Send references and concise status, not all tool logs or chain-of-thought. Agents cannot authorize themselves or review their own PR.

## Contributor-to-lead / cross-chat handoff
Include: task ID, base/head SHA, changed file paths, PR URL, commands run, test outcomes with evidence links, unverified claims, blockers, changed requirements and the exact next action. Lead verifies evidence independently. Owner reviews feature/flow/release outcomes; production and sensitive decisions require independently authenticated approval.

## Budgeting and benchmark
Typical initial *measurement targets*, not hard token caps: bootstrap 300–800, Moment 500–1500, task contract 300–1000 tokens. Track context/input/cache/tool-result tokens where the provider exposes metrics, resume overhead, compaction count, task correctness and recovery accuracy. Label unavailable metrics as UNAVAILABLE and do not claim an 80% saving without a controlled baseline. Caching reduces billing in supported providers but does not free context slots. Compaction can omit facts; preserve durable source pointers.

## Platform integration
- Claude Code: short CLAUDE.md + on-demand Skills, optional subagents/compaction.
- Codex: short AGENTS.md + on-demand instructions/tools, native compaction where available.
- Gemini CLI: scoped GEMINI.md and optional compression.
- Chat interfaces: START_HERE + verified Moment + targeted GitHub reads. If the connector cannot generate bounded views, do not claim automatic server-side filtering. Avoid manually pasting full project JSON.

## Validation
Tests must cover 200+ tasks, bounded output, hidden free-text, unknown risk, authorization gates, conflicting revisions, resumes without chat history and real GitHub E2E. Unit tests are not evidence of cross-agent E2E.
