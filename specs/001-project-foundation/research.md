# Research: Project Foundation

All Technical Context unknowns are resolved below. Versions and measurements were checked on
2026-10-30 on the reference device.

## Reference environment

MacBook Pro, quad-core Intel Core i7, 16 GB memory, Intel Iris Pro GPU, FaceTime HD camera,
macOS 12.7.6, Chrome 150, Safari 17.6, Node 20.20.2, Python 3.14.

## Measured: hand tracking on the reference device

A throwaway benchmark ran the MediaPipe hand landmarker (float16 model, one hand, video mode) in
installed Chrome on 640×480 frames. It discarded 40 warm-up frames and measured 200. The hand was
found in all 200, and the machine was busy throughout (load average 10–12).

| Delegate                      | p50     | p95     | Max     |
| ----------------------------- | ------- | ------- | ------- |
| GPU (Intel Iris Pro)          | 16.1 ms | 25.3 ms | 52.5 ms |
| CPU                           | 47.1 ms | 53.1 ms | 56.5 ms |
| GPU in headless Chrome        | 525 ms  | 605 ms  | 869 ms  |

These figures measure inference only. They exclude camera delay and the 3D scene, and they used
one still image with small shifts rather than a live hand.

Headless Chrome falls back to a software renderer (SwiftShader), so its GPU figure is invalid.
Performance benchmarks must run in a visible browser and must reject software renderers.

## Decisions

### 1. Runtime: browser application in Chrome

- **Decision**: A local web application served from `localhost`, targeting Chrome. Safari is
  best-effort.
- **Rationale**: The camera, GPU access and hardware-accelerated 3D work on this Intel Mac without
  native builds. `localhost` counts as a secure context, so camera access works. It also keeps
  setup simple, which serves SC-010.
- **Alternatives considered**: Python with a native hand-tracking package (risk of no wheels for
  Python 3.14 on Intel macOS, and a separate 3D stack). Native Swift (macOS only, and Xcode is not
  installed). Electron (adds packaging with no benefit for this slice).

### 2. Hand tracking: MediaPipe Tasks Vision hand landmarker

- **Decision**: `@mediapipe/tasks-vision` 1.2.0 with the float16 `hand_landmarker.task` model, GPU
  delegate preferred and CPU as fallback.
- **Rationale**: It is the only option measured here, and it fits the budget with room to spare.
  It returns 21 landmarks per hand, which is what the gesture logic needs. It runs on the device.
- **Alternatives considered**: MediaPipe Gesture Recognizer (its fixed gesture set does not include
  pinch or twist). TensorFlow.js hand-pose (an older path to much the same model).

### 3. Gesture logic: rules over landmarks

- **Decision**: Recognise the three gestures with explicit geometric rules, with confidence
  computed from tracking quality and the distance from each rule's boundary.
- **Rationale**: Three simple gestures do not justify training a classifier. Rules are
  deterministic, unit-testable, and need only a small dataset to tune (Principle VI).
- **Alternatives considered**: A trained classifier (needs far more data and adds a model to
  version). A classifier can replace the rules later behind the same contract.

### 4. Recordings store landmarks, not video

- **Decision**: A Recorded Session stores timestamped landmarks and labels. It never stores images
  or audio.
- **Rationale**: Replay is deterministic, which SC-009 requires and live GPU inference does not
  guarantee. Because landmarks are Vision's real output, tracking errors stay in the data. Files
  are small and meet FR-016, because landmarks cannot reproduce a person's image.
- **Trade-off**: Replay exercises Motion and Core, not the tracking model. Changing the model
  therefore requires recording the dataset again (see Principle V).
- **Alternatives considered**: Video fixtures (exercise the full path, but are not deterministic,
  are large, and hold identifiable images).

### 5. 3D rendering: Three.js

- **Decision**: `three` 0.187.0 with its WebGL renderer.
- **Rationale**: Mature and MIT-licensed, and a single object in a simple scene is light work for
  this GPU. It avoids building a renderer.
- **Alternatives considered**: Raw WebGL (more code, no benefit). Babylon.js (larger than needed).

### 6. Language and tooling

- **Decision**: TypeScript 5.9.3, Vite 8.3.5, Vitest 4.1.12, Playwright 1.64.1 driving installed
  Chrome.
- **Rationale**: Each supports Node 20.20.2. Installed Chrome is used because it is what the app
  targets.
- **Alternatives considered**: Vitest 5 (requires Node 22 or later). TypeScript 7 (a darwin-x64
  build exists, but nothing here needs it, so the proven line is the lower risk).

### 7. Model delivery

- **Decision**: `npm run setup:model` downloads the model once and checks its SHA-256
  (`fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`) into a git-ignored folder.
  The WASM runtime is copied from `node_modules`. The app serves both itself.
- **Rationale**: Nothing is fetched from a third party at run time, which supports FR-015, and the
  repository avoids redistributing a file whose own terms are not yet confirmed.
- **Alternatives considered**: Loading from a CDN (a network dependency that undermines the
  no-off-device guarantee). Committing the model (adds 7.8 MB and a redistribution question).
- **Licence**: `@mediapipe/tasks-vision` and the MediaPipe repository are Apache-2.0. The Hand
  Tracking model card (October 2021) states the model is licensed under Apache 2.0 and lists gesture
  recognition and hand control as intended uses. Surveillance and identity recognition are out of
  scope. Confirmed 2026-10-31.

### 8. Frame handling and stale input

- **Decision**: Process only the newest camera frame via `requestVideoFrameCallback`, and have Core
  drop interpretations older than 150 ms. Inference runs on the main thread at first.
- **Rationale**: Skipping frames rather than queuing them meets FR-009 by design. The measured p95
  of 25 ms fits a 33 ms frame, so a worker is not yet justified (Principle VI).
- **Fallback**: Move inference to a worker if the benchmark shows the combined load breaks SC-005.

### 9. Enforcing module boundaries

- **Decision**: Modules import only `src/contracts`, never each other, and `src/main.ts` wires them
  together. A unit test scans imports and fails on a breach.
- **Rationale**: Principle I becomes a check rather than a convention, with no new dependency.
- **Alternatives considered**: A monorepo of packages (too much structure for one slice). An ESLint
  boundary plugin (a dependency for what a short test can do).

### 10. Privacy enforcement

- **Decision**: Serve a Content Security Policy with `connect-src 'self'`, keep the app free of
  storage APIs, and deliver recordings only as a file download the maintainer starts.
- **Rationale**: The browser itself blocks off-device transfer, and an end-to-end test can assert
  that no external request or stored camera data exists (SC-008).

### 11. Latency budget

| Stage                                        | p95 budget | Basis               |
| -------------------------------------------- | ---------- | ------------------- |
| Camera capture and delivery                  | 70 ms      | Estimate            |
| Hand tracking                                | 30 ms      | Measured 25.3 ms    |
| Motion and Core                              | 5 ms       | Estimate            |
| Frame wait, rendering and display            | 65 ms      | Estimate at 30 fps  |
| **Total, input to visible feedback**         | **170 ms** | Target: 200 ms      |

Camera and display delay cannot be measured from inside the app, so the benchmark measures from
frame arrival to painted feedback (budget: 100 ms). The whole 200 ms target is confirmed with a
one-off high-speed video test recorded in `quickstart.md`.

### Measured after implementation (2026-10-31)

`npm run verify` ran the real Vision, Motion, Core and Spatial code together on the Iris Pro, with
the scene rendering every frame. Input was a sample hand photo, not a live camera.

| Measure                                  | Result   | Budget  |
| ---------------------------------------- | -------- | ------- |
| Frame arrival to painted feedback, p95   | 55.6 ms  | 100 ms  |
| Frame rate                               | 35.4 fps | 30 fps  |
| Hand tracking, p95, while also rendering | 30.1 ms  | 35 ms   |

Tracking shares the GPU with rendering here and follows two hands, so the budget was revised from
30 ms (see the Budget revision in plan.md). Frame rate and feedback are within target, so the worker
in decision 8 is not needed yet.

### Performance with the camera view (2026-10-31)

Benchmark with the video, hand points and scene all active, at the device's real Retina scale,
tracking the two hands in the sample photo:

| Variant                                  | Frame rate | Tracking p95 | Feedback p95 |
| ---------------------------------------- | ---------- | ------------ | ------------ |
| Scene and points at 2x                   | 24.2 fps   | 48.4 ms      | 80.5 ms      |
| Scene at 1x                              | 26.7 fps   | 43.9 ms      | 76.1 ms      |
| Scene and points at 1x                   | 29.1 fps   | 41.3 ms      | 74.4 ms      |
| Scene and points at 1x, no antialiasing  | 29.3–29.5 fps | 35.5–38.2 ms | 67.3–70.1 ms |

The last row is what shipped. It still misses the 30 fps target and the 35 ms tracking budget. The
benchmark runs once per display frame, so any tracking pass over 16 ms caps it at 30 fps, which means
29.5 fps is close to its ceiling. The camera also supplies only 30 fps. The real webcam with no hand
in view held 29.8 fps. With a real hand it has not been measured.

### Real camera frame rate (2026-10-31)

Chrome throttled `requestVideoFrameCallback` on a video outside the page: the reference webcam ran
at 18–20 fps detached and 29 fps attached, across repeated runs. Simulated cameras did not show the
difference clearly, so the video now stays in the page at 2 pixels and 1% opacity.

### Tracking quality (2026-10-31)

The tracker exposes no per-hand quality score. Its handedness certainty is the nearest signal, but
it is the top of two classes, so it never falls below 0.5. On one sample photo it read 0.92 clear,
0.84 darkened and 0.53 blurred, and heavy darkness lost the hand completely. `trackingScore` rescales
this to 0–1, and Motion also reports repeated hand loss. These are based on one photo, so they need
checking against the evaluation dataset.
