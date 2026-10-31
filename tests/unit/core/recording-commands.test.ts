import { describe, expect, it } from 'vitest';
import type { HandFrame, HandFrameSource } from '../../../src/contracts';
import { createRecordingCommands } from '../../../src/core/recording-commands';
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
  const commands = createRecordingCommands(new SessionRecorder(source, () => '2026-10-31'));
  return { commands, emit: (handFrame: HandFrame) => listener(handFrame) };
}

const details = { subjectId: 'maintainer-1', consent: true };

describe('recording commands', () => {
  it('returns the reason a recording cannot start', () => {
    expect(setup().commands.start({ ...details, consent: false })).toMatch(/consent/i);
  });

  it('returns no error when recording starts', () => {
    expect(setup().commands.start(details)).toBeNull();
  });

  it('returns a valid session on stop', () => {
    const { commands, emit } = setup();
    commands.start(details);
    emit(frame(1000, makeHand({ shape: 'pinch' })));
    const result = commands.stop();
    expect(result.session?.frames).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('refuses to save a session with nothing in it', () => {
    const { commands } = setup();
    commands.start(details);
    const result = commands.stop();
    expect(result.session).toBeUndefined();
    expect(result.error).toMatch(/frames/);
  });
});
