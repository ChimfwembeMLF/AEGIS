// Contract version 4. See specs/001-project-foundation/contracts/module-contracts.md.
export const CONTRACT_VERSION = 4;

export type Unsubscribe = () => void;

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface TrackedHand {
  handId: string;
  handedness: 'left' | 'right';
  /** How readable the hand is, from 0 to 1. Low values do occur. */
  trackingScore: number;
  /** Exactly 21 landmarks, normalised to the camera image. */
  landmarks: Landmark[];
}

/** One processed camera frame. Never contains image data. */
export interface HandFrame {
  timestampMs: number;
  hands: TrackedHand[];
}

export type GestureName = 'pinch-drag' | 'pinch-twist' | 'open-palm' | 'unknown' | 'hand-present';
export type GesturePhase = 'start' | 'update' | 'end';

/** Fractions of the view; positive is right and up, as the person sees it. */
export interface MoveDelta {
  dx: number;
  dy: number;
}

/** Radians; positive is anticlockwise, as the person sees it. */
export interface RotateDelta {
  dAngle: number;
}

export interface GestureInterpretation {
  gesture: GestureName;
  phase: GesturePhase;
  confidence: number;
  delta?: MoveDelta | RotateDelta;
  handId: string;
  timestampMs: number;
}

export type ActionSource = 'gesture' | 'keyboard';

export type Action =
  | { type: 'move'; source: ActionSource; delta: MoveDelta }
  | { type: 'rotate'; source: ActionSource; delta: RotateDelta }
  | { type: 'reset'; source: ActionSource };

export interface Pose {
  position: { x: number; y: number };
  rotation: number;
}

export interface SceneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type FeedbackKind =
  | 'recognised'
  | 'not-understood'
  | 'capture-state'
  | 'poor-tracking'
  | 'hand-state';

export interface Feedback {
  kind: FeedbackKind;
  gesture?: GestureName;
  /** Present on `capture-state` feedback. */
  captureState?: CaptureState;
  message: string;
}

export type CaptureState = 'starting' | 'active' | 'stopped' | 'unavailable';
export type UnavailableReason =
  | 'no-camera'
  | 'camera-busy'
  | 'permission-denied'
  | 'camera-lost'
  | 'tracking-failed';

export interface CaptureSession {
  state: CaptureState;
  reason?: UnavailableReason;
}

export interface HandFrameSource {
  start(): Promise<void>;
  stop(): void;
  onFrame(listener: (frame: HandFrame) => void): Unsubscribe;
}

export interface GestureStream {
  onInterpretation(listener: (interpretation: GestureInterpretation) => void): Unsubscribe;
  onHands(listener: (hands: HandMarkers[]) => void): Unsubscribe;
}

export interface SceneCommands {
  setPose(pose: Pose): void;
  showFeedback(feedback: Feedback): void;
}

/** What to draw for one hand. Never contains image data. */
export interface HandMarkers {
  handId: string;
  landmarks: Landmark[];
  pinching: boolean;
}

export interface CameraViewState {
  visible: boolean;
  hiddenByPerson: boolean;
}

export interface CameraDisplay {
  showHands(hands: HandMarkers[]): void;
  showCameraView(view: CameraViewState): void;
}

export interface CameraViewCommands {
  toggle(): void;
}

/** The live camera element, for display only. It is not copied, saved or sent anywhere. */
export interface CameraFeed {
  readonly element: HTMLVideoElement;
}

export interface CaptureControl {
  start(): Promise<void>;
  stop(): void;
  onStateChange(listener: (session: CaptureSession) => void): Unsubscribe;
}

export interface SceneInfo {
  bounds(): SceneBounds;
  onBoundsChange(listener: () => void): Unsubscribe;
}

export interface CaptureCommands {
  toggle(): void;
}
