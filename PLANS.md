# node-hiprint-transit Execution Plans

This file is the durable plan contract for long-running Codex work in this
repository. Keep each iteration bounded, non-destructive by default, and backed
by command evidence.

## Global Constraints

- Preserve the public Socket.IO protocol unless a task explicitly changes it.
- Require `ALLOW_DESTRUCTIVE=1` before destructive filesystem, Git, deployment,
  or production operations.
- Use `npm run verify` as the default local completion gate.
- Update `docs/runbook/STATUS.md` after each substantial iteration.

## Iteration 1 - Workflow and Dependency Modernization

Objective: make dependency, CI, and Codex workflow checks reproducible.

Scope:

- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `Dockerfile`
- `scripts/run-all.sh`
- `scripts/codex/*`
- `docs/runbook/STATUS.md`
- `test/project-metadata.test.js`

Done criteria:

- `package-lock.json` exists and `npm audit` can run.
- CI and Docker builds use `npm ci`.
- Required Codex workflow files exist.
- `npm run verify` passes locally.
- GitHub Actions pass on `main`.

Rollback:

- Revert the modernization commit if lockfile or major dependency updates break
  production behavior.
- Keep protocol/auth fixes from prior commits unless they are directly proven to
  cause the regression.
