import type { CaptureSession, Feedback, UnavailableReason } from '../contracts';

const UNAVAILABLE_MESSAGES: Record<UnavailableReason, string> = {
  'no-camera': 'No camera found. You can use the keyboard.',
  'camera-busy': 'Your camera is being used by another app. You can use the keyboard.',
  'permission-denied': 'Camera access is off. Allow it in your browser, or use the keyboard.',
  'camera-lost': 'Camera disconnected. You can continue with the keyboard.',
  'tracking-failed': 'Hand tracking could not start. You can use the keyboard.',
};

export function captureFeedback(session: CaptureSession): Feedback {
  return { kind: 'capture-state', captureState: session.state, message: captureMessage(session) };
}

function captureMessage(session: CaptureSession): string {
  switch (session.state) {
    case 'starting':
      return 'Starting camera...';
    case 'active':
      return 'Camera on';
    case 'stopped':
      return 'Camera off. Press C to turn it on.';
    case 'unavailable':
      return UNAVAILABLE_MESSAGES[session.reason ?? 'no-camera'];
  }
}
