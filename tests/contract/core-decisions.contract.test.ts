import { describe, expect, it } from 'vitest';
import type { Feedback, GestureInterpretation, Pose, SceneCommands, SceneInfo } from '../../src/contracts';
import { interactionSettings as settings } from '../../src/contracts/interaction-settings';
import { GestureControl } from '../../src/core/gesture-control';
import { InteractionEngine } from '../../src/core/interaction-engine';

const initialPose: Pose = { position: { x: 0, y: 0 }, rotation: 0 };

function setup() {
  const poses: Pose[] = [];
  const feedback: Feedback[] = [];
  let time = 1000;
  const scene: SceneCommands = {
    setPose: (pose) => poses.push(pose),
    showFeedback: (item) => feedback.push(item),
  };
  const info: SceneInfo = {
    bounds: () => ({ minX: -3, maxX: 3, minY: -2, maxY: 2 }),
    onBoundsChange: () => () => {},
  };
  const engine = new InteractionEngine(scene, info, initialPose);
  const control = new GestureControl(engine, scene, info, settings, () => time);
  return {
    poses,
    feedback,
    control,
    setTime: (value: number) => {
      time = value;
    },
  };
}

function message(overrides: Partial<GestureInterpretation>): GestureInterpretation {
  return {
    gesture: 'pinch-drag',
    phase: 'start',
    confidence: 0.95,
    delta: { dx: 0.1, dy: 0 },
    handId: 'a',
    timestampMs: 1000,
    ...overrides,
  };
}

describe('per-action thresholds (FR-006)', () => {
  it.each([
    ['pinch-drag', settings.moveThreshold],
    ['pinch-twist', settings.rotateThreshold],
    ['open-palm', settings.resetThreshold],
  ] as const)('%s acts at its threshold and not below', (gesture, threshold) => {
    const delta = gesture === 'pinch-twist' ? { dAngle: 0.2 } : gesture === 'open-palm' ? undefined : { dx: 0.1, dy: 0 };

    const below = setup();
    below.control.handle(message({ gesture, delta, confidence: threshold - 0.01 }));
    expect(below.poses).toEqual([]);

    const at = setup();
    at.control.handle(message({ gesture, delta, confidence: threshold }));
    expect(at.poses).toHaveLength(1);
  });

  it('scales hand movement to the scene', () => {
    const { control, poses } = setup();
    control.handle(message({ delta: { dx: 0.3, dy: 0 } }));
    expect(poses[0]?.position.x).toBeCloseTo(3);
  });

  it('ignores low-confidence updates during a gesture, without ending it', () => {
    const { control, poses } = setup();
    control.handle(message({}));
    control.handle(message({ phase: 'update', confidence: 0.1 }));
    control.handle(message({ phase: 'update' }));
    expect(poses).toHaveLength(2);
  });
});

describe('feedback (FR-007)', () => {
  it('names an accepted gesture once', () => {
    const { control, feedback } = setup();
    control.handle(message({}));
    control.handle(message({ phase: 'update' }));
    expect(feedback).toEqual([expect.objectContaining({ kind: 'recognised', gesture: 'pinch-drag' })]);
  });

  it('reports a below-threshold gesture as not understood', () => {
    const { control, feedback } = setup();
    control.handle(message({ confidence: 0.1 }));
    expect(feedback[0]).toMatchObject({ kind: 'not-understood', message: 'Gesture not understood' });
  });

  it('reports an unknown gesture as not understood', () => {
    const { control, feedback, poses } = setup();
    control.handle(message({ gesture: 'unknown', delta: undefined, confidence: 0.4 }));
    expect(feedback[0]?.kind).toBe('not-understood');
    expect(poses).toEqual([]);
  });

  it('reports poor tracking after it lasts, and only once', () => {
    const { control, feedback, setTime } = setup();
    for (let time = 1000; time <= 3000; time += 100) {
      setTime(time);
      control.handle(message({ gesture: 'unknown', phase: 'update', delta: undefined, confidence: 0.3, timestampMs: time }));
    }
    expect(feedback.filter((item) => item.kind === 'poor-tracking')).toHaveLength(1);
    expect(feedback[0]?.message).toBe('Having trouble seeing your hand. Try better lighting.');
  });

  it('does not join up poor tracking from separate moments', () => {
    const { control, feedback, setTime } = setup();
    const unknown = (timestampMs: number) => {
      setTime(timestampMs);
      control.handle(message({ gesture: 'unknown', phase: 'update', delta: undefined, confidence: 0.3, timestampMs }));
    };
    unknown(1000);
    unknown(9000);
    expect(feedback).toEqual([]);
  });

  it('does not report brief poor tracking', () => {
    const { control, feedback, setTime } = setup();
    setTime(1100);
    control.handle(message({ gesture: 'unknown', phase: 'update', delta: undefined, confidence: 0.3, timestampMs: 1100 }));
    expect(feedback).toEqual([]);
  });
});

describe('hand presence', () => {
  const presence = (phase: GestureInterpretation['phase']) =>
    message({ gesture: 'hand-present', phase, delta: undefined });

  it('tells the person their hand has been seen, and what to do next', () => {
    const { control, feedback, poses } = setup();
    control.handle(presence('start'));
    expect(feedback[0]).toMatchObject({ kind: 'hand-state' });
    expect(feedback[0]?.message).toMatch(/hand detected/i);
    expect(poses).toEqual([]);
  });

  it('asks for a hand again when it leaves', () => {
    const { control, feedback } = setup();
    control.handle(presence('end'));
    expect(feedback[0]?.message).toBe('Raise a hand to begin');
  });

  it('does not take control from a gesture in progress', () => {
    const { control, poses } = setup();
    control.handle(message({}));
    control.handle(presence('start'));
    control.handle(message({ phase: 'update' }));
    expect(poses).toHaveLength(2);
  });
});

describe('stale input (FR-009)', () => {
  it('drops input older than the limit', () => {
    const { control, poses, setTime } = setup();
    setTime(1000 + settings.maxInputAgeMs + 1);
    control.handle(message({}));
    expect(poses).toEqual([]);
  });

  it('accepts input at the limit', () => {
    const { control, poses, setTime } = setup();
    setTime(1000 + settings.maxInputAgeMs);
    control.handle(message({}));
    expect(poses).toHaveLength(1);
  });

  it('still honours a late end, so a hand never keeps control forever', () => {
    const { control, poses, setTime } = setup();
    control.handle(message({}));
    setTime(5000);
    control.handle(message({ phase: 'end', delta: undefined }));
    setTime(5001);
    control.handle(message({ handId: 'b', timestampMs: 5001 }));
    expect(poses).toHaveLength(2);
  });
});

describe('one hand in control (FR-008)', () => {
  it('ignores another hand until the gesture ends', () => {
    const { control, poses } = setup();
    control.handle(message({ handId: 'a' }));
    control.handle(message({ handId: 'b', phase: 'start' }));
    control.handle(message({ handId: 'b', phase: 'update' }));
    expect(poses).toHaveLength(1);
    control.handle(message({ handId: 'a', phase: 'end', delta: undefined }));
    control.handle(message({ handId: 'b', phase: 'start' }));
    expect(poses).toHaveLength(2);
  });

  it('resets only once for one open palm', () => {
    const { control, poses } = setup();
    control.handle(message({ gesture: 'open-palm', delta: undefined }));
    control.handle(message({ gesture: 'open-palm', delta: undefined, phase: 'end' }));
    expect(poses).toHaveLength(1);
  });
});
