# Repository-wide developer and AI instructions

## Mandatory CI cost policy
- GitHub Actions is **manual-only**. Never add automatic push, PR, workflow_run, schedule or label triggers without explicit user authorization.
- Do not start Actions for ordinary edits, test runs, builds, documentation, or each commit. Prefer local development, builds, unit tests, static analysis, and browsers.
- Run node scripts/local-preflight.cjs before PR updates. For workflows, also run node scripts/check-actions-manual-only.cjs.
- Batch coherent changes. Do not consume CI merely to verify incremental commits.
- Run only explicitly approved manual release/security/production workflows on a reviewed commit; keep real production verification in the release checklist.
- Policy or trigger exceptions require explicit user approval and human review. No exceptions are currently approved.
- Never merge unrelated, unapproved product/research changes to modify Actions configuration.
- Do not claim GitHub branch protection or local hooks are active unless verified.

See docs/GITHUB_ACTIONS_POLICY.md and docs/GITHUB_ACTIONS_POLICY.json.

## Manual write-capable workflow protection (2026-10-27)
- Build-notebook-photo and sync-published-content are **main-write operations**, not ordinary QA. Prefer local generation and reviewed PRs instead of Actions.
- Both require an exact confirmation input and the reviewed 40-character main HEAD SHA; only main dispatch is permitted. Run `node scripts/check-main-write-workflows.cjs` locally.
- If main changes before a write, stop and review the new SHA. Never rebase/auto-retry generated changes onto an unreviewed main.
- Keep automatic triggers at zero. Any manual invocation still requires explicit user approval and is not authorized by these safeguards alone.
