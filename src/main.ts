import type { CameraDisplay, Pose, SceneCommands } from './contracts';
import { interactionSettings } from './contracts/interaction-settings';
import { CameraViewControl } from './core/camera-view-control';
import { captureFeedback } from './core/capture-feedback';
import { CaptureToggle } from './core/capture-toggle';
import { GestureControl } from './core/gesture-control';
import { InteractionEngine } from './core/interaction-engine';
import { KeyboardInput } from './core/keyboard-input';
import { createRecordingCommands } from './core/recording-commands';
import { SessionRecorder } from './core/session-recorder';
import { GestureInterpreter } from './motion/gesture-interpreter';
import { CameraView } from './spatial/camera-view';
import { HandOverlay } from './spatial/hand-overlay';
import { RecordingPanel } from './spatial/recording-panel';
import { SpatialScene } from './spatial/scene';
import { StatusPanel } from './spatial/status-panel';
import { Camera } from './vision/camera';
import { HandTracker } from './vision/hand-tracker';
import { LiveHandFrameSource } from './vision/live-hand-frame-source';

const INITIAL_POSE: Pose = { position: { x: 0, y: 0 }, rotation: 0 };

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
}

const params = new URLSearchParams(location.search);

const camera = new Camera();
const handFrames = new LiveHandFrameSource(camera, () => HandTracker.create());
const capture = new CaptureToggle(handFrames);

const sceneElement = requireElement('scene');
const cameraView = new CameraView(sceneElement, camera);
const handOverlay = new HandOverlay(sceneElement, () => cameraView.sourceSize());
const spatial = new SpatialScene(sceneElement);
const status = new StatusPanel(requireElement('status'), capture, {
  toggle: () => viewControl.toggle(),
});
if (params.has('target')) spatial.showTarget();

const cameraDisplay: CameraDisplay = {
  showHands: (hands) => handOverlay.showHands(hands),
  showCameraView: ({ visible, hiddenByPerson }) => {
    cameraView.show(visible);
    status.showViewChoice(hiddenByPerson);
  },
};
const viewControl = new CameraViewControl(cameraDisplay, handFrames);

const sceneCommands: SceneCommands = {
  setPose: (pose) => spatial.setPose(pose),
  showFeedback: (feedback) => status.showFeedback(feedback),
};

const engine = new InteractionEngine(sceneCommands, spatial, INITIAL_POSE);
const gestureControl = new GestureControl(engine, sceneCommands, spatial, interactionSettings, () =>
  performance.now(),
);

const interpreter = new GestureInterpreter(handFrames);
interpreter.onInterpretation((item) => gestureControl.handle(item));
interpreter.onHands((hands) => viewControl.showHands(hands));

const keyboard = new KeyboardInput(window, {
  onAction: (action) => engine.apply(action),
  onHeldChange: (held) => gestureControl.setKeyboardHeld(held),
  onToggleCapture: () => capture.toggle(),
  onToggleView: () => viewControl.toggle(),
});
window.addEventListener('blur', () => keyboard.releaseAll());

let lastFrameMs = performance.now();
function runKeyboard(nowMs: number): void {
  keyboard.tick(nowMs - lastFrameMs);
  lastFrameMs = nowMs;
  requestAnimationFrame(runKeyboard);
}
requestAnimationFrame(runKeyboard);

handFrames.onStateChange((session) => sceneCommands.showFeedback(captureFeedback(session)));

if (params.has('record')) {
  const recorder = new SessionRecorder(handFrames, () => new Date().toISOString().slice(0, 10));
  new RecordingPanel(requireElement('status'), createRecordingCommands(recorder));
}

engine.start();
capture.toggle();
