import type { HandFrame, HandFrameSource } from '../contracts';
import {
  SUBJECT_ID_PATTERN,
  TRACKING_MODEL_SHA256,
  type LabelledGesture,
  type RecordedSession,
  type RecordingDetails,
  type SessionLabel,
} from '../contracts/recorded-session';

interface OpenRecording {
  subjectId: string;
  frames: HandFrame[];
  labels: SessionLabel[];
  openLabel: { gesture: LabelledGesture; startMs: number } | null;
}

/** Holds a session in memory until Stop. Nothing is saved here. */
export class SessionRecorder {
  private recording: OpenRecording | null = null;
  private lastFrameMs = 0;

  constructor(
    source: HandFrameSource,
    private readonly today: () => string,
  ) {
    source.onFrame((frame) => this.capture(frame));
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  start({ subjectId, consent }: RecordingDetails): void {
    if (!consent) throw new Error('Recording needs the consent of the person being recorded');
    if (!SUBJECT_ID_PATTERN.test(subjectId)) {
      throw new Error('Subject id must be a short non-identifying id, such as maintainer-1');
    }
    this.recording = { subjectId, frames: [], labels: [], openLabel: null };
  }

  beginLabel(gesture: LabelledGesture): void {
    if (!this.recording) return;
    this.endLabel();
    this.recording.openLabel = { gesture, startMs: this.lastFrameMs };
  }

  endLabel(): void {
    const open = this.recording?.openLabel;
    if (!this.recording || !open) return;
    this.recording.labels.push({ ...open, endMs: this.lastFrameMs });
    this.recording.openLabel = null;
  }

  stop(): RecordedSession {
    if (!this.recording) throw new Error('No recording in progress');
    this.endLabel();
    const { subjectId, frames, labels } = this.recording;
    this.recording = null;
    return {
      schemaVersion: 1,
      modelSha256: TRACKING_MODEL_SHA256,
      subjectId,
      consent: true,
      recordedOn: this.today(),
      frames,
      labels,
    };
  }

  private capture(frame: HandFrame): void {
    if (!this.recording) return;
    this.lastFrameMs = frame.timestampMs;
    this.recording.frames.push(frame);
  }
}
