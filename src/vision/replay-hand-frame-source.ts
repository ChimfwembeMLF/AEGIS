import type { HandFrame, HandFrameSource, Unsubscribe } from '../contracts';

/** Stands in for the camera: delivers recorded frames in order, as fast as they are consumed. */
export class ReplayHandFrameSource implements HandFrameSource {
  private readonly listeners = new Set<(frame: HandFrame) => void>();
  private running = false;

  constructor(private readonly frames: readonly HandFrame[]) {}

  async start(): Promise<void> {
    this.running = true;
    for (const frame of this.frames) {
      if (!this.running) return;
      this.listeners.forEach((listener) => listener(frame));
    }
  }

  stop(): void {
    this.running = false;
  }

  onFrame(listener: (frame: HandFrame) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
