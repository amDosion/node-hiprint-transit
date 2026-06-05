# node-hiprint-transit Status

## 2026-06-06 - Workflow and dependency audit

Owner: ops

Objective: standardize Codex workflow files, make dependency verification
auditable, and modernize stale package declarations while preserving runtime
behavior.

Evidence collected:

- `npm outdated --json` showed stale `inquirer`, Rollup plugins, Rollup patch,
  and `rollup-plugin-delete` declarations.
- `npm audit --json` failed before this iteration because no lockfile existed.
- `package.json` `init` script pointed at missing `./src/init.js`.
- Required Codex workflow files were absent.

Verification completed:

- `node --test test/project-metadata.test.js` failed before the workflow and
  lockfile repair, then passed after the repair.
- `npm outdated --json` returned `{}` after dependency modernization.
- `npm audit` reported 0 vulnerabilities after `package-lock.json` was added.
- `npm ci --no-audit --no-fund` succeeded with the lockfile.
- `npm run verify` passed locally.
- `bash ./scripts/run-all.sh` passed locally.
- Local Docker smoke could not run because Docker CLI is not installed on this
  machine.

Residual risks:

- `inquirer` was upgraded across major versions; the interactive `npm run init`
  path needs syntax/build coverage and can be manually smoke-tested in a real
  terminal if prompt behavior changes.
- GitHub Actions still need to run on `main` after this iteration is pushed.
