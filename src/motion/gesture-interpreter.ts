import type {
  GestureInterpretation,
  GestureName,
  GesturePhase,
  GestureStream,
  HandFrame,
  HandFrameSource,
  HandMarkers,
  MoveDelta,
  RotateDelta,
  TrackedHand,
  Unsubscribe,
} from '../contracts';
import { interactionSettings } from '../contracts/interaction-settings';
import { palmConfidence, pinchConfidence } from './confidence';
import {
  angleBetween,
  gestureRules,
  handAngle,
  isAmbiguousPinch,
  isOpenPalm,
  isPinching,
  pinchRatio,
  travelBetween,
  wristPoint,
  type ViewPoint,
} from './gesture-rules';

type HandState =
  | { mode: 'idle' }
  | { mode: 'ambiguous'; sinceMs: number; reported: boolean }
  | { mode: 'palm'; sinceMs: number; origin: ViewPoint; fired: boolean }
  | { mode: 'pinch-pending'; wrist: ViewPoint; angle: number }
  | { mode: 'pinch-drag'; wrist: ViewPoint }
  | { mode: 'pinch-twist'; angle: number };

const IDLE: HandState = { mode: 'idle' };

function moveDelta(from: ViewPoint, to: ViewPoint): MoveDelta {
  return { dx: to.x - from.x, dy: to.y - from.y };
}

/** Turns Hand Frames into Gesture Interpretations. Depends only on frame content and timestamps. */
export class GestureInterpreter implements GestureStream {
  private readonly listeners = new Set<(item: GestureInterpretation) => void>();
  private readonly handListeners = new Set<(hands: HandMarkers[]) => void>();
  private readonly states = new Map<string, HandState>();
  private activeHandId: string | null = null;
  private recentLossesMs: number[] = [];
  private handInView = false;

  constructor(source: HandFrameSource) {
    source.onFrame((frame) => this.process(frame));
  }

  onInterpretation(listener: (item: GestureInterpretation) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onHands(listener: (hands: HandMarkers[]) => void): Unsubscribe {
    this.handListeners.add(listener);
    return () => this.handListeners.delete(listener);
  }

  process(frame: HandFrame): void {
    const firstHand = frame.hands[0];
    if (firstHand && !this.handInView) {
      this.handInView = true;
      this.emit('hand-present', 'start', firstHand.trackingScore, firstHand.handId, frame.timestampMs);
    }
    for (const hand of frame.hands) {
      if (this.activeHandId === null || this.activeHandId === hand.handId) {
        this.step(hand, frame.timestampMs);
      }
    }
    this.forgetLostHands(frame);
    if (!firstHand && this.handInView) {
      this.handInView = false;
      this.emit('hand-present', 'end', 0, 'none', frame.timestampMs);
    }
    const markers = frame.hands.map((hand) => this.markers(hand));
    this.handListeners.forEach((listener) => listener(markers));
  }

  private markers({ handId, landmarks, ...rest }: TrackedHand): HandMarkers {
    const hand = { handId, landmarks, ...rest };
    const mode = this.states.get(handId)?.mode;
    const pinching =
      mode === 'pinch-pending' || mode === 'pinch-drag' || mode === 'pinch-twist'
        ? true
        : isPinching(pinchRatio(hand), false);
    return { handId, landmarks, pinching };
  }

  private step(hand: TrackedHand, timestampMs: number): void {
    const state = this.states.get(hand.handId) ?? IDLE;

    if (state.mode !== 'pinch-drag' && state.mode !== 'pinch-twist' && state.mode !== 'palm') {
      if (hand.trackingScore < gestureRules.lowTrackingScore) {
        this.states.set(hand.handId, IDLE);
        this.release(hand.handId);
        this.emit('unknown', 'update', hand.trackingScore, hand.handId, timestampMs);
        return;
      }
    }

    const ratio = pinchRatio(hand);
    const wasPinching =
      state.mode === 'pinch-pending' || state.mode === 'pinch-drag' || state.mode === 'pinch-twist';

    if (isPinching(ratio, wasPinching)) {
      this.leaveNonPinchState(state, hand, timestampMs);
      this.stepPinch(hand, state, timestampMs);
    } else if (wasPinching) {
      this.endPinch(state, hand, timestampMs);
    } else if (isOpenPalm(hand)) {
      this.stepPalm(hand, state, timestampMs);
    } else {
      this.leaveNonPinchState(state, hand, timestampMs);
      this.stepUnclear(hand, ratio, state, timestampMs);
    }
  }

  private stepPinch(hand: TrackedHand, state: HandState, timestampMs: number): void {
    const wrist = wristPoint(hand);
    const angle = handAngle(hand);
    const confidence = pinchConfidence(hand);

    if (state.mode === 'pinch-drag') {
      const delta = moveDelta(state.wrist, wrist);
      this.states.set(hand.handId, { mode: 'pinch-drag', wrist });
      this.emit('pinch-drag', 'update', confidence, hand.handId, timestampMs, delta);
    } else if (state.mode === 'pinch-twist') {
      const delta: RotateDelta = { dAngle: angleBetween(state.angle, angle) };
      this.states.set(hand.handId, { mode: 'pinch-twist', angle });
      this.emit('pinch-twist', 'update', confidence, hand.handId, timestampMs, delta);
    } else if (state.mode === 'pinch-pending') {
      this.decidePinch(hand, state, wrist, angle, confidence, timestampMs);
    } else {
      this.activeHandId = hand.handId;
      this.states.set(hand.handId, { mode: 'pinch-pending', wrist, angle });
    }
  }

  /** The first clear motion picks the gesture, which then holds until the pinch ends. */
  private decidePinch(
    hand: TrackedHand,
    pending: Extract<HandState, { mode: 'pinch-pending' }>,
    wrist: ViewPoint,
    angle: number,
    confidence: number,
    timestampMs: number,
  ): void {
    const turned = angleBetween(pending.angle, angle);
    if (Math.abs(turned) >= gestureRules.twistDecisionAngle) {
      this.states.set(hand.handId, { mode: 'pinch-twist', angle });
      this.emit('pinch-twist', 'start', confidence, hand.handId, timestampMs, { dAngle: turned });
    } else if (travelBetween(pending.wrist, wrist) >= gestureRules.dragDecisionDistance) {
      this.states.set(hand.handId, { mode: 'pinch-drag', wrist });
      const delta = moveDelta(pending.wrist, wrist);
      this.emit('pinch-drag', 'start', confidence, hand.handId, timestampMs, delta);
    }
  }

  private endPinch(state: HandState, hand: TrackedHand, timestampMs: number): void {
    if (state.mode === 'pinch-drag' || state.mode === 'pinch-twist') {
      this.emit(state.mode, 'end', pinchConfidence(hand), hand.handId, timestampMs);
    }
    this.states.set(hand.handId, IDLE);
    this.release(hand.handId);
  }

  private stepPalm(hand: TrackedHand, state: HandState, timestampMs: number): void {
    const wrist = wristPoint(hand);
    if (state.mode !== 'palm' || travelBetween(state.origin, wrist) > gestureRules.palmStillnessLimit) {
      if (state.mode === 'palm' && state.fired) return;
      this.states.set(hand.handId, { mode: 'palm', sinceMs: timestampMs, origin: wrist, fired: false });
      return;
    }
    if (!state.fired && timestampMs - state.sinceMs >= interactionSettings.resetHoldMs) {
      this.activeHandId = hand.handId;
      this.states.set(hand.handId, { ...state, fired: true });
      this.emit('open-palm', 'start', palmConfidence(hand), hand.handId, timestampMs);
    }
  }

  private stepUnclear(
    hand: TrackedHand,
    ratio: number,
    state: HandState,
    timestampMs: number,
  ): void {
    if (!isAmbiguousPinch(ratio)) {
      this.states.set(hand.handId, IDLE);
      return;
    }
    if (state.mode !== 'ambiguous') {
      this.states.set(hand.handId, { mode: 'ambiguous', sinceMs: timestampMs, reported: false });
    } else if (!state.reported && timestampMs - state.sinceMs >= gestureRules.ambiguousHoldMs) {
      this.states.set(hand.handId, { ...state, reported: true });
      this.emit('unknown', 'start', hand.trackingScore / 2, hand.handId, timestampMs);
    }
  }

  /** A hand moving out of a held palm or an unclear shape closes that episode. */
  private leaveNonPinchState(state: HandState, hand: TrackedHand, timestampMs: number): void {
    if (state.mode === 'palm') {
      if (state.fired) this.emit('open-palm', 'end', palmConfidence(hand), hand.handId, timestampMs);
      this.states.set(hand.handId, IDLE);
      this.release(hand.handId);
    }
  }

  private forgetLostHands(frame: HandFrame): void {
    const present = new Set(frame.hands.map((hand) => hand.handId));
    for (const [handId, state] of this.states) {
      if (present.has(handId)) continue;
      const gesture = this.startedGesture(state);
      if (gesture) this.emit(gesture, 'end', 0, handId, frame.timestampMs);
      this.states.delete(handId);
      this.release(handId);
      this.noteLoss(handId, frame.timestampMs);
    }
  }

  /** One lost hand is someone lowering it. Several in a row is what fading light looks like. */
  private noteLoss(handId: string, timestampMs: number): void {
    const windowStartMs = timestampMs - gestureRules.repeatedLossWindowMs;
    this.recentLossesMs = this.recentLossesMs.filter((lossMs) => lossMs >= windowStartMs);
    this.recentLossesMs.push(timestampMs);
    if (this.recentLossesMs.length >= 2) this.emit('unknown', 'update', 0, handId, timestampMs);
  }

  private startedGesture(state: HandState): GestureName | null {
    if (state.mode === 'pinch-drag' || state.mode === 'pinch-twist') return state.mode;
    if (state.mode === 'palm' && state.fired) return 'open-palm';
    return null;
  }

  private release(handId: string): void {
    if (this.activeHandId === handId) this.activeHandId = null;
  }

  private emit(
    gesture: GestureName,
    phase: GesturePhase,
    confidence: number,
    handId: string,
    timestampMs: number,
    delta?: MoveDelta | RotateDelta,
  ): void {
    const item: GestureInterpretation = { gesture, phase, confidence, handId, timestampMs };
    if (delta) item.delta = delta;
    this.listeners.forEach((listener) => listener(item));
  }
}
