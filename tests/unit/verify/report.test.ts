import { describe, expect, it } from 'vitest';
import { buildReport, isSoftwareRenderer, responsivenessChecks, type Check } from '../../verify/report';
import { evaluateSessions } from '../../verify/metrics';
import type { RecordedSession } from '../../../src/contracts/recorded-session';
import { frame, makeHand } from '../../helpers/hand-frames';

const check = (id: string, status: Check['status']): Check => ({
  id,
  description: id,
  target: 'target',
  measured: status === 'not-measured' ? null : 1,
  unit: 'unit',
  status,
});

const options = { datasetVersion: 'v1', createdAt: '2026-10-31T00:00:00Z', renderer: 'Intel Iris Pro' };

describe('verification report', () => {
  it('passes when every target is met', () => {
    expect(buildReport([check('SC-002', 'pass')], options).result).toBe('pass');
  });

  it('fails on a missed target, and the report names it', () => {
    const report = buildReport([check('SC-002', 'pass'), check('SC-004', 'fail')], options);
    expect(report.result).toBe('fail');
    expect(report.checks.filter((item) => item.status === 'fail').map((item) => item.id)).toEqual(['SC-004']);
  });

  it('is incomplete, never pass, when a target was not measured', () => {
    expect(buildReport([check('SC-002', 'pass'), check('SC-005', 'not-measured')], options).result).toBe('incomplete');
  });

  it('lets a failure outrank an unmeasured target', () => {
    expect(buildReport([check('SC-002', 'fail'), check('SC-005', 'not-measured')], options).result).toBe('fail');
  });

  it('is incomplete when there are no checks', () => {
    expect(buildReport([], options).result).toBe('incomplete');
  });

  it.each([
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', true],
    ['llvmpipe (LLVM 15.0.7, 256 bits)', true],
    ['ANGLE (Intel Inc., Intel Iris Pro OpenGL Engine, OpenGL 4.1)', false],
  ])('classifies %s', (renderer, expected) => {
    expect(isSoftwareRenderer(renderer)).toBe(expected);
  });
});

describe('responsiveness checks', () => {
  const measured = {
    renderer: 'Intel Iris Pro',
    delegate: 'GPU',
    feedbackP95Ms: 50,
    framesPerSecond: 40,
    trackingP95Ms: 20,
    pointsP95Ms: 60,
  };
  const status = (id: string, result: Parameters<typeof responsivenessChecks>[0]) =>
    responsivenessChecks(result).checks.find((item) => item.id === id)?.status;

  it('checks the hand-tracking budget', () => {
    expect(status('PLAN-TRACKING', measured)).toBe('pass');
    expect(status('PLAN-TRACKING', { ...measured, trackingP95Ms: 90 })).toBe('fail');
  });

  it('checks how quickly hand points update', () => {
    expect(status('SC-011', measured)).toBe('pass');
    expect(status('SC-011', { ...measured, pointsP95Ms: 150 })).toBe('fail');
  });

  it('does not count a software renderer', () => {
    const software = { ...measured, renderer: 'SwiftShader' };
    expect(status('SC-004', software)).toBe('not-measured');
    expect(status('PLAN-TRACKING', software)).toBe('not-measured');
  });

  it('marks everything unmeasured when the benchmark was skipped', () => {
    const { checks } = responsivenessChecks({ skipped: 'no photo' });
    expect(checks.every((item) => item.status === 'not-measured')).toBe(true);
  });
});

function dragFrames(startMs: number) {
  return [0.3, 0.35, 0.4, 0.45].map((x, index) =>
    frame(startMs + index * 33, makeHand({ shape: 'pinch', wrist: { x, y: 0.3 } })),
  ).concat(frame(startMs + 132, makeHand({ shape: 'relaxed', wrist: { x: 0.45, y: 0.3 } })));
}

function session(frames: ReturnType<typeof frame>[], labels: RecordedSession['labels']): RecordedSession {
  return {
    schemaVersion: 1,
    modelSha256: 'a'.repeat(64),
    subjectId: 'maintainer-1',
    consent: true,
    recordedOn: '2026-10-31',
    frames,
    labels,
  };
}

describe('session metrics', () => {
  it('counts a labelled gesture that is recognised', () => {
    const result = evaluateSessions([
      session(dragFrames(1000), [{ gesture: 'pinch-drag', startMs: 1000, endMs: 1132 }]),
    ]);
    expect(result.labelled).toBe(1);
    expect(result.correct).toBe(1);
    expect(result.perGesture['pinch-drag']).toBe(1);
  });

  it('does not count a labelled gesture recognised as something else', () => {
    const result = evaluateSessions([
      session(dragFrames(1000), [{ gesture: 'pinch-twist', startMs: 1000, endMs: 1132 }]),
    ]);
    expect(result.correct).toBe(0);
  });

  it('does not count a span whose first recognition was the wrong gesture', () => {
    const twist = [0, 0.3, 0.5].map((roll, index) => frame(1000 + index * 33, makeHand({ shape: 'pinch', roll })));
    const release = frame(1100, makeHand({ shape: 'relaxed', roll: 0.5 }));
    const result = evaluateSessions([
      session([...twist, release, ...dragFrames(1200)], [{ gesture: 'pinch-drag', startMs: 1000, endMs: 1400 }]),
    ]);
    expect(result.correct).toBe(0);
  });

  it('counts recognition during unrelated movement as unintended', () => {
    const result = evaluateSessions([
      session(dragFrames(1000), [{ gesture: 'none', startMs: 1000, endMs: 61000 }]),
    ]);
    expect(result.unintendedActions).toBe(1);
    expect(result.unrelatedMs).toBe(60000);
  });

  it('gives identical results on repeated runs', () => {
    const sessions = [session(dragFrames(1000), [{ gesture: 'pinch-drag', startMs: 1000, endMs: 1132 }])];
    expect(evaluateSessions(sessions)).toEqual(evaluateSessions(sessions));
  });
});
