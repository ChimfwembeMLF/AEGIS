import type {
  LabelledGesture,
  RecordedSession,
  RecordingCommands,
} from '../contracts/recorded-session';

const LABEL_KEYS: Readonly<Record<string, LabelledGesture>> = {
  '1': 'pinch-drag',
  '2': 'pinch-twist',
  '3': 'open-palm',
  '0': 'none',
};

/** Shown only when the app is opened with ?record=1. */
export class RecordingPanel {
  private readonly subject = document.createElement('input');
  private readonly consent = document.createElement('input');
  private readonly start = document.createElement('button');
  private readonly stop = document.createElement('button');
  private readonly message = document.createElement('p');
  private recording = false;
  private currentLabel: LabelledGesture | null = null;
  private labelCount = 0;

  constructor(
    container: HTMLElement,
    private readonly commands: RecordingCommands,
  ) {
    const element = document.createElement('section');
    element.id = 'recording-panel';

    const heading = document.createElement('h2');
    heading.textContent = 'Recording';

    this.subject.id = 'recording-subject';
    this.subject.placeholder = 'Subject id, such as maintainer-1';
    this.subject.setAttribute('aria-label', 'Subject id');

    this.consent.id = 'recording-consent';
    this.consent.type = 'checkbox';
    const consentLabel = document.createElement('label');
    consentLabel.append(this.consent, ' This person agreed to be recorded');

    this.start.id = 'recording-start';
    this.start.type = 'button';
    this.start.textContent = 'Start recording';
    this.start.disabled = true;

    this.stop.id = 'recording-stop';
    this.stop.type = 'button';
    this.stop.textContent = 'Stop and download';
    this.stop.disabled = true;

    const guide = document.createElement('p');
    guide.textContent = 'While recording: 1 drag, 2 twist, 3 palm, 0 unrelated. Press again to end.';

    this.message.id = 'recording-message';
    this.message.className = 'status-message';
    this.message.setAttribute('aria-live', 'polite');

    element.append(heading, this.subject, consentLabel, this.start, this.stop, guide, this.message);
    container.append(element);

    this.consent.addEventListener('change', () => this.refresh());
    this.start.addEventListener('click', () => this.begin());
    this.stop.addEventListener('click', () => this.end());
    window.addEventListener('keydown', (event) => this.onKey(event));
  }

  private showMessage(message: string): void {
    this.message.textContent = message;
  }

  private download(session: RecordedSession): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(session)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.subjectId}-${session.recordedOn}-${Date.now()}.session.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private refresh(): void {
    this.start.disabled = this.recording || !this.consent.checked;
    this.stop.disabled = !this.recording;
  }

  private begin(): void {
    const error = this.commands.start({
      subjectId: this.subject.value,
      consent: this.consent.checked,
    });
    if (error) {
      this.showMessage(error);
      return;
    }
    this.recording = true;
    this.labelCount = 0;
    this.currentLabel = null;
    this.showMessage('Recording');
    this.refresh();
    this.start.blur();
  }

  private end(): void {
    const { session, error } = this.commands.stop();
    if (session) {
      this.download(session);
      this.showMessage(`Saved ${session.frames.length} frames`);
    } else {
      this.showMessage(`Not saved: ${error}`);
    }
    this.recording = false;
    this.currentLabel = null;
    this.consent.checked = false;
    this.refresh();
  }

  private onKey(event: KeyboardEvent): void {
    const gesture = LABEL_KEYS[event.key];
    if (!this.recording || !gesture || event.repeat) return;
    if (this.currentLabel === gesture) {
      this.currentLabel = null;
      this.commands.label(null);
      this.showMessage(`Recording: ${this.labelCount} labelled`);
    } else {
      this.currentLabel = gesture;
      this.labelCount += 1;
      this.commands.label(gesture);
      this.showMessage(`Recording: labelling ${gesture}`);
    }
  }
}
