import '../../src/spatial/styles.css';
import type { HandFrame, HandFrameSource, Pose, SceneCommands } from '../../src/contracts';
import { interactionSettings } from '../../src/contracts/interaction-settings';
import { GestureControl } from '../../src/core/gesture-control';
import { InteractionEngine } from '../../src/core/interaction-engine';
import { GestureInterpreter } from '../../src/motion/gesture-interpreter';
import { SpatialScene } from '../../src/spatial/scene';
import { CameraView } from '../../src/spatial/camera-view';
import { HandOverlay } from '../../src/spatial/hand-overlay';
import { HandTracker } from '../../src/vision/hand-tracker';
import { Camera } from '../../src/vision/camera';
import { LiveHandFrameSource } from '../../src/vision/live-hand-frame-source';
import { checkHandFrameSource } from '../helpers/hand-frame-source.suite';
import { makeHand } from '../helpers/hand-frames';

async function runLiveSourceCheck() {
  const camera = new Camera();
  const source = new LiveHandFrameSource(camera, () => HandTracker.create());
  const result = await checkHandFrameSource(source, async (frames) => {
    const deadline = performance.now() + 15000;
    while (frames.length < 5 && performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
  return { ...result, cameraReleased: camera.isReleased() };
}

/** Draws one hand in each state, and reports what actually reached the canvas. */
async function runOverlayCheck() {
  const container = document.createElement('div');
  container.style.cssText = 'position:relative;width:640px;height:480px';
  document.body.append(container);
  const overlay = new HandOverlay(container, () => ({ width: 640, height: 480 }));
  const canvas = container.querySelector('canvas') as HTMLCanvasElement;
  const read = () => {
    const { data } = (canvas.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, canvas.width, canvas.height);
    let pixels = 0;
    let colour: number[] = [];
    for (let index = 0; index < data.length; index += 4) {
      if ((data[index + 3] as number) === 255) {
        pixels += 1;
        colour = [data[index] as number, data[index + 1] as number, data[index + 2] as number];
      }
    }
    return { pixels, colour };
  };
  const { landmarks } = makeHand({ shape: 'open', wrist: { x: 0.5, y: 0.2 } });

  overlay.showHands([{ handId: 'a', landmarks, pinching: false }]);
  const open = read();
  overlay.showHands([{ handId: 'a', landmarks, pinching: true }]);
  const pinch = read();
  overlay.showHands([]);
  const cleared = read();
  container.remove();

  return {
    openPixels: open.pixels,
    openColour: open.colour,
    pinchPixels: pinch.pixels,
    pinchColour: pinch.colour,
    clearedPixels: cleared.pixels,
  };
}

const WARM_UP_FRAMES = 40;
const MEASURED_FRAMES = 300;

const nextPaint = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

function rendererName(): string {
  const gl = document.createElement('canvas').getContext('webgl2');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'no WebGL2';
}

const percentile = (sorted: number[], share: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? Number.NaN;

/**
 * Runs the real Vision, Motion, Core and Spatial path once per display frame. Feedback counts as
 * painted two display frames later, because the scene draws in its own animation callback.
 */
async function runBenchmark(imageUrl: string) {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;

  // The same layers as the real page: a full-size video, hand points and the scene.
  const container = document.createElement('main');
  container.id = 'scene';
  document.body.append(container);
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = canvas.captureStream(30);
  const cameraView = new CameraView(container, { element: video });
  cameraView.show(true);
  const overlay = new HandOverlay(container, () => cameraView.sourceSize());
  const spatial = new SpatialScene(container);

  const tracker = await HandTracker.create();

  let deliver: (frame: HandFrame) => void = () => {};
  const source: HandFrameSource = {
    start: async () => {},
    stop: () => {},
    onFrame: (listener) => {
      deliver = listener;
      return () => {};
    },
  };
  const scene: SceneCommands = { setPose: (pose) => spatial.setPose(pose), showFeedback: () => {} };
  const initialPose: Pose = { position: { x: 0, y: 0 }, rotation: 0 };
  const engine = new InteractionEngine(scene, spatial, initialPose);
  const control = new GestureControl(engine, scene, spatial, interactionSettings, () => performance.now());
  const interpreter = new GestureInterpreter(source);
  interpreter.onInterpretation((item) => control.handle(item));
  interpreter.onHands((hands) => overlay.showHands(hands));

  context.drawImage(image, 0, 0);
  await video.play();

  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const latencies: number[] = [];
  const pointLatencies: number[] = [];
  const inference: number[] = [];
  const inFlight: Array<{ startedAt: number; displayFrames: number }> = [];
  let firstMeasuredAt = 0;
  let lastMeasuredAt = 0;
  let timestampMs = 0;

  for (let index = 0; index < WARM_UP_FRAMES + MEASURED_FRAMES; index += 1) {
    const paintedAt = await nextPaint();
    for (const item of inFlight) {
      item.displayFrames += 1;
      if (item.displayFrames === 1) pointLatencies.push(paintedAt - item.startedAt);
    }
    while (inFlight[0] && inFlight[0].displayFrames >= 2) {
      latencies.push(paintedAt - (inFlight.shift() as { startedAt: number }).startedAt);
    }

    const measuring = index >= WARM_UP_FRAMES;
    if (measuring && firstMeasuredAt === 0) firstMeasuredAt = paintedAt;
    lastMeasuredAt = paintedAt;

    const startedAt = performance.now();
    const shift = Math.sin(index / 10) * 6;
    context.drawImage(image, shift, -120, image.width * scale, image.height * scale);
    timestampMs = Math.max(timestampMs + 1, startedAt);

    const frame = tracker.detect(canvas, timestampMs);
    const trackedAt = performance.now();
    deliver(frame);
    spatial.setPose({ position: { x: shift / 10, y: 0 }, rotation: shift / 10 });

    if (measuring) {
      inference.push(trackedAt - startedAt);
      inFlight.push({ startedAt, displayFrames: 0 });
    }
  }

  latencies.sort((a, b) => a - b);
  pointLatencies.sort((a, b) => a - b);
  inference.sort((a, b) => a - b);
  container.remove();

  return {
    renderer: rendererName(),
    delegate: tracker.delegate,
    feedbackP95Ms: percentile(latencies, 0.95),
    framesPerSecond: ((MEASURED_FRAMES - 1) / (lastMeasuredAt - firstMeasuredAt)) * 1000,
    trackingP95Ms: percentile(inference, 0.95),
    pointsP95Ms: percentile(pointLatencies, 0.95),
    samples: latencies.length,
  };
}

Object.assign(window, { aegisHarness: { runLiveSourceCheck, runBenchmark, runOverlayCheck } });
