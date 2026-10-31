---

description: "Task list for the AEGIS project foundation"
---

# Tasks: Project Foundation

**Input**: Design documents from `/specs/001-project-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks cover what Constitution Principle V requires: module contracts, confidence-threshold and confirmation logic, privacy rules, and recorded-session evaluation. Write each one first and confirm it fails before implementing. End-to-end tests are included where a story's Independent Test needs them.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

**Rules for every task**:

- Modules (`src/vision`, `src/motion`, `src/core`, `src/spatial`) import only from `src/contracts`. Only `src/main.ts` connects them.
- Field names and types come from `data-model.md`. Interfaces come from `contracts/module-contracts.md`. Keys, gestures and message wording come from `contracts/user-interface.md`.
- Never store, log or transmit camera images. Do not use `localStorage`, IndexedDB, Cache Storage or OPFS.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Create `.gitignore` covering `node_modules/`, `dist/`, `public/models/`, `public/wasm/`, `reports/`, `test-results/` and `playwright-report/`
- [X] T002 Create `package.json` with exact versions from plan.md (`typescript` 5.9.3, `vite` 8.3.5, `vitest` 4.1.12, `@playwright/test` 1.64.1, `three` 0.187.0, `@types/three` 0.187.0, `@mediapipe/tasks-vision` 1.2.0), `engines.node` `>=20.19.0`, and scripts `dev`, `build`, `preview`, `test`, `e2e`, `verify`, `setup:model`; then run `npm install`
- [X] T003 [P] Create strict TypeScript configuration in `tsconfig.json`
- [X] T004 [P] Create `vite.config.ts` with a default build, plus an `e2e` mode that also builds `tests/e2e/harness.html` as a second page
- [X] T005 [P] Create `vitest.config.ts` with a `unit` project (`tests/unit`, `tests/contract`) run by `npm test`, and a `verify` project (`tests/verify/*.verify.test.ts`)
- [X] T006 [P] Create `playwright.config.ts` using `channel: 'chrome'` against `vite preview` of the `e2e` build, with a `simulated-camera` project (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`) and a `no-camera` project (`--deny-permission-prompts`)
- [X] T007 Create `scripts/setup-model.mjs` to download the float16 `hand_landmarker.task` to `public/models/`, fail unless its SHA-256 matches `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`, and copy the `@mediapipe/tasks-vision` `wasm/` folder to `public/wasm/`
- [X] T008 Create `index.html` with the scene container, status regions and a Content Security Policy containing `connect-src 'self'`; allow `'wasm-unsafe-eval'` in `script-src`, and keep `connect-src` limited to `'self'` even if other directives need loosening for the WASM runtime

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contracts plus the path from an Action to the screen, which every story uses

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests

- [X] T009 [P] Write the import-scan test in `tests/unit/module-boundaries.test.ts`, failing if any module imports outside itself except for `src/contracts`
- [X] T010 [P] Write pose tests in `tests/unit/core/object-pose.test.ts` for movement within Scene Bounds (FR-003), rotation wrapping, and reset to `initialPose`
- [X] T011 [P] Write Action application tests in `tests/contract/scene-commands.contract.test.ts`, confirming Core sends each pose change through `SceneCommands.setPose`

### Implementation

- [X] T012 Define all contract types and `CONTRACT_VERSION = 1` in `src/contracts/index.ts`, covering every entity in data-model.md and all five interfaces in contracts/module-contracts.md
- [X] T013 [P] Define the Interaction Settings with their initial values in `src/contracts/interaction-settings.ts`
- [X] T014 Implement pose rules in `src/core/object-pose.ts`
- [X] T015 Implement the interaction engine in `src/core/interaction-engine.ts`, applying Actions to the pose and sending it to `SceneCommands`, with the clock injected so replay can use frame timestamps
- [X] T016 [P] Implement the Three.js scene with one object in `src/spatial/scene.ts`, providing `SceneCommands.setPose` and `SceneInfo.bounds`
- [X] T017 [P] Implement the status panel in `src/spatial/status-panel.ts`, providing `SceneCommands.showFeedback` and showing the keyboard controls and gesture hints (FR-011)
- [X] T018 Connect Core and Spatial in `src/main.ts`
- [X] T019 Add a smoke test in `tests/e2e/smoke.spec.ts` confirming the scene and controls appear and no request goes to another host

**Checkpoint**: The app opens and shows the scene, and a Core Action changes the object on screen

---

## Phase 3: User Story 1 - Control a 3D Object With Hand Gestures (Priority: P1) 🎯 MVP

**Goal**: A person moves, rotates and resets the object with hand gestures, and sees what was recognised.

**Independent Test**: With a webcam, perform all three gestures and confirm the object responds and the gesture name appears.

### Tests for User Story 1 (required by Constitution Principle V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T020 [P] [US1] Create a synthetic hand builder for pinch, twist, open palm and relaxed poses in `tests/helpers/hand-frames.ts`
- [X] T021 [P] [US1] Write gesture rule tests in `tests/unit/motion/gesture-rules.test.ts` for all three gestures, the one-second open-palm hold, and telling a twist from a drag
- [X] T022 [P] [US1] Write `GestureStream` contract tests in `tests/contract/gesture-stream.contract.test.ts` for confidence on every message, identical output on repeated runs, and an `end` when the hand leaves view
- [X] T023 [P] [US1] Write Core decision tests in `tests/contract/core-decisions.contract.test.ts` for per-action thresholds (FR-006), `not-understood` feedback (FR-007), dropping input older than `maxInputAgeMs` (FR-009), and one hand keeping control (FR-008)
- [X] T024 [P] [US1] Write a shared `HandFrameSource` suite in `tests/helpers/hand-frame-source.suite.ts` for increasing timestamps, no image data in frames, and the camera released by `stop()`
- [X] T025 [US1] Run the shared suite against the live source with the simulated camera in `tests/e2e/live-hand-frame-source.spec.ts`, using a page at `tests/e2e/harness.html` that loads `tests/e2e/harness.ts`

### Implementation for User Story 1

- [X] T026 [P] [US1] Implement gesture rules in `src/motion/gesture-rules.ts`: pinch distance relative to palm width with separate enter and exit levels, wrist roll for twist, and extended fingers for open palm
- [X] T027 [P] [US1] Implement confidence scoring in `src/motion/confidence.ts` from `trackingScore` and the distance from each rule's boundary
- [X] T028 [US1] Implement `GestureStream` in `src/motion/gesture-interpreter.ts`, using frame timestamps only and mirroring hand x so movement to the right moves the object to the right
- [X] T029 [US1] Implement gesture control in `src/core/gesture-control.ts`: the `idle` and `controlled` states from data-model.md, thresholds, stale-input dropping, and Feedback
- [X] T030 [P] [US1] Implement camera access in `src/vision/camera.ts`, providing `CaptureControl` with the `starting` and `active` states
- [X] T031 [P] [US1] Implement hand tracking in `src/vision/hand-tracker.ts` with the GPU delegate, CPU fallback, and the model and WASM loaded only from this app's own paths
- [X] T032 [US1] Implement the live source in `src/vision/live-hand-frame-source.ts` with `requestVideoFrameCallback`, processing only the newest frame (FR-009)
- [X] T033 [US1] Add `poor-tracking` feedback to `src/core/gesture-control.ts` when tracking stays low while a hand is present
- [X] T034 [US1] Connect Vision, Motion and Core in `src/main.ts`

**Checkpoint**: User Story 1 works live and is the MVP

---

## Phase 4: User Story 2 - Control the Object Without a Camera (Priority: P2)

**Goal**: Everything possible by gesture is also possible from the keyboard, with or without a camera.

**Independent Test**: With no camera, move, rotate and reset the object using only the keyboard.

### Tests for User Story 2 (required by Constitution Principle V) ⚠️

- [X] T035 [P] [US2] Write keyboard priority tests in `tests/contract/keyboard-priority.contract.test.ts` for the `suspended` state: gestures are ignored while a key is held, then control returns to `idle`
- [X] T036 [P] [US2] Write end-to-end keyboard tests in `tests/e2e/keyboard.spec.ts` under the `no-camera` project for all object keys and the permission-denied message
- [X] T037 [P] [US2] Write a camera-loss test in `tests/e2e/camera-failure.spec.ts`, ending the stream during a session through the harness and confirming the message and continued keyboard control

### Implementation for User Story 2

- [X] T038 [US2] Implement keyboard input in `src/core/keyboard-input.ts` for the arrow keys, `Q`, `E` and `R`, emitting Actions with `source: 'keyboard'`
- [X] T039 [US2] Add the `suspended` state to `src/core/gesture-control.ts`
- [X] T040 [US2] Add the `unavailable` state and its `no-camera`, `permission-denied` and `camera-lost` reasons to `src/vision/camera.ts`, including the `ended` event on the camera track
- [X] T041 [US2] Show each unavailable message from contracts/user-interface.md in `src/spatial/status-panel.ts`
- [X] T042 [US2] Connect keyboard input and capture state in `src/main.ts`, so a camera failure never stops the scene from opening

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Stay in Control of the Camera (Priority: P3)

**Goal**: A person always sees when the camera is on and can stop or restart it at any time.

**Independent Test**: Confirm the indicator is visible, stop capture by each method, and confirm the camera stops and the indicator clears.

### Tests for User Story 3 (required by Constitution Principle V) ⚠️

- [X] T043 [P] [US3] Write privacy tests in `tests/e2e/privacy.spec.ts` confirming that during a full session no request goes to another host, no browser storage holds data, and no console output contains image data (FR-015, FR-016, FR-017, SC-008)
- [X] T044 [P] [US3] Write capture control tests in `tests/e2e/capture-control.spec.ts` for the indicator, stopping by button and by `C` within 0.5 seconds (SC-007), track state `ended`, and restarting without a reload

### Implementation for User Story 3

- [X] T045 [US3] Add `stopped` and restart to `src/vision/camera.ts`, stopping every track and clearing the video element
- [X] T046 [US3] Add the `C` key to `src/core/keyboard-input.ts`, calling `CaptureControl`
- [X] T047 [US3] Add the capture indicator and the stop or restart button to `src/spatial/status-panel.ts` (FR-013, FR-014)
- [X] T048 [US3] Connect the button to `CaptureControl` in `src/main.ts`, and pause hand tracking while capture is not `active`

**Checkpoint**: Stories 1–3 work, and the privacy tests pass

---

## Phase 6: User Story 4 - Verify AEGIS Without a Camera (Priority: P4)

**Goal**: A maintainer replays recordings and receives a pass, fail or incomplete report.

**Independent Test**: On a machine with no camera, run verification and confirm that it produces a report.

### Tests for User Story 4 (required by Constitution Principle V) ⚠️

- [X] T049 [P] [US4] Write Recorded Session validation tests in `tests/contract/recorded-session.contract.test.ts` from `contracts/recorded-session.schema.json`, rejecting missing consent, wrong landmark counts and any unknown field that could hold image data
- [X] T050 [P] [US4] Write replay tests in `tests/contract/replay-hand-frame-source.contract.test.ts`, running the shared suite from `tests/helpers/hand-frame-source.suite.ts`, and confirm that repeated replays give identical interpretations (SC-009)
- [X] T051 [P] [US4] Write recorder tests in `tests/unit/core/session-recorder.test.ts`, confirming nothing is captured before consent is confirmed and Start is pressed (FR-020)
- [X] T052 [P] [US4] Write report tests in `tests/unit/verify/report.test.ts`, confirming that a missed target gives `fail` and names it, and an unmeasured target or software renderer gives `incomplete`

### Implementation for User Story 4

- [X] T053 [P] [US4] Implement the replay source in `src/vision/replay-hand-frame-source.ts`
- [X] T054 [P] [US4] Implement Recorded Session validation in `src/contracts/recorded-session.ts`, without a new dependency
- [X] T055 [US4] Implement the recorder in `src/core/session-recorder.ts`, storing Hand Frames and labels in memory until the download
- [X] T056 [US4] Implement `?record=1` controls in `src/spatial/recording-panel.ts`, with a consent confirmation, Start, Stop, gesture label choice and file download, and connect them in `src/main.ts`
- [X] T057 [P] [US4] Implement accuracy and unintended-action metrics in `tests/verify/metrics.ts`, comparing interpretations with labels
- [X] T058 [P] [US4] Implement the report in `tests/verify/report.ts`, writing `reports/verification.json` to match `contracts/verification-report.schema.json`
- [X] T059 [US4] Implement dataset evaluation for SC-002, SC-003 and SC-009 in `tests/verify/accuracy.verify.test.ts`, reading `fixtures/sessions/v1/manifest.json` and failing if a session's `modelSha256` differs from the current model
- [X] T060 [US4] Implement the responsiveness benchmark for SC-004 and SC-005 in `tests/verify/responsiveness.spec.ts`, using a visible Chrome window and `fixtures/bench/hand.jpg`, measuring frame arrival to painted feedback with the scene rendering, and reporting the renderer and delegate
- [X] T061 [US4] Create `scripts/verify.mjs` for `npm run verify`, running both checks and writing one combined report
- [ ] T062 [US4] **Maintainer task**: add a face-free photo of your own hand as `fixtures/bench/hand.jpg`, then record the sessions described in quickstart.md into `fixtures/sessions/v1/` and list them in `fixtures/sessions/v1/manifest.json`
- [ ] T063 [US4] Tune values in `src/contracts/interaction-settings.ts` and thresholds in `src/motion/gesture-rules.ts` against the dataset until SC-002 and SC-003 are met
- [X] T064 [US4] Run `npm run verify`; if frame rate misses SC-005, move hand tracking from `src/vision/hand-tracker.ts` into a worker as described in research.md decision 8

**Checkpoint**: All four stories work, and `npm run verify` reports `pass`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [X] T065 [P] Add setup, run and verify instructions and the tested Chrome version to `README.md` (FR-023), keeping its existing content
- [X] T066 [P] Confirm canonical module names and no assistant identity in user-facing text in `src/spatial/status-panel.ts` and `README.md` (FR-022)
- [X] T067 [P] Confirm the tracking model's terms from its model card, and record the result in `specs/001-project-foundation/research.md`
- [ ] T068 **Maintainer task**: run the live scenarios and the filmed latency check from `specs/001-project-foundation/quickstart.md`, and record the latency result in `specs/001-project-foundation/plan.md` (SC-004)
- [ ] T069 **Maintainer task**: time a fresh setup by following `README.md` (SC-010) and test first-time use with at least 5 people (SC-001), recording results in `specs/001-project-foundation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3–6)**: Depend on Foundational, and can then run in priority order
- **Polish (Phase 7)**: Depends on the stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: Needs only Foundational
- **US2 (P2)**: Keyboard control needs only Foundational. Its camera-failure tasks T037, T040 and T042 extend `src/vision/camera.ts` from US1
- **US3 (P3)**: Depends on the camera work from US1 and the keyboard input from US2
- **US4 (P4)**: Depends on US1, as it replays through Motion and Core. T062 needs the recording controls from T056

### Within Each User Story

- Tests are written first and must fail before implementation
- Contracts and rules before the modules that use them
- Modules before wiring in `src/main.ts`
- Finish each story's checkpoint before moving on

### Parallel Opportunities

- Setup: T003–T006
- Foundational: tests T009–T011, then T016 and T017
- US1: tests T020–T024, then T026 and T027, then T030 and T031
- US2: tests T035–T037
- US3: tests T043 and T044
- US4: tests T049–T052, then T053 and T054, then T057 and T058
- Polish: T065–T067

---

## Parallel Example: User Story 1

```text
# Write the tests together:
Task: "Create a synthetic hand builder in tests/helpers/hand-frames.ts"
Task: "Write gesture rule tests in tests/unit/motion/gesture-rules.test.ts"
Task: "Write GestureStream contract tests in tests/contract/gesture-stream.contract.test.ts"
Task: "Write Core decision tests in tests/contract/core-decisions.contract.test.ts"

# Then build the independent pieces together:
Task: "Implement gesture rules in src/motion/gesture-rules.ts"
Task: "Implement confidence scoring in src/motion/confidence.ts"
Task: "Implement camera access in src/vision/camera.ts"
Task: "Implement hand tracking in src/vision/hand-tracker.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1 and 2
2. Complete Phase 3
3. **STOP and VALIDATE**: try all three gestures live

The MVP proves the idea but is not ready for others to use, because Stories 2 and 3 carry constitution requirements for an alternative input path and visible, stoppable capture.

### Incremental Delivery

1. Setup and Foundational: the scene opens
2. US1: gesture control works
3. US2: usable without a camera, which meets Principle II
4. US3: camera control and privacy tests, which meet Principle III
5. US4: repeatable verification, which meets Principles IV and V

---

## Notes

- [P] tasks touch different files and have no dependencies on incomplete tasks
- Tasks marked **Maintainer task** need a person, and cannot be completed by an agent
- SC-002 and SC-003 cannot be measured until T062 is done, so `npm run verify` reports `incomplete` until then
- T063 depends on T062. T064 was run with a temporary sample photo: frame rate met SC-005, so no worker was added
- Commit after each task or logical group

---

## Phase 8: Convergence

- [X] T070 CRITICAL: Make capture start safe in `src/vision/camera.ts`, `src/vision/live-hand-frame-source.ts` and `src/main.ts`, so repeated start requests share one attempt and never leave a second live camera track; report `starting` before the tracker loads; show the capture indicator as soon as a stream exists; allow stopping during `starting`; add a test to `tests/e2e/capture-control.spec.ts` that presses `C` while the model is delayed and confirms no track stays live after stopping, per Constitution III, FR-014, SC-007 (contradicts)
- [X] T071 CRITICAL: Add the hand-tracking p95 budget as a check in `tests/verify/accuracy.verify.test.ts` using `trackingP95Ms` from the benchmark, then bring it within budget or formally revise the 30 ms budget in `specs/001-project-foundation/plan.md` with a reason, per Constitution IV (partial)
- [X] T072 CRITICAL: Move `RecordingHandlers` to `src/contracts`, add `SessionRecorder`'s use of `HandFrameSource` and the capture toggle to `specs/001-project-foundation/contracts/module-contracts.md`, and move the toggle decision out of `src/main.ts` into Core using only `CaptureControl`, per Constitution I (contradicts)
- [X] T073 Replace handedness certainty as `trackingScore` in `src/vision/hand-tracker.ts` with a real tracking-quality signal, and in `src/core/gesture-control.ts` show the poor-tracking message when a hand is lost repeatedly or quality stays low; update `lowTrackingScore` in `src/motion/gesture-rules.ts` and the tests in `tests/contract/core-decisions.contract.test.ts`, per FR-005 and the Poor lighting edge case (partial)
- [X] T074 Keep the object in view when the scene shrinks: add a bounds-change notice to `SceneInfo` in `src/contracts/index.ts` from `src/spatial/scene.ts`, re-clamp the pose in `src/core/interaction-engine.ts`, and add a resize test to `tests/e2e/keyboard.spec.ts`, per FR-003 (partial)
- [X] T075 Add a marked target to the scene in `src/spatial/scene.ts`, shown for first-use testing with `?target=1`, so SC-001 can be measured, per SC-001 (missing)
- [X] T076 Score each labelled gesture in `tests/verify/metrics.ts` by the first recognition in its span, so a wrong gesture lowers accuracy, with a test in `tests/unit/verify/report.test.ts`, per SC-002 (partial)
- [X] T077 Map `NotReadableError` in `src/vision/camera.ts` to a new `camera-busy` reason with its own message in `src/core/capture-feedback.ts` and `specs/001-project-foundation/contracts/user-interface.md`, per FR-012 (partial)
- [X] T078 Add unit tests for `assignHandIds` in `tests/unit/vision/hand-identity.test.ts`, covering two hands crossing and a hand reappearing, per FR-008 (partial)
- [X] T079 Review the test-only hooks `data-hand-tracking` in `src/main.ts`, `data-pose` and `preserveDrawingBuffer` in `src/spatial/scene.ts`; replace them with harness access where practical, or justify keeping them in `specs/001-project-foundation/plan.md`, per plan: Structure Decision (unrequested)

---

## Phase 9: Convergence

- [X] T080 Show the mirrored live camera view behind the 3D object: add a read-only camera feed contract in `src/contracts/index.ts` implemented by `src/vision/camera.ts`, show it filling the scene with `src/spatial/camera-view.ts`, and make the renderer in `src/spatial/scene.ts` transparent so the object stays in front; add a test to `tests/e2e/camera-view.spec.ts`, per FR-024 and US1/AC6 (missing)
- [X] T081 Replace the test requiring an invisible video in `tests/e2e/privacy.spec.ts` with tests that the view is drawn only on this page, and that no image is stored, sent, logged or included in a recording; move the throttling workaround so the visible view element is the one Vision reads, per FR-024, FR-015 and FR-016 (contradicts)
- [X] T082 Show all 21 points and finger lines for every hand in view: pass hand positions and pinch state from `src/motion/gesture-interpreter.ts` through Core to a new `showHands` on `SceneCommands`, draw them in `src/spatial/hand-overlay.ts`, and put the mapping from camera to screen in a pure function that handles mirroring and the cropping of a 4:3 camera in any window shape, tested in `tests/unit/spatial/hand-overlay.test.ts`; points change colour while a pinch is registered, per FR-026, US1/AC6, US1/AC7 and Constitution I (missing)
- [X] T083 Add a button in `src/spatial/status-panel.ts` and a `V` key in `src/core/keyboard-input.ts` to hide and show the camera view while points and gestures keep working, shown by default, with tests in `tests/e2e/camera-view.spec.ts`, per FR-025 and US3/AC5 (missing)
- [X] T084 Clear the camera view and hand points whenever capture is not `active`, including on stop, failure and camera loss, with tests in `tests/e2e/camera-view.spec.ts`, per FR-027 and US3/AC6 (missing)
- [ ] T085 Extend the benchmark in `tests/e2e/harness.ts` to run with the camera view and hand points drawing, add a point-update check to `tests/verify/report.ts`, and if frame rate misses SC-005, move tracking into a worker as in research.md decision 8, per SC-011, SC-005 and Constitution IV (missing)
- [X] T086 Bring `specs/001-project-foundation/contracts/module-contracts.md`, `specs/001-project-foundation/contracts/user-interface.md`, `specs/001-project-foundation/data-model.md`, `specs/001-project-foundation/plan.md` and `README.md` in line with the camera view, hand points and `V` key, and increase `CONTRACT_VERSION` in `src/contracts/index.ts`, per plan: Structure Decision and Constitution I (partial)
- [X] T087 Review the `hand-present` interpretation in `src/motion/gesture-interpreter.ts` and the "Hand detected" messages in `src/core/gesture-control.ts`, which came from a defect fix and are not in the spec; add a requirement for them to `specs/001-project-foundation/spec.md`, or remove them if hand points now make them unnecessary, per spec: FR-007 (unrequested)
