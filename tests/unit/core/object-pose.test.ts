import { describe, expect, it } from 'vitest';
import type { Pose, SceneBounds } from '../../../src/contracts';
import { movePose, resetPose, rotatePose } from '../../../src/core/object-pose';

const bounds: SceneBounds = { minX: -2, maxX: 2, minY: -1, maxY: 1 };
const origin: Pose = { position: { x: 0, y: 0 }, rotation: 0 };

describe('object pose', () => {
  it('moves by the delta', () => {
    expect(movePose(origin, { dx: 1, dy: -0.5 }, bounds).position).toEqual({ x: 1, y: -0.5 });
  });

  it('keeps the object inside the scene bounds', () => {
    expect(movePose(origin, { dx: 9, dy: 9 }, bounds).position).toEqual({ x: 2, y: 1 });
    expect(movePose(origin, { dx: -9, dy: -9 }, bounds).position).toEqual({ x: -2, y: -1 });
  });

  it('rotates by the delta', () => {
    expect(rotatePose(origin, { dAngle: 0.5 }).rotation).toBeCloseTo(0.5);
  });

  it('wraps rotation to one turn', () => {
    const rotated = rotatePose({ ...origin, rotation: Math.PI - 0.1 }, { dAngle: 0.3 });
    expect(rotated.rotation).toBeCloseTo(-Math.PI + 0.2);
  });

  it('resets to a copy of the initial pose', () => {
    const initial: Pose = { position: { x: 1, y: 1 }, rotation: 1 };
    const reset = resetPose(initial);
    expect(reset).toEqual(initial);
    expect(reset).not.toBe(initial);
  });
});
