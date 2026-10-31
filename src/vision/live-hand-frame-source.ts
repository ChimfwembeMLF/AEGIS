import type {
  CaptureControl,
  CaptureSession,
  HandFrame,
  HandFrameSource,
  Unsubscribe,
} from '../contracts';
import type { Camera } from './camera';
import type { HandTracker } from './hand-tracker';

export class LiveHandFrameSource implements HandFrameSource, CaptureControl {
  private readonly listeners = new Set<(frame: HandFrame) => void>();
  private tracker: Promise<HandTracker> | null = null;
  private ready: HandTracker | null = null;
  private frameRequest: number | null = null;
  private lastTimestampMs = 0;

  constructor(
    private readonly camera: Camera,
    private readonly createTracker: () => Promise<HandTracker>,
  ) {
    camera.onStateChange(({ state }) => {
      if (state !== 'active') this.stopFrames();
    });
  }

  async start(): Promise<void> {
    await this.camera.start(() => this.loadTracker());
    if (this.camera.state === 'active' && this.frameRequest === null) this.requestFrame();
  }

  stop(): void {
    this.camera.stop();
  }

  onFrame(listener: (frame: HandFrame) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStateChange(listener: (session: CaptureSession) => void): Unsubscribe {
    return this.camera.onStateChange(listener);
  }

  /** Shared by repeated starts, and cleared on failure so a later start can try again. */
  private async loadTracker(): Promise<void> {
    this.tracker ??= this.createTracker();
    try {
      this.ready = await this.tracker;
    } catch (error) {
      this.tracker = null;
      throw error;
    }
  }

  /** A final empty frame tells Motion the hand is gone, so no gesture stays open. */
  private stopFrames(): void {
    if (this.frameRequest === null) return;
    this.camera.video.cancelVideoFrameCallback(this.frameRequest);
    this.frameRequest = null;
    this.lastTimestampMs += 1;
    this.emit({ timestampMs: this.lastTimestampMs, hands: [] });
  }

  private emit(frame: HandFrame): void {
    this.listeners.forEach((listener) => listener(frame));
  }

  /** Called once per displayed camera frame, so frames that arrive while busy are skipped, not queued. */
  private requestFrame(): void {
    this.frameRequest = this.camera.video.requestVideoFrameCallback((now, metadata) => {
      this.processFrame(metadata.captureTime ?? now);
      if (this.frameRequest !== null) this.requestFrame();
    });
  }

  private processFrame(captureTimeMs: number): void {
    if (!this.ready) return;
    const timestampMs = Math.max(captureTimeMs, this.lastTimestampMs + 1);
    this.lastTimestampMs = timestampMs;
    this.emit(this.ready.detect(this.camera.video, timestampMs));
  }
}
