import type { Action, Pose, SceneCommands, SceneInfo } from '../contracts';
import { clampPose, movePose, resetPose, rotatePose } from './object-pose';

export class InteractionEngine {
  private pose: Pose;

  constructor(
    private readonly scene: SceneCommands,
    private readonly info: SceneInfo,
    private readonly initialPose: Pose,
  ) {
    this.pose = resetPose(initialPose);
  }

  start(): void {
    this.info.onBoundsChange(() => this.keepInBounds());
    this.scene.setPose(this.pose);
  }

  apply(action: Action): void {
    this.pose = this.nextPose(action);
    this.scene.setPose(this.pose);
  }

  private keepInBounds(): void {
    const clamped = clampPose(this.pose, this.info.bounds());
    const { x, y } = this.pose.position;
    if (clamped.position.x === x && clamped.position.y === y) return;
    this.pose = clamped;
    this.scene.setPose(this.pose);
  }

  private nextPose(action: Action): Pose {
    switch (action.type) {
      case 'move':
        return movePose(this.pose, action.delta, this.info.bounds());
      case 'rotate':
        return rotatePose(this.pose, action.delta);
      case 'reset':
        return resetPose(this.initialPose);
    }
  }
}
