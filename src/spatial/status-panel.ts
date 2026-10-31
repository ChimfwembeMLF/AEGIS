import type { CameraViewCommands, CaptureCommands, CaptureState, Feedback } from '../contracts';

const KEYBOARD_CONTROLS: ReadonlyArray<readonly [string, string]> = [
  ['Arrows', 'Move the object'],
  ['Q / E', 'Rotate left / right'],
  ['R', 'Reset the object'],
  ['C', 'Stop or restart the camera'],
  ['V', 'Hide or show the camera view'],
];

const GESTURE_HINTS: ReadonlyArray<readonly [string, string]> = [
  ['Pinch + drag', 'Move the object'],
  ['Pinch + twist', 'Rotate the object'],
  ['Open palm', 'Hold for 1 second to reset'],
];

function definitionList(entries: ReadonlyArray<readonly [string, string]>): HTMLDListElement {
  const list = document.createElement('dl');
  for (const [term, description] of entries) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    list.append(dt, dd);
  }
  return list;
}

function section(title: string, ...content: HTMLElement[]): HTMLElement {
  const element = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = title;
  element.append(heading, ...content);
  return element;
}

export class StatusPanel {
  private readonly gesture = document.createElement('p');
  private readonly camera = document.createElement('p');
  private readonly indicator = document.createElement('p');
  private readonly cameraToggle = document.createElement('button');
  private readonly viewToggle = document.createElement('button');

  constructor(container: HTMLElement, capture: CaptureCommands, view: CameraViewCommands) {
    const title = document.createElement('h1');
    title.textContent = 'AEGIS';

    this.gesture.id = 'gesture-status';
    this.gesture.className = 'status-message';
    this.gesture.textContent = 'Raise a hand to begin';
    this.gesture.setAttribute('aria-live', 'polite');

    this.camera.id = 'camera-status';
    this.camera.className = 'status-message';
    this.camera.setAttribute('aria-live', 'polite');

    this.indicator.id = 'capture-indicator';
    this.indicator.textContent = 'Camera in use';
    this.indicator.hidden = true;

    this.cameraToggle.id = 'camera-toggle';
    this.cameraToggle.type = 'button';
    this.cameraToggle.textContent = 'Start camera';
    this.cameraToggle.addEventListener('click', () => capture.toggle());

    this.viewToggle.id = 'view-toggle';
    this.viewToggle.type = 'button';
    this.viewToggle.textContent = 'Hide camera view';
    this.viewToggle.addEventListener('click', () => view.toggle());

    container.append(
      title,
      section('Camera', this.indicator, this.camera, this.cameraToggle, this.viewToggle),
      section('Gesture', this.gesture),
      section('Keyboard', definitionList(KEYBOARD_CONTROLS)),
      section('Gestures', definitionList(GESTURE_HINTS)),
    );
  }

  showFeedback(feedback: Feedback): void {
    const target = feedback.kind === 'capture-state' ? this.camera : this.gesture;
    target.textContent = feedback.message;
    target.dataset.kind = feedback.kind;
    if (feedback.captureState) this.showCaptureState(feedback.captureState);
  }

  showViewChoice(hiddenByPerson: boolean): void {
    this.viewToggle.textContent = hiddenByPerson ? 'Show camera view' : 'Hide camera view';
  }

  private showCaptureState(state: CaptureState): void {
    this.indicator.hidden = state !== 'active';
    const stoppable = state === 'active' || state === 'starting';
    this.cameraToggle.textContent = stoppable ? 'Stop camera' : 'Start camera';
  }
}
