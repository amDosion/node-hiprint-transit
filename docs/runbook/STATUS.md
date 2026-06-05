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
- GitHub Actions passed on `main`:
  - CI: https://github.com/amDosion/node-hiprint-transit/actions/runs/27026712598
  - GHCR build/push:
    https://github.com/amDosion/node-hiprint-transit/actions/runs/27026712612

Residual risks:

- `inquirer` was upgraded across major versions; the interactive `npm run init`
  path needs syntax/build coverage and can be manually smoke-tested in a real
  terminal if prompt behavior changes.

## 2026-06-06 - Runtime boundary follow-up

Owner: ops

Objective: close code-level review findings found after dependency/workflow
modernization.

Fixes:

- Added `normalizeConfig` so empty tokens, invalid ports, invalid locales, and
  empty config content fall back deterministically.
- Moved printer filtering into a tested protocol helper and made missing printer
  lists return `[]` instead of allowing callers to crash on `.forEach`.

Verification completed:

- `node --test test/config.test.js` failed before `normalizeConfig` existed and
  passed after the fix.
- `node --test test/protocol.test.js` failed before `filterPrinters` was
  exported and passed after the fix.
- `npm run verify` passed locally.

Residual risks:

- Local Docker smoke remains covered by GitHub Actions because Docker CLI is not
  installed on this machine.
