import type { HandFrame, Landmark, TrackedHand } from '../../src/contracts';

export type HandShape = 'pinch' | 'near-pinch' | 'open' | 'relaxed';

export interface HandOptions {
  shape: HandShape;
  /** Wrist position as a fraction of the view the person sees (x right, y up). */
  wrist?: { x: number; y: number };
  /** Radians, anticlockwise as the person sees it. */
  roll?: number;
  score?: number;
  handId?: string;
}

const ASPECT = 4 / 3;

const OPEN_HAND: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [-0.05, 0.03], [-0.08, 0.06], [-0.11, 0.09], [-0.13, 0.12],
  [-0.045, 0.15], [-0.05, 0.2], [-0.05, 0.23], [-0.05, 0.26],
  [0, 0.155], [0, 0.21], [0, 0.25], [0, 0.29],
  [0.04, 0.15], [0.045, 0.2], [0.045, 0.235], [0.045, 0.265],
  [0.08, 0.13], [0.09, 0.17], [0.095, 0.195], [0.1, 0.22],
];

function shaped(shape: HandShape): Array<[number, number]> {
  const points = OPEN_HAND.map(([u, v]) => [u, v] as [number, number]);
  if (shape === 'open') return points;

  // Fingers curl so each tip sits closer to the wrist than its middle joint.
  for (const [tip, dip] of [[12, 11], [16, 15], [20, 19]] as const) {
    const base = points[tip - 3] as [number, number];
    points[dip] = [base[0], base[1] - 0.02];
    points[tip] = [base[0], base[1] - 0.04];
  }
  points[7] = [-0.05, 0.19];
  points[8] = [-0.055, 0.17];

  const indexTip = points[8] as [number, number];
  if (shape === 'pinch') points[4] = [indexTip[0] + 0.01, indexTip[1] - 0.005];
  if (shape === 'near-pinch') points[4] = [indexTip[0] - 0.056, indexTip[1]];
  if (shape === 'relaxed') points[4] = [-0.15, 0.1];
  return points;
}

export function makeHand(options: HandOptions): TrackedHand {
  const { shape, wrist = { x: 0.5, y: 0.3 }, roll = 0, score = 0.95, handId = 'hand-1' } = options;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const landmarks: Landmark[] = shaped(shape).map(([u, v]) => {
    const viewX = wrist.x * ASPECT + u * cos - v * sin;
    const viewY = wrist.y + u * sin + v * cos;
    return { x: 1 - viewX / ASPECT, y: 1 - viewY, z: 0 };
  });
  return { handId, handedness: 'right', trackingScore: score, landmarks };
}

export function frame(timestampMs: number, ...hands: TrackedHand[]): HandFrame {
  return { timestampMs, hands };
}
