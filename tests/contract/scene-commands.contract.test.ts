import { describe, expect, it } from 'vitest';
import type { Pose, SceneCommands, SceneInfo } from '../../src/contracts';
import { InteractionEngine } from '../../src/core/interaction-engine';

const initialPose: Pose = { position: { x: 0, y: 0 }, rotation: 0 };

function setup() {
  const poses: Pose[] = [];
  let bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  let notifyBounds = () => {};
  const scene: SceneCommands = {
    setPose: (pose) => poses.push(pose),
    showFeedback: () => {},
  };
  const info: SceneInfo = {
    bounds: () => bounds,
    onBoundsChange: (listener) => {
      notifyBounds = listener;
      return () => {};
    },
  };
  return {
    poses,
    engine: new InteractionEngine(scene, info, initialPose),
    shrinkTo: (limit: number) => {
      bounds = { minX: -limit, maxX: limit, minY: -limit, maxY: limit };
      notifyBounds();
    },
  };
}

describe('SceneCommands contract', () => {
  it('sends the initial pose on start', () => {
    const { poses, engine } = setup();
    engine.start();
    expect(poses).toEqual([initialPose]);
  });

  it('sends every pose change through setPose', () => {
    const { poses, engine } = setup();
    engine.apply({ type: 'move', source: 'keyboard', delta: { dx: 0.5, dy: 0 } });
    engine.apply({ type: 'rotate', source: 'keyboard', delta: { dAngle: 1 } });
    expect(poses).toHaveLength(2);
    expect(poses[1]?.position.x).toBeCloseTo(0.5);
    expect(poses[1]?.rotation).toBeCloseTo(1);
  });

  it('returns to the initial pose on reset', () => {
    const { poses, engine } = setup();
    engine.apply({ type: 'move', source: 'gesture', delta: { dx: 0.5, dy: 0.5 } });
    engine.apply({ type: 'reset', source: 'keyboard' });
    expect(poses.at(-1)).toEqual(initialPose);
  });

  it('brings the object back in when the bounds shrink', () => {
    const { poses, engine, shrinkTo } = setup();
    engine.start();
    engine.apply({ type: 'move', source: 'keyboard', delta: { dx: 1, dy: 1 } });
    shrinkTo(0.5);
    expect(poses.at(-1)?.position).toEqual({ x: 0.5, y: 0.5 });
  });

  it('sends nothing when new bounds still contain the object', () => {
    const { poses, engine, shrinkTo } = setup();
    engine.start();
    shrinkTo(0.5);
    expect(poses).toHaveLength(1);
  });

  it('keeps the object inside the bounds Spatial reports', () => {
    const { poses, engine } = setup();
    engine.apply({ type: 'move', source: 'keyboard', delta: { dx: 5, dy: 5 } });
    expect(poses.at(-1)?.position).toEqual({ x: 1, y: 1 });
  });
});
