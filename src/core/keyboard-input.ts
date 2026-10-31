import type { Action } from '../contracts';

const MOVE_UNITS_PER_SECOND = 3;
const ROTATE_RADIANS_PER_SECOND = 2.5;

const MOVE_KEYS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

const ROTATE_KEYS: Readonly<Record<string, number>> = { q: 1, e: -1 };

export interface KeyboardHandlers {
  onAction(action: Action): void;
  onHeldChange(held: boolean): void;
  onToggleCapture(): void;
  onToggleView(): void;
}

export class KeyboardInput {
  private readonly held = new Set<string>();

  constructor(
    target: EventTarget,
    private readonly handlers: KeyboardHandlers,
  ) {
    target.addEventListener('keydown', (event) => this.onKeyDown(event as KeyboardEvent));
    target.addEventListener('keyup', (event) => this.onKeyUp(event as KeyboardEvent));
  }

  /** Applies held keys for the time since the last call, so speed does not depend on frame rate. */
  tick(elapsedMs: number): void {
    const seconds = elapsedMs / 1000;
    let dx = 0;
    let dy = 0;
    let turn = 0;
    for (const key of this.held) {
      const move = MOVE_KEYS[key];
      dx += move?.[0] ?? 0;
      dy += move?.[1] ?? 0;
      turn += ROTATE_KEYS[key] ?? 0;
    }
    if (dx !== 0 || dy !== 0) {
      const distance = MOVE_UNITS_PER_SECOND * seconds;
      this.handlers.onAction({
        type: 'move',
        source: 'keyboard',
        delta: { dx: dx * distance, dy: dy * distance },
      });
    }
    if (turn !== 0) {
      this.handlers.onAction({
        type: 'rotate',
        source: 'keyboard',
        delta: { dAngle: turn * ROTATE_RADIANS_PER_SECOND * seconds },
      });
    }
  }

  releaseAll(): void {
    if (this.held.size === 0) return;
    this.held.clear();
    this.handlers.onHeldChange(false);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (isTyping(event)) return;
    const key = normaliseKey(event.key);
    if (key === 'r') {
      if (!event.repeat) this.handlers.onAction({ type: 'reset', source: 'keyboard' });
      return;
    }
    if (key === 'c') {
      if (!event.repeat) this.handlers.onToggleCapture();
      return;
    }
    if (key === 'v') {
      if (!event.repeat) this.handlers.onToggleView();
      return;
    }
    if (!(key in MOVE_KEYS) && !(key in ROTATE_KEYS)) return;

    event.preventDefault();
    if (this.held.has(key)) return;
    this.held.add(key);
    if (this.held.size === 1) this.handlers.onHeldChange(true);
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (this.held.delete(normaliseKey(event.key)) && this.held.size === 0) {
      this.handlers.onHeldChange(false);
    }
  }
}

function isTyping(event: KeyboardEvent): boolean {
  return (event.target as Partial<HTMLElement> | null)?.tagName === 'INPUT';
}

function normaliseKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}
