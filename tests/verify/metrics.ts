import type { Feedback, Pose, SceneCommands, SceneInfo } from '../../src/contracts';
import { interactionSettings } from '../../src/contracts/interaction-settings';
import type { RecordedSession, SessionLabel } from '../../src/contracts/recorded-session';
import { GestureControl } from '../../src/core/gesture-control';
import { InteractionEngine } from '../../src/core/interaction-engine';
import { GestureInterpreter } from '../../src/motion/gesture-interpreter';
import { ReplayHandFrameSource } from '../../src/vision/replay-hand-frame-source';

const INITIAL_POSE: Pose = { position: { x: 0, y: 0 }, rotation: 0 };
const SCENE_INFO: SceneInfo = {
  bounds: () => ({ minX: -3, maxX: 3, minY: -2, maxY: 2 }),
  onBoundsChange: () => () => {},
};

interface Recognition {
  gesture: string;
  atMs: number;
}

export interface SessionMetrics {
  labelled: number;
  correct: number;
  perGesture: Record<string, number>;
  unintendedActions: number;
  unrelatedMs: number;
  recognitions: Recognition[];
}

/** Replays a session through the real Motion and Core, with the clock following frame times. */
function replay(session: RecordedSession): Recognition[] {
  const recognitions: Recognition[] = [];
  let clockMs = 0;
  const scene: SceneCommands = {
    setPose: () => {},
    showFeedback: (feedback: Feedback) => {
      if (feedback.kind === 'recognised' && feedback.gesture) {
        recognitions.push({ gesture: feedback.gesture, atMs: clockMs });
      }
    },
  };
  const source = new ReplayHandFrameSource(session.frames);
  source.onFrame((frame) => {
    clockMs = frame.timestampMs;
  });
  const engine = new InteractionEngine(scene, SCENE_INFO, INITIAL_POSE);
  const control = new GestureControl(engine, scene, SCENE_INFO, interactionSettings, () => clockMs);
  new GestureInterpreter(source).onInterpretation((item) => control.handle(item));
  void source.start();
  return recognitions;
}

const within = (label: SessionLabel, atMs: number) => atMs >= label.startMs && atMs <= label.endMs;

export function evaluateSessions(sessions: RecordedSession[]): SessionMetrics {
  const metrics: SessionMetrics = {
    labelled: 0,
    correct: 0,
    perGesture: {},
    unintendedActions: 0,
    unrelatedMs: 0,
    recognitions: [],
  };
  for (const session of sessions) {
    const recognitions = replay(session);
    metrics.recognitions.push(...recognitions);
    for (const label of session.labels) {
      const inLabel = recognitions.filter((item) => within(label, item.atMs));
      if (label.gesture === 'none') {
        metrics.unintendedActions += inLabel.length;
        metrics.unrelatedMs += label.endMs - label.startMs;
      } else {
        metrics.labelled += 1;
        metrics.perGesture[label.gesture] = (metrics.perGesture[label.gesture] ?? 0) + 1;
        if (inLabel[0]?.gesture === label.gesture) metrics.correct += 1;
      }
    }
  }
  return metrics;
}
