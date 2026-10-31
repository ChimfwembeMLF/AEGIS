import { fingerExtension, gestureRules, pinchRatio } from './gesture-rules';
import type { TrackedHand } from '../contracts';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 1 for a clear pinch, falling to 0 at the point the pinch is released. */
function pinchMargin(hand: TrackedHand): number {
  const { pinchEnterRatio, pinchExitRatio } = gestureRules;
  return clamp01((pinchExitRatio - pinchRatio(hand)) / (pinchExitRatio - pinchEnterRatio));
}

/** 1 for fully extended fingers, falling to 0 for fingers that are barely open. */
function palmMargin(hand: TrackedHand): number {
  return clamp01((fingerExtension(hand) - 1.1) / 0.1);
}

export function pinchConfidence(hand: TrackedHand): number {
  return hand.trackingScore * pinchMargin(hand);
}

export function palmConfidence(hand: TrackedHand): number {
  return hand.trackingScore * palmMargin(hand);
}
