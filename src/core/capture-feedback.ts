import type { CaptureSession, Feedback, UnavailableReason } from '../contracts';

const UNAVAILABLE_MESSAGES: Record<UnavailableReason, string> = {
  'no-camera':
    'No camera found. If this device has one, quit Chrome fully and reopen it, or use the keyboard.',
  'camera-busy': 'Your camera is being used by another app. You can use the keyboard.',
  'permission-denied':
    "Camera access is off. Press Try camera again and choose Allow. If nothing appears, use the camera icon in Chrome's address bar, or use the keyboard.",
  'camera-lost': 'Camera disconnected. You can continue with the keyboard.',
  'tracking-failed': 'Hand tracking could not start. You can use the keyboard.',
};

export class CaptureFeedback {
  private failedTries = 0;

  describe(session: CaptureSession): Feedback {
    if (session.state === 'unavailable') this.failedTries += 1;
    else if (session.state !== 'starting') this.failedTries = 0;
    return {
      kind: 'capture-state',
      captureState: session.state,
      message: this.message(session),
    };
  }

  private message(session: CaptureSession): string {
    switch (session.state) {
      case 'starting':
        return 'Starting camera. If your browser asks, choose Allow.';
      case 'active':
        return 'Camera on';
      case 'stopped':
        return 'Camera off. Press C to turn it on.';
      case 'unavailable':
        return this.failureMessage(session.reason ?? 'no-camera');
    }
  }

  /** A retry can fail instantly, so the count is what shows the person that it ran. */
  private failureMessage(reason: UnavailableReason): string {
    const message = UNAVAILABLE_MESSAGES[reason];
    return this.failedTries > 1 ? `Try ${this.failedTries} failed. ${message}` : message;
  }
}
