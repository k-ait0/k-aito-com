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
