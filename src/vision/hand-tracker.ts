import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandFrame, TrackedHand } from '../contracts';
import { assignHandIds, type KnownHand } from './hand-identity';
import { trackingQuality } from './tracking-quality';

const WASM_PATH = '/wasm';
const MODEL_PATH = '/models/hand_landmarker.task';

export type Delegate = 'GPU' | 'CPU';

export class HandTracker {
  private knownHands: KnownHand[] = [];
  private nextHandId = 1;

  private constructor(
    private readonly landmarker: HandLandmarker,
    readonly delegate: Delegate,
  ) {}

  static async create(): Promise<HandTracker> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const load = (delegate: Delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    try {
      return new HandTracker(await load('GPU'), 'GPU');
    } catch {
      return new HandTracker(await load('CPU'), 'CPU');
    }
  }

  detect(video: TexImageSource, timestampMs: number): HandFrame {
    const result = this.landmarker.detectForVideo(video as HTMLVideoElement, timestampMs);
    const wrists = result.landmarks.map((landmarks) => landmarks[0] ?? { x: 0, y: 0 });
    this.knownHands = assignHandIds(wrists, this.knownHands, () => `hand-${this.nextHandId++}`);

    const hands: TrackedHand[] = result.landmarks.map((landmarks, index) => {
      const category = result.handedness[index]?.[0];
      return {
        handId: this.knownHands[index]?.id ?? `hand-${index}`,
        handedness: category?.categoryName === 'Left' ? 'left' : 'right',
        trackingScore: trackingQuality(category?.score ?? 0),
        landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
      };
    });
    return { timestampMs, hands };
  }
}
