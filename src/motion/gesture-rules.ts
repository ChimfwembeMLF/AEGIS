import type { Landmark, TrackedHand } from '../contracts';

// Starting values, tuned against the evaluation dataset.
export const gestureRules = {
  /** Camera width over height; landmarks are normalised to each axis separately. */
  cameraAspect: 4 / 3,
  pinchEnterRatio: 0.35,
  pinchExitRatio: 0.55,
  /** Wrist travel, as a fraction of the view, that makes a pinch a drag. */
  dragDecisionDistance: 0.03,
  /** Hand roll, in radians, that makes a pinch a twist. */
  twistDecisionAngle: 0.2,
  /** Wrist travel allowed while holding an open palm. */
  palmStillnessLimit: 0.05,
  ambiguousHoldMs: 400,
  /** Equivalent to 0.75 handedness certainty; see src/vision/tracking-quality.ts. */
  lowTrackingScore: 0.5,
  /** Hands lost this close together suggest the tracker is struggling. */
  repeatedLossWindowMs: 2000,
} as const;

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_BASE = 5;
const INDEX_TIP = 8;
const MIDDLE_BASE = 9;
const PINKY_BASE = 17;
const FINGERS = [
  { middleJoint: 6, tip: 8 },
  { middleJoint: 10, tip: 12 },
  { middleJoint: 14, tip: 16 },
  { middleJoint: 18, tip: 20 },
] as const;

export interface ViewPoint {
  x: number;
  y: number;
}

function landmark(hand: TrackedHand, index: number): Landmark {
  const point = hand.landmarks[index];
  if (!point) throw new Error(`Hand is missing landmark ${index}`);
  return point;
}

/** Mirrors the image, so right and up match what the person sees. */
export function viewPoint(point: Landmark): ViewPoint {
  return { x: 1 - point.x, y: 1 - point.y };
}

export function wristPoint(hand: TrackedHand): ViewPoint {
  return viewPoint(landmark(hand, WRIST));
}

function distance(a: Landmark, b: Landmark): number {
  return Math.hypot((a.x - b.x) * gestureRules.cameraAspect, a.y - b.y);
}

function palmWidth(hand: TrackedHand): number {
  return distance(landmark(hand, INDEX_BASE), landmark(hand, PINKY_BASE));
}

export function pinchRatio(hand: TrackedHand): number {
  return distance(landmark(hand, THUMB_TIP), landmark(hand, INDEX_TIP)) / palmWidth(hand);
}

export function isPinching(ratio: number, wasPinching: boolean): boolean {
  return ratio < (wasPinching ? gestureRules.pinchExitRatio : gestureRules.pinchEnterRatio);
}

export function isAmbiguousPinch(ratio: number): boolean {
  return ratio >= gestureRules.pinchEnterRatio && ratio < gestureRules.pinchExitRatio;
}

export function handAngle(hand: TrackedHand): number {
  const wrist = viewPoint(landmark(hand, WRIST));
  const base = viewPoint(landmark(hand, MIDDLE_BASE));
  return Math.atan2(base.y - wrist.y, (base.x - wrist.x) * gestureRules.cameraAspect);
}

/** The smallest signed turn between two angles. */
export function angleBetween(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** How far the fingers are extended past straight-ish: 1 or more for an open hand. */
export function fingerExtension(hand: TrackedHand): number {
  const wrist = landmark(hand, WRIST);
  const extensions = FINGERS.map(
    ({ middleJoint, tip }) =>
      distance(wrist, landmark(hand, tip)) / distance(wrist, landmark(hand, middleJoint)),
  );
  return Math.min(...extensions);
}

export function isOpenPalm(hand: TrackedHand): boolean {
  return fingerExtension(hand) > 1.1 && pinchRatio(hand) >= gestureRules.pinchExitRatio;
}

export function travelBetween(from: ViewPoint, to: ViewPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}
