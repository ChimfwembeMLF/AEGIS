import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'vitest';
import { validateSession, type RecordedSession } from '../../src/contracts/recorded-session';
import { evaluateSessions } from './metrics';
import { buildReport, responsivenessChecks, type Check } from './report';

const DATASET_DIR = 'fixtures/sessions/v1';
const MODEL_PATH = 'public/models/hand_landmarker.task';
const MIN_PER_GESTURE = 20;
const MIN_UNRELATED_MS = 5 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const check = (fields: Check) => fields;

function loadDataset() {
  const manifest = JSON.parse(readFileSync(join(DATASET_DIR, 'manifest.json'), 'utf8')) as {
    datasetVersion: string;
    sessions: string[];
  };
  const sessions = manifest.sessions.map(
    (file) => JSON.parse(readFileSync(join(DATASET_DIR, file), 'utf8')) as RecordedSession,
  );
  const problems = sessions.flatMap((session, index) =>
    validateSession(session).map((problem) => `${manifest.sessions[index]}: ${problem}`),
  );
  const model = existsSync(MODEL_PATH) ? createHash('sha256').update(readFileSync(MODEL_PATH)).digest('hex') : '';
  const wrongModel = sessions.filter((session) => session.modelSha256 !== model).length;
  return { manifest, sessions, problems, wrongModel };
}

function datasetChecks(): { checks: Check[]; datasetVersion: string } {
  const { manifest, sessions, problems, wrongModel } = loadDataset();
  const metrics = evaluateSessions(sessions);
  const first = JSON.stringify(metrics);
  const repeatable = [1, 2].every(() => JSON.stringify(evaluateSessions(sessions)) === first);

  const invalid = problems.length > 0 || wrongModel > 0;
  if (problems.length > 0) console.error(problems.slice(0, 10).join('\n'));
  if (wrongModel > 0) console.error(`${wrongModel} session(s) were recorded with a different model`);

  const enoughGestures = ['pinch-drag', 'pinch-twist', 'open-palm'].every(
    (gesture) => (metrics.perGesture[gesture] ?? 0) >= MIN_PER_GESTURE,
  );
  const enoughUnrelated = metrics.unrelatedMs >= MIN_UNRELATED_MS;
  const accuracy = metrics.labelled > 0 ? (metrics.correct / metrics.labelled) * 100 : null;
  const unintended = metrics.unrelatedMs > 0 ? (metrics.unintendedActions / metrics.unrelatedMs) * FIVE_MINUTES_MS : null;

  const statusFor = (enough: boolean, met: boolean): Check['status'] => {
    if (invalid) return 'fail';
    if (!enough) return 'not-measured';
    return met ? 'pass' : 'fail';
  };

  return {
    datasetVersion: manifest.datasetVersion,
    checks: [
      check({
        id: 'SC-002',
        description: `Gestures recognised correctly (${metrics.correct} of ${metrics.labelled}; needs ${MIN_PER_GESTURE} of each)`,
        target: 'at least 90',
        measured: accuracy,
        unit: 'percent',
        status: statusFor(enoughGestures, (accuracy ?? 0) >= 90),
      }),
      check({
        id: 'SC-003',
        description: 'Unintended actions during unrelated hand movement (needs 5 minutes)',
        target: 'at most 1',
        measured: unintended,
        unit: 'per 5 minutes',
        status: statusFor(enoughUnrelated, (unintended ?? Number.POSITIVE_INFINITY) <= 1),
      }),
      check({
        id: 'SC-009',
        description: 'Three replays of the dataset give identical results',
        target: 'identical',
        measured: sessions.length > 0 ? (repeatable ? 1 : 0) : null,
        unit: 'identical (1 = yes)',
        status: statusFor(sessions.length > 0, repeatable),
      }),
    ],
  };
}

it('writes the verification report', () => {
  const dataset = datasetChecks();
  const path = 'reports/responsiveness.json';
  const responsiveness = responsivenessChecks(
    existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { skipped: 'not run' },
  );
  const report = buildReport([...dataset.checks, ...responsiveness.checks], {
    datasetVersion: dataset.datasetVersion,
    createdAt: new Date().toISOString(),
    ...(responsiveness.renderer ? { renderer: responsiveness.renderer } : {}),
  });
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/verification.json', `${JSON.stringify(report, null, 2)}\n`);
});
