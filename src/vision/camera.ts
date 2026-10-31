import type {
  CameraFeed,
  CaptureControl,
  CaptureSession,
  UnavailableReason,
  Unsubscribe,
} from '../contracts';

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 30 },
};

function failureReason(error: unknown): UnavailableReason {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission-denied';
  if (name === 'NotReadableError' || name === 'AbortError') return 'camera-busy';
  return 'no-camera';
}

export class Camera implements CaptureControl, CameraFeed {
  /** Read for tracking and displayed by Spatial. Frames go nowhere else. */
  readonly video = document.createElement('video');
  private readonly listeners = new Set<(session: CaptureSession) => void>();
  private stream: MediaStream | null = null;
  private session: CaptureSession = { state: 'stopped' };
  /** Increases on each start or stop, so a slow start cannot revive a camera stopped meanwhile. */
  private attempt = 0;

  constructor() {
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute('aria-hidden', 'true');
  }

  get element(): HTMLVideoElement {
    return this.video;
  }

  /**
   * Does nothing if already starting or active, so there is only ever one stream to stop.
   * `prepare` runs first, inside the `starting` state; if it fails, tracking is unavailable.
   */
  async start(prepare: () => Promise<void> = async () => {}): Promise<void> {
    if (this.state === 'starting' || this.state === 'active') return;

    const attempt = ++this.attempt;
    this.report({ state: 'starting' });
    try {
      await prepare();
    } catch {
      if (attempt === this.attempt) this.fail('tracking-failed');
      return;
    }
    if (attempt !== this.attempt) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: false,
      });
      if (attempt !== this.attempt) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (attempt === this.attempt) this.fail('camera-lost');
      });
      this.video.srcObject = stream;
      // The camera is on from here, so the person is told before anything else happens.
      this.report({ state: 'active' });
      await this.video.play();
    } catch (error) {
      if (attempt === this.attempt) this.fail(failureReason(error));
    }
  }

  stop(): void {
    this.attempt += 1;
    this.release();
    this.report({ state: 'stopped' });
  }

  fail(reason: UnavailableReason): void {
    this.attempt += 1;
    this.release();
    this.report({ state: 'unavailable', reason });
  }

  get state(): CaptureSession['state'] {
    return this.session.state;
  }

  isReleased(): boolean {
    return this.stream === null && this.video.srcObject === null;
  }

  onStateChange(listener: (session: CaptureSession) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private release(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  private report(session: CaptureSession): void {
    this.session = session;
    this.listeners.forEach((listener) => listener(session));
  }
}
