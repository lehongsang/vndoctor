const { spawnSync } = require('node:child_process');
const path = require('node:path');

const MIGRATIONS_DIR = './src/database/migrations';
const DATA_SOURCE = './src/database/data-source.ts';
const VALID_MODES = new Set(['create', 'generate']);

/**
 * Prints command usage and exits with a failed status.
 *
 * @param {string} message Human-readable validation error.
 * @returns {never} This function always exits the process.
 */
function exitWithUsage(message) {
  console.error(message);
  console.error('');
  console.error('Usage:');
  console.error('  npm run migration:create -- Name');
  console.error('  npm run migration:generate -- Name');
  process.exit(1);
}

/**
 * Normalizes a migration name into the repository migrations path.
 *
 * @param {string} input Migration name or explicit migration path.
 * @returns {string} CLI path passed to TypeORM.
 */
function resolveMigrationPath(input) {
  if (input.includes('/') || input.includes('\\')) {
    return input;
  }

  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(input)) {
    exitWithUsage(
      'Migration name must start with a letter and contain only letters, numbers, "_" or "-".',
    );
  }

  return path.posix.join(MIGRATIONS_DIR, input);
}

const [mode, migrationName, ...extraArgs] = process.argv.slice(2);

if (!VALID_MODES.has(mode)) {
  exitWithUsage('First argument must be "create" or "generate".');
}

if (!migrationName) {
  exitWithUsage('Migration name is required.');
}

const typeormArgs = [`migration:${mode}`, resolveMigrationPath(migrationName)];

if (mode === 'generate') {
  typeormArgs.push('-d', DATA_SOURCE);
}

typeormArgs.push(...extraArgs);

const tsNodeBin = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node',
);

const result = spawnSync(
  tsNodeBin,
  [
    '-r',
    'tsconfig-paths/register',
    './node_modules/typeorm/cli.js',
    ...typeormArgs,
  ],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
