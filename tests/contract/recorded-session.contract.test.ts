import { describe, expect, it } from 'vitest';
import { validateSession, type RecordedSession } from '../../src/contracts/recorded-session';
import { frame, makeHand } from '../helpers/hand-frames';

function validSession(): RecordedSession {
  return {
    schemaVersion: 1,
    modelSha256: 'a'.repeat(64),
    subjectId: 'maintainer-1',
    consent: true,
    recordedOn: '2026-10-31',
    frames: [frame(1000, makeHand({ shape: 'pinch' })), frame(1033)],
    labels: [{ gesture: 'pinch-drag', startMs: 1000, endMs: 1033 }],
  };
}

const withChange = (change: (session: any) => void) => {
  const session = structuredClone(validSession());
  change(session);
  return session;
};

describe('Recorded Session format', () => {
  it('accepts a valid session', () => {
    expect(validateSession(validSession())).toEqual([]);
  });

  it.each([
    ['missing consent', (s: any) => delete s.consent],
    ['false consent', (s: any) => (s.consent = false)],
    ['wrong schema version', (s: any) => (s.schemaVersion = 2)],
    ['bad model checksum', (s: any) => (s.modelSha256 = 'abc')],
    ['identifying subject id', (s: any) => (s.subjectId = 'Jane Doe')],
    ['no frames', (s: any) => (s.frames = [])],
    ['too few landmarks', (s: any) => s.frames[0].hands[0].landmarks.pop()],
    ['tracking score out of range', (s: any) => (s.frames[0].hands[0].trackingScore = 2)],
    ['unknown gesture label', (s: any) => (s.labels[0].gesture = 'wave')],
    ['label ending before it starts', (s: any) => (s.labels[0].endMs = 1)],
    ['unknown top-level field', (s: any) => (s.video = 'data:video/mp4;base64,AAAA')],
    ['unknown frame field', (s: any) => (s.frames[0].image = 'data:image/png;base64,AAAA')],
    ['unknown hand field', (s: any) => (s.frames[0].hands[0].pixels = [1, 2, 3])],
    ['unknown landmark field', (s: any) => (s.frames[0].hands[0].landmarks[0].rgb = [0, 0, 0])],
    ['timestamps going backwards', (s: any) => (s.frames[1].timestampMs = 1)],
  ])('rejects %s', (_name, change) => {
    expect(validateSession(withChange(change)).length).toBeGreaterThan(0);
  });

  it('rejects something that is not an object', () => {
    expect(validateSession('session').length).toBeGreaterThan(0);
  });
});
