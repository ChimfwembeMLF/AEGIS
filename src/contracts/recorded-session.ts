import type { HandFrame, TrackedHand } from './index';

/** Must match MODEL_SHA256 in scripts/setup-model.mjs. */
export const TRACKING_MODEL_SHA256 =
  'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';

export const SUBJECT_ID_PATTERN = /^[a-z0-9-]{1,32}$/;

export type LabelledGesture = 'pinch-drag' | 'pinch-twist' | 'open-palm' | 'none';

const LABELLED_GESTURES: readonly string[] = ['pinch-drag', 'pinch-twist', 'open-palm', 'none'];

export interface SessionLabel {
  gesture: LabelledGesture;
  startMs: number;
  endMs: number;
}

/** See contracts/recorded-session.schema.json. Holds hand positions, and never images or audio. */
export interface RecordedSession {
  schemaVersion: 1;
  modelSha256: string;
  subjectId: string;
  consent: true;
  recordedOn: string;
  frames: HandFrame[];
  labels: SessionLabel[];
}

export interface RecordingDetails {
  subjectId: string;
  consent: boolean;
}

export interface RecordingResult {
  session?: RecordedSession;
  error?: string;
}

/** Sent by the recording controls. */
export interface RecordingCommands {
  /** Returns the reason it could not start, or null once recording has begun. */
  start(details: RecordingDetails): string | null;
  label(gesture: LabelledGesture | null): void;
  stop(): RecordingResult;
}

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Any field outside the format is rejected, so image data cannot slip into a session file. */
function onlyFields(value: Fields, allowed: string[], path: string): string[] {
  const missing = allowed.filter((key) => !(key in value)).map((key) => `${path}.${key} is missing`);
  const extra = Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .map((key) => `${path}.${key} is not allowed`);
  return [...missing, ...extra];
}

function validateHand(hand: unknown, path: string): string[] {
  if (!isObject(hand)) return [`${path} must be an object`];
  const errors = onlyFields(hand, ['handId', 'handedness', 'trackingScore', 'landmarks'], path);
  const { handId, handedness, trackingScore, landmarks } = hand as unknown as Partial<TrackedHand>;
  if (typeof handId !== 'string') errors.push(`${path}.handId must be text`);
  if (handedness !== 'left' && handedness !== 'right') errors.push(`${path}.handedness is invalid`);
  if (!isNumber(trackingScore) || trackingScore < 0 || trackingScore > 1) {
    errors.push(`${path}.trackingScore must be between 0 and 1`);
  }
  if (!Array.isArray(landmarks) || landmarks.length !== 21) {
    errors.push(`${path}.landmarks must have 21 entries`);
    return errors;
  }
  landmarks.forEach((point: unknown, index) => {
    const pointPath = `${path}.landmarks[${index}]`;
    if (!isObject(point)) {
      errors.push(`${pointPath} must be an object`);
      return;
    }
    errors.push(...onlyFields(point, ['x', 'y', 'z'], pointPath));
    if (![point.x, point.y, point.z].every(isNumber)) errors.push(`${pointPath} must be numbers`);
  });
  return errors;
}

function validateFrames(frames: unknown): string[] {
  if (!Array.isArray(frames) || frames.length === 0) return ['frames must not be empty'];
  let previousMs = -1;
  return frames.flatMap((frame: unknown, index) => {
    const path = `frames[${index}]`;
    if (!isObject(frame)) return [`${path} must be an object`];
    const errors = onlyFields(frame, ['timestampMs', 'hands'], path);
    if (!isNumber(frame.timestampMs) || frame.timestampMs <= previousMs) {
      errors.push(`${path}.timestampMs must increase`);
    } else {
      previousMs = frame.timestampMs;
    }
    if (!Array.isArray(frame.hands)) return [...errors, `${path}.hands must be a list`];
    return [
      ...errors,
      ...frame.hands.flatMap((hand: unknown, handIndex) =>
        validateHand(hand, `${path}.hands[${handIndex}]`),
      ),
    ];
  });
}

function validateLabels(labels: unknown): string[] {
  if (!Array.isArray(labels)) return ['labels must be a list'];
  return labels.flatMap((label: unknown, index) => {
    const path = `labels[${index}]`;
    if (!isObject(label)) return [`${path} must be an object`];
    const errors = onlyFields(label, ['gesture', 'startMs', 'endMs'], path);
    if (!LABELLED_GESTURES.includes(label.gesture as string)) errors.push(`${path}.gesture is invalid`);
    if (!isNumber(label.startMs) || !isNumber(label.endMs) || label.endMs < label.startMs) {
      errors.push(`${path} times are invalid`);
    }
    return errors;
  });
}

/** Returns what is wrong with a session; an empty list means it is valid. */
export function validateSession(value: unknown): string[] {
  if (!isObject(value)) return ['session must be an object'];
  const fields = ['schemaVersion', 'modelSha256', 'subjectId', 'consent', 'recordedOn', 'frames', 'labels'];
  const errors = onlyFields(value, fields, 'session');
  if (value.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (typeof value.modelSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.modelSha256)) {
    errors.push('modelSha256 is invalid');
  }
  if (typeof value.subjectId !== 'string' || !SUBJECT_ID_PATTERN.test(value.subjectId)) {
    errors.push('subjectId must be a short non-identifying id');
  }
  if (value.consent !== true) errors.push('consent must be true');
  if (typeof value.recordedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.recordedOn)) {
    errors.push('recordedOn must be a date');
  }
  return [...errors, ...validateFrames(value.frames), ...validateLabels(value.labels)];
}
