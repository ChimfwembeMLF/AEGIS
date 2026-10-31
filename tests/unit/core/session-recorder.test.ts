import { describe, expect, it } from 'vitest';
import type { HandFrame, HandFrameSource } from '../../../src/contracts';
import { validateSession } from '../../../src/contracts/recorded-session';
import { SessionRecorder } from '../../../src/core/session-recorder';
import { frame, makeHand } from '../../helpers/hand-frames';

function setup() {
  let listener: (handFrame: HandFrame) => void = () => {};
  const source: HandFrameSource = {
    start: async () => {},
    stop: () => {},
    onFrame: (next) => {
      listener = next;
      return () => {};
    },
  };
  const recorder = new SessionRecorder(source, () => '2026-10-31');
  return { recorder, emit: (handFrame: HandFrame) => listener(handFrame) };
}

const details = { subjectId: 'maintainer-1', consent: true };

describe('SessionRecorder', () => {
  it('captures nothing before Start', () => {
    const { recorder, emit } = setup();
    emit(frame(1000, makeHand({ shape: 'pinch' })));
    recorder.start(details);
    emit(frame(1100, makeHand({ shape: 'pinch' })));
    expect(recorder.stop().frames.map((item) => item.timestampMs)).toEqual([1100]);
  });

  it('refuses to start without consent', () => {
    const { recorder, emit } = setup();
    expect(() => recorder.start({ ...details, consent: false })).toThrow(/consent/i);
    emit(frame(1000));
    expect(recorder.isRecording()).toBe(false);
  });

  it('refuses a subject id that could identify someone', () => {
    const { recorder } = setup();
    expect(() => recorder.start({ ...details, subjectId: 'Jane Doe' })).toThrow(/subject/i);
  });

  it('captures nothing after Stop', () => {
    const { recorder, emit } = setup();
    recorder.start(details);
    emit(frame(1000));
    const session = recorder.stop();
    emit(frame(1100));
    expect(session.frames).toHaveLength(1);
    expect(recorder.isRecording()).toBe(false);
  });

  it('records labels against frame times', () => {
    const { recorder, emit } = setup();
    recorder.start(details);
    emit(frame(1000));
    recorder.beginLabel('pinch-drag');
    emit(frame(1100));
    emit(frame(1200));
    recorder.endLabel();
    emit(frame(1300));
    expect(recorder.stop().labels).toEqual([{ gesture: 'pinch-drag', startMs: 1000, endMs: 1200 }]);
  });

  it('closes an open label on Stop', () => {
    const { recorder, emit } = setup();
    recorder.start(details);
    emit(frame(1000));
    recorder.beginLabel('open-palm');
    emit(frame(1100));
    expect(recorder.stop().labels).toEqual([{ gesture: 'open-palm', startMs: 1000, endMs: 1100 }]);
  });

  it('produces a session that passes validation', () => {
    const { recorder, emit } = setup();
    recorder.start(details);
    emit(frame(1000, makeHand({ shape: 'pinch' })));
    expect(validateSession(recorder.stop())).toEqual([]);
  });
});
