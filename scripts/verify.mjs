// Runs the responsiveness benchmark and the dataset evaluation, then prints one combined report.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';

function run(command, args) {
  return spawnSync(command, args, { stdio: 'inherit' }).status === 0;
}

rmSync('reports', { recursive: true, force: true });

if (!run('yarn', ['vite', 'build', '--mode', 'e2e'])) process.exit(1);
run('yarn', ['playwright', 'test', '-c', 'playwright.verify.config.ts']);
run('yarn', ['vitest', 'run', '--project', 'verify']);

if (!existsSync('reports/verification.json')) {
  console.error('Verification did not produce a report.');
  process.exit(1);
}

const report = JSON.parse(readFileSync('reports/verification.json', 'utf8'));
console.log(`\nDataset ${report.datasetVersion}  Renderer: ${report.renderer ?? 'not measured'}\n`);
for (const check of report.checks) {
  const measured = check.measured === null ? 'not measured' : `${check.measured.toFixed(1)} ${check.unit}`;
  console.log(`${check.status.padEnd(13)}${check.id}  ${measured}  (target ${check.target})`);
  console.log(`             ${check.description}`);
}
console.log(`\nresult: ${report.result}`);
process.exit(report.result === 'pass' ? 0 : 1);
