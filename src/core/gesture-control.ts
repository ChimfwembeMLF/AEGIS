import type {
  Action,
  Feedback,
  GestureInterpretation,
  GestureName,
  MoveDelta,
  RotateDelta,
  SceneCommands,
  SceneInfo,
} from '../contracts';
import type { InteractionSettings } from '../contracts/interaction-settings';
import type { InteractionEngine } from './interaction-engine';

/** Share of the view a hand crosses to carry the object from one edge of the scene to the other. */
const HAND_TRAVEL_FOR_FULL_SCENE = 0.6;
const POOR_TRACKING_AFTER_MS = 1500;
/** Poor readings further apart than this are separate moments, not one sustained problem. */
const POOR_TRACKING_MAX_GAP_MS = 1000;

const GESTURE_LABELS: Partial<Record<GestureName, string>> = {
  'pinch-drag': 'Pinch and drag',
  'pinch-twist': 'Pinch and twist',
  'open-palm': 'Open palm',
};

const NOT_UNDERSTOOD: Feedback = { kind: 'not-understood', message: 'Gesture not understood' };
const HAND_SEEN: Feedback = {
  kind: 'hand-state',
  message: 'Hand detected. Pinch and move it, or hold an open palm.',
};
const NO_HAND: Feedback = { kind: 'hand-state', message: 'Raise a hand to begin' };
const POOR_TRACKING: Feedback = {
  kind: 'poor-tracking',
  message: 'Having trouble seeing your hand. Try better lighting.',
};

type ControlState =
  | { mode: 'idle' }
  | { mode: 'controlled'; handId: string }
  | { mode: 'suspended' };

/** Decides whether an interpretation becomes an action. Only Core makes this decision. */
export class GestureControl {
  private state: ControlState = { mode: 'idle' };
  private poorTrackingSinceMs: number | null = null;
  private poorTrackingLastMs = 0;
  private poorTrackingReported = false;

  constructor(
    private readonly engine: InteractionEngine,
    private readonly scene: SceneCommands,
    private readonly info: SceneInfo,
    private readonly settings: InteractionSettings,
    private readonly now: () => number,
  ) {}

  /** The keyboard takes priority over gestures until every key is released. */
  setKeyboardHeld(held: boolean): void {
    this.state = held ? { mode: 'suspended' } : { mode: 'idle' };
  }

  handle(item: GestureInterpretation): void {
    if (item.gesture === 'hand-present') {
      this.scene.showFeedback(item.phase === 'start' ? HAND_SEEN : NO_HAND);
      return;
    }
    if (this.state.mode === 'suspended') return;
    if (item.phase === 'end') {
      this.handleEnd(item);
      return;
    }
    if (this.now() - item.timestampMs > this.settings.maxInputAgeMs) return;

    if (item.gesture === 'unknown') {
      this.handleUnknown(item);
      return;
    }
    this.poorTrackingSinceMs = null;
    this.poorTrackingReported = false;

    if (this.state.mode === 'controlled') {
      if (this.state.handId === item.handId) this.continueGesture(item);
    } else {
      this.tryStartGesture(item);
    }
  }

  private handleEnd(item: GestureInterpretation): void {
    if (this.state.mode === 'controlled' && this.state.handId === item.handId) {
      this.state = { mode: 'idle' };
    }
  }

  private handleUnknown(item: GestureInterpretation): void {
    if (item.phase === 'start') {
      if (this.state.mode === 'idle') this.scene.showFeedback(NOT_UNDERSTOOD);
      return;
    }
    if (item.timestampMs - this.poorTrackingLastMs > POOR_TRACKING_MAX_GAP_MS) {
      this.poorTrackingSinceMs = null;
      this.poorTrackingReported = false;
    }
    this.poorTrackingLastMs = item.timestampMs;
    this.poorTrackingSinceMs ??= item.timestampMs;
    const lasted = item.timestampMs - this.poorTrackingSinceMs >= POOR_TRACKING_AFTER_MS;
    if (lasted && !this.poorTrackingReported) {
      this.poorTrackingReported = true;
      this.scene.showFeedback(POOR_TRACKING);
    }
  }

  private tryStartGesture(item: GestureInterpretation): void {
    if (item.confidence < this.thresholdFor(item.gesture)) {
      if (item.phase === 'start') this.scene.showFeedback(NOT_UNDERSTOOD);
      return;
    }
    this.state = { mode: 'controlled', handId: item.handId };
    this.scene.showFeedback({
      kind: 'recognised',
      gesture: item.gesture,
      message: GESTURE_LABELS[item.gesture] ?? item.gesture,
    });
    this.act(item);
  }

  private continueGesture(item: GestureInterpretation): void {
    if (item.confidence >= this.thresholdFor(item.gesture)) this.act(item);
  }

  private act(item: GestureInterpretation): void {
    const action = this.toAction(item);
    if (action) this.engine.apply(action);
  }

  private toAction(item: GestureInterpretation): Action | null {
    switch (item.gesture) {
      case 'pinch-drag': {
        const delta = item.delta as MoveDelta | undefined;
        return delta ? { type: 'move', source: 'gesture', delta: this.toSceneUnits(delta) } : null;
      }
      case 'pinch-twist': {
        const delta = item.delta as RotateDelta | undefined;
        return delta ? { type: 'rotate', source: 'gesture', delta } : null;
      }
      case 'open-palm':
        return { type: 'reset', source: 'gesture' };
      case 'unknown':
      case 'hand-present':
        return null;
    }
  }

  private toSceneUnits(delta: MoveDelta): MoveDelta {
    const { minX, maxX, minY, maxY } = this.info.bounds();
    return {
      dx: (delta.dx * (maxX - minX)) / HAND_TRAVEL_FOR_FULL_SCENE,
      dy: (delta.dy * (maxY - minY)) / HAND_TRAVEL_FOR_FULL_SCENE,
    };
  }

  private thresholdFor(gesture: GestureName): number {
    switch (gesture) {
      case 'pinch-drag':
        return this.settings.moveThreshold;
      case 'pinch-twist':
        return this.settings.rotateThreshold;
      case 'open-palm':
        return this.settings.resetThreshold;
      case 'unknown':
      case 'hand-present':
        return Number.POSITIVE_INFINITY;
    }
  }
}
