import type { HandMarkers } from '../contracts';

export interface Size {
  width: number;
  height: number;
}

const POINT_RADIUS = 4;
const LINE_WIDTH = 2.5;
const OPEN_COLOUR = '#2fe6ff';
const PINCH_COLOUR = '#ffd24a';

const FINGER_LINES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

/**
 * Where a camera point lands on screen. The camera view is mirrored and cropped to fill the
 * scene, so this must match that exactly or the points drift off the hand.
 */
export function projectPoint(
  point: { x: number; y: number },
  source: Size,
  view: Size,
): { x: number; y: number } {
  const scale = Math.max(view.width / source.width, view.height / source.height);
  return {
    x: view.width / 2 + (0.5 - point.x) * source.width * scale,
    y: view.height / 2 + (point.y - 0.5) * source.height * scale,
  };
}

export class HandOverlay {
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private hands: HandMarkers[] = [];

  constructor(
    private readonly container: HTMLElement,
    private readonly sourceSize: () => Size,
  ) {
    this.canvas.id = 'hand-overlay';
    container.append(this.canvas);
    this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  showHands(hands: HandMarkers[]): void {
    this.hands = hands;
    this.draw();
  }

  private resize(): void {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.draw();
  }

  private draw(): void {
    const view = { width: this.container.clientWidth, height: this.container.clientHeight };
    this.context.clearRect(0, 0, view.width, view.height);
    for (const hand of this.hands) this.drawHand(hand, view);
  }

  private drawHand(hand: HandMarkers, view: Size): void {
    const colour = hand.pinching ? PINCH_COLOUR : OPEN_COLOUR;
    const points = hand.landmarks.map((point) => projectPoint(point, this.sourceSize(), view));
    const { context } = this;

    context.strokeStyle = colour;
    context.fillStyle = colour;
    context.lineWidth = LINE_WIDTH;
    context.beginPath();
    for (const [from, to] of FINGER_LINES) {
      const start = points[from];
      const end = points[to];
      if (!start || !end) continue;
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }
    context.stroke();

    for (const { x, y } of points) {
      context.beginPath();
      context.arc(x, y, POINT_RADIUS, 0, 2 * Math.PI);
      context.fill();
    }
  }
}
