import { validateSession, type RecordingCommands } from '../contracts/recorded-session';
import type { SessionRecorder } from './session-recorder';

export function createRecordingCommands(recorder: SessionRecorder): RecordingCommands {
  return {
    start: (details) => {
      try {
        recorder.start(details);
        return null;
      } catch (error) {
        return (error as Error).message;
      }
    },
    label: (gesture) => (gesture ? recorder.beginLabel(gesture) : recorder.endLabel()),
    stop: () => {
      const session = recorder.stop();
      const [problem] = validateSession(session);
      return problem ? { error: problem } : { session };
    },
  };
}
