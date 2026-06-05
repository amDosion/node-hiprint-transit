import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio ?? 'pipe',
    encoding: 'utf8',
  });
}

function hasCommand(command, args = ['--version']) {
  return run(command, args).status === 0;
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function windowsPathToWslPath(value) {
  const match = /^([a-zA-Z]):[\\/](.*)$/.exec(value);
  if (!match) return value.replace(/\\/g, '/');
  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, '/');
  return `/mnt/${drive}/${rest}`;
}

function main() {
  if (hasCommand('docker')) {
    const result = run('bash', ['./scripts/docker-smoke.sh'], {
      stdio: 'inherit',
    });
    process.exit(result.status ?? 1);
  }

  if (process.platform === 'win32' && hasCommand('wsl')) {
    const wslPath = windowsPathToWslPath(process.cwd());
    const result = run(
      'wsl',
      [
        '-u',
        'root',
        '-e',
        'sh',
        '-lc',
        `cd ${shellQuote(wslPath)} && bash ./scripts/docker-smoke.sh`,
      ],
      {
        stdio: 'inherit',
      },
    );
    process.exit(result.status ?? 1);
  }

  console.error('docker CLI is required for Docker smoke testing.');
  process.exit(127);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
