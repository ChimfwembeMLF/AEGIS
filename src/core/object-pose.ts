import type { MoveDelta, Pose, RotateDelta, SceneBounds } from '../contracts';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function wrapAngle(angle: number): number {
  const turn = 2 * Math.PI;
  const wrapped = ((angle + Math.PI) % turn + turn) % turn;
  return wrapped - Math.PI;
}

export function movePose(pose: Pose, delta: MoveDelta, bounds: SceneBounds): Pose {
  return {
    ...pose,
    position: {
      x: clamp(pose.position.x + delta.dx, bounds.minX, bounds.maxX),
      y: clamp(pose.position.y + delta.dy, bounds.minY, bounds.maxY),
    },
  };
}

export function clampPose(pose: Pose, bounds: SceneBounds): Pose {
  return movePose(pose, { dx: 0, dy: 0 }, bounds);
}

export function rotatePose(pose: Pose, delta: RotateDelta): Pose {
  return { ...pose, rotation: wrapAngle(pose.rotation + delta.dAngle) };
}

export function resetPose(initialPose: Pose): Pose {
  return { ...initialPose, position: { ...initialPose.position } };
}
