---

description: "Task list for AEGIS facial recognition and face points"
---

# Tasks: Facial Recognition

**Input**: Design documents from `/specs/002-facial-recognition/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks cover what Constitution Principle V requires: module contracts, threshold and confirmation logic, and every Principle III privacy rule. Write them first and confirm they fail.

**Organization**: Tasks are grouped by user story. Face points come first because the plan uses them to prove performance before recognition is built, and they are not part of any one story.

**Rules for every task**:

- Modules (`src/vision`, `src/core`, `src/spatial`) import only from `src/contracts`. Only `src/main.ts` connects them. The exception in the plan's Complexity Tracking applies: face data goes Vision → Core, not through Motion.
- Field names come from `data-model.md`, interfaces from `contracts/module-contracts.md`, and keys and messages from `contracts/user-interface.md`.
- Never store, log or transmit images, templates or names. IndexedDB may hold only encrypted Face Profiles and Consent Records, and must not be created before the first enrolment.
- BlazeFace and Face Landmarker output must never feed recognition. YuNet and SFace must never feed face points.
- Tests use fixtures or simulated input. They must not need a real camera or person.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the runtime and models

- [ ] T001 Add `onnxruntime-web` at exactly 1.30.0 with `yarn add`, updating `package.json` and `yarn.lock`. If Yarn's quarantine refuses it, stop and report; do not weaken the quarantine
- [ ] T002 Extend `scripts/setup-model.mjs` to download `face_landmarker.task`, `face_detection_yunet_2026may.onnx` and `face_recognition_sface_2021dec.onnx`, verify the SHA-256 values in `specs/002-facial-recognition/research.md`, and copy the ONNX Runtime WebAssembly files into `public/ort/`
- [ ] T003 [P] Add `public/ort/` and `fixtures/faces/v1/*.templates.json` to `.gitignore`, and create `fixtures/faces/v1/manifest.json` with an empty `participants` list and the model checksums
- [ ] T004 [P] Create `src/contracts/recognition-settings.ts` with the threshold (0.363), margin (0.05), agreeing results (2), recognition interval (1000 ms), face tracking frame interval (3), profile limit (10) and enrolment captures (5)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contracts, then the face points slice (FR-027 to FR-030), which proves the performance approach

**CRITICAL**: Recognition work must not start until the checkpoint at the end of this phase passes.

### Tests (write first)

- [ ] T005 [P] Write a contract test that no face model loads and no worker starts with both analyses off, per FR-030, in `tests/contract/face-analysis.contract.test.ts`
- [ ] T006 [P] Write unit tests that face tracking and hand tracking never run in the same frame, and that with face points off every frame runs hand tracking, in `tests/unit/core/tracking-schedule.test.ts`
- [ ] T007 [P] Write unit tests for choosing the 100 to 150 outline points and projecting them through the mirror and cover crop, in `tests/unit/spatial/face-overlay.test.ts`
- [ ] T008 [P] Write an end-to-end test that face points start off after every load, that the button and `F` toggle them, that the outline survives hiding the camera view, and that gestures and keyboard behave the same, in `tests/e2e/face-points.spec.ts`

### Implementation

- [ ] T009 Add `FaceStream`, `FaceAnalysis`, `FaceDisplay`, `FaceCommands`, `FaceObservation`, `FaceMarkers`, `FaceLabel`, `FaceState`, `EnrolmentDetails` and `ProfileSummary` to `src/contracts/index.ts`, and raise the contract version to 5
- [ ] T010 Implement `src/core/tracking-schedule.ts`, deciding which camera frames run face tracking instead of hand tracking
- [ ] T011 Implement `src/vision/face-tracker.ts` with Face Landmarker, GPU then CPU, `numFaces: 3`, blendshapes and transformation matrices off, loading only when first needed, per FR-016 and FR-029
- [ ] T012 Connect the schedule to `src/vision/live-hand-frame-source.ts` without changing its behaviour when face points are off
- [ ] T013 Implement `src/spatial/face-overlay.ts` with the outline around the eyes, brows, nose, lips and face edge in silver, on the existing overlay layer
- [ ] T014 Implement the first version of `src/core/face-control.ts` for the on/off state, always off at load, and clear markers when the camera stops, per FR-027 and the camera edge case
- [ ] T015 Create `src/spatial/face-panel.ts` with the face points button, add `F` to `src/core/keyboard-input.ts`, and connect them in `src/main.ts`
- [ ] T016 Extend `tests/e2e/harness.ts` and `tests/verify/report.ts` to measure frame rate, hand tracking and feedback with face points off and on, and report the drop for SC-006
- [ ] T017 Add a 10-minute stability run with hand and face tracking active to `tests/verify/responsiveness.spec.ts`, failing if the page crashes or reloads, because Chrome closed during planning benchmarks
- [ ] T018 Run the benchmark on the reference device in visible Chrome and record results in `specs/002-facial-recognition/research.md`. If the drop exceeds 2 fps, apply research decision 5's fallback, and report any remaining miss rather than changing the target

**Checkpoint**: A person can turn on face points and see the outline, and T017 and T018 have results.

---

## Phase 3: User Story 1 - Enrol With Agreement (Priority: P1) 🎯 MVP

**Goal**: A person who agrees can enrol from a live capture, and an encrypted Face Profile and Consent Record are stored.

**Independent Test**: Enrol one person, confirm both records exist and no image does, and confirm refusing stores nothing.

### Tests for User Story 1 (required by Principle V)

- [ ] T019 [P] [US1] Write unit tests for enrolment: no capture without agreement, live camera input only with no photo or video upload path (FR-003), one face only, discard on cancel, camera stop or low quality, and refuse at 10 profiles, in `tests/unit/core/enrolment.test.ts`
- [ ] T020 [P] [US1] Write unit tests that stored bytes contain no readable template or name, that both records are written in one transaction, that the key is non-extractable, and that a damaged record is reported rather than thrown, in `tests/unit/core/face-profile-store.test.ts`
- [ ] T021 [P] [US1] Write a contract test for a replay `FaceStream` that returns recorded Face Observations, in `tests/contract/face-stream.contract.test.ts`
- [ ] T022 [P] [US1] Write an end-to-end test of the enrolment flow using the replay `FaceStream`, including the consent wording, refused capture and cancellation, in `tests/e2e/enrolment.spec.ts`
- [ ] T023 [P] [US1] Extend `tests/e2e/privacy.spec.ts` to prove no IndexedDB database exists before enrolment, leaving the existing storage assertions unchanged

### Implementation for User Story 1

- [ ] T024 [US1] Implement `src/vision/face-worker.ts`: YuNet on a frame scaled to 320×240, five-point alignment, SFace at 112×112, returning unit-length 128-number templates and closing every frame after use
- [ ] T025 [US1] Implement `src/vision/face-recogniser.ts`, starting the worker only when needed and sending one in-memory frame at a time, and implementing `FaceStream` with face identity across frames
- [ ] T026 [US1] Implement `src/vision/replay-face-stream.ts` so tests and verification can stand in for the camera, as the replay hand source does
- [ ] T027 [US1] Implement `src/core/face-profile-store.ts` with AES-GCM, a non-extractable key, one transaction per person, and creation only at first enrolment
- [ ] T028 [US1] Implement `src/core/enrolment.ts` with the states in `data-model.md`, averaging 5 captures into one unit-length template
- [ ] T029 [US1] Detect a likely existing profile and offer replacement only after that person confirms, per US1/AC6, in `src/core/enrolment.ts`
- [ ] T030 [US1] Add the enrolment dialog with version 1 of the consent wording, name entry and progress to `src/spatial/face-panel.ts`, reachable by keyboard, with shortcuts ignored while typing
- [ ] T031 [US1] Connect enrolment in `src/main.ts`, and report model failures with "Face features could not start. Gestures still work."
- [ ] T032 [US1] Update the `CameraFeed` guarantee in `specs/001-project-foundation/contracts/module-contracts.md` to point to the one-frame worker exception

**Checkpoint**: Enrolment works alone, with nothing stored for anyone who refuses.

---

## Phase 4: User Story 2 - Be Recognised, and Tell People Apart (Priority: P1)

**Goal**: Enrolled people see their own names, and everyone else shows as "Unknown".

**Independent Test**: With two enrolled people and one not, confirm correct labels and that nothing remains about the third.

### Tests for User Story 2 (required by Principle V)

- [ ] T033 [P] [US2] Write contract tests that Core shows no name below the threshold, without the margin, or without two agreeing results, in `tests/contract/face-matcher.contract.test.ts`
- [ ] T034 [P] [US2] Write unit tests that recognition stays off at load, cannot start with no profiles, stops at once when turned off, and clears when the last profile is deleted, in `tests/unit/core/face-control.test.ts`
- [ ] T035 [P] [US2] Write an end-to-end test with the replay `FaceStream` for two names and "Unknown", labels following faces, and the recognition indicator, in `tests/e2e/recognition.spec.ts`
- [ ] T036 [P] [US2] Write a privacy test that after a session with unknown faces, storage is unchanged and no request reached another host, and that no name or template appears in the console, per FR-011, FR-012, FR-014, FR-015 and SC-007, in `tests/e2e/privacy.spec.ts`
- [ ] T037 [P] [US2] Add a test that a Recorded Session and a verification report hold no face data or names, per FR-015, in `tests/unit/core/session-recorder.test.ts`

### Implementation for User Story 2

- [ ] T038 [US2] Implement `src/core/face-matcher.ts` with cosine similarity, threshold, margin and agreement rules
- [ ] T039 [US2] Extend `src/core/face-control.ts` for recognition on/off, and turn the worker's recognition work on and off through `FaceAnalysis`
- [ ] T040 [US2] Draw labels beside faces in `src/spatial/face-overlay.ts`, with a separate **Recognition on** indicator and the security reminder in `src/spatial/face-panel.ts`, per FR-008, FR-009 and FR-022
- [ ] T041 [US2] Add `I` to `src/core/keyboard-input.ts` and the recognition button to `src/spatial/face-panel.ts`, disabled until someone is enrolled
- [ ] T042 [US2] Mark a profile as needing re-enrolment when its `modelSha256` differs from the current model, in `src/core/face-profile-store.ts`

**Checkpoint**: Stories 1 and 2 together are the smallest useful facial recognition.

---

## Phase 5: User Story 3 - Correct a Wrong Name (Priority: P2)

**Goal**: Uncertainty shows as "Unknown", and a wrong name can be removed at once.

**Independent Test**: Use replay input to show a wrong name, reject it, and confirm it stays away for the session and leaves nothing afterwards.

### Tests for User Story 3 (required by Principle V)

- [ ] T043 [P] [US3] Write contract tests that after "Not me", `FaceDisplay` receives no such name for that face, including when it leaves and returns, in `tests/contract/face-correction.contract.test.ts`
- [ ] T044 [P] [US3] Write unit tests that a correction changes no Face Profile, is held in memory only, and is cleared when that profile is deleted, in `tests/unit/core/face-control.test.ts`
- [ ] T045 [P] [US3] Write an end-to-end test that the **Not me** control and `N` remove a name within 1 second, and that reloading leaves nothing, in `tests/e2e/recognition.spec.ts`

### Implementation for User Story 3

- [ ] T046 [US3] Add Session Corrections to `src/core/face-control.ts`, comparing returning faces against the rejected template in memory
- [ ] T047 [US3] Add the **Not me** control beside named faces in `src/spatial/face-panel.ts`, add `N` to `src/core/keyboard-input.ts`, and show the re-enrol guidance, per US3/AC5

**Checkpoint**: Wrong names can be removed by button or key.

---

## Phase 6: User Story 4 - Withdraw and Delete Face Data (Priority: P2)

**Goal**: Anyone at the device can see who is enrolled and permanently delete a profile.

**Independent Test**: Enrol two people, delete one, and confirm their data is gone, they show as "Unknown", and the other is still recognised.

### Tests for User Story 4 (required by Principle V)

- [ ] T048 [P] [US4] Write contract tests that deletion does nothing unless confirmed, removes both records together, and clears matching at once, in `tests/contract/face-deletion.contract.test.ts`
- [ ] T049 [P] [US4] Write an end-to-end test that the list shows names and dates and no images, that a deleted person's bytes are gone from IndexedDB, that a damaged profile can be deleted, and that **Delete everyone** removes the database and key, per SC-008, in `tests/e2e/deletion.spec.ts`

### Implementation for User Story 4

- [ ] T050 [US4] Add list and delete operations to `src/core/face-profile-store.ts`, removing the database and key after the last profile is deleted
- [ ] T051 [US4] Add the **People** list, **Delete**, **Delete everyone** and confirmation to `src/spatial/face-panel.ts`, working while the camera is off
- [ ] T052 [US4] Connect deletion to matching and Session Corrections in `src/main.ts`, so a deleted person immediately shows as "Unknown"

**Checkpoint**: All four person-facing stories work independently.

---

## Phase 7: User Story 5 - Verify Recognition Without Live People (Priority: P3)

**Goal**: A maintainer can measure accuracy with no camera, and a missed target fails.

**Independent Test**: Run verification with no camera and confirm SC-002 to SC-004 and SC-010 are reported.

### Tests for User Story 5 (required by Principle V)

- [ ] T053 [P] [US5] Write a contract test for the evaluation manifest against `contracts/face-evaluation-manifest.schema.json`, requiring consent dates and matching model checksums, in `tests/contract/face-evaluation.contract.test.ts`
- [ ] T054 [P] [US5] Write unit tests that metrics compute correct, misidentified and unknown-as-enrolled rates, and flag a gap above 5 points between groups, in `tests/unit/verify/face-metrics.test.ts`

### Implementation for User Story 5

- [ ] T055 [US5] Add a capture mode at `?record-faces=1` that exports templates only, after recording the participant's agreement, in `src/spatial/face-panel.ts` and `src/core/enrolment.ts`
- [ ] T056 [US5] Implement face metrics and add SC-002, SC-003, SC-004, SC-005 and SC-010 to `tests/verify/report.ts`, reporting `incomplete` when the evaluation set is missing
- [ ] T057 [US5] Implement `tests/verify/face-accuracy.verify.test.ts`, replaying templates through the real matcher with no camera
- [ ] T058 [US5] **Maintainer task**: collect templates from people who agree, including people acting as unknown, in normal and poor lighting, into `fixtures/faces/v1/`, and update the manifest
- [ ] T059 [US5] Tune the threshold and margin in `src/contracts/recognition-settings.ts` against the evaluation set, and record results in `specs/002-facial-recognition/research.md`. Depends on T058

**Checkpoint**: `yarn verify` reports recognition accuracy, or `incomplete` until the data exists.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finish what crosses stories

- [ ] T060 [P] Extend the import-scan test in `tests/unit/module-boundaries.test.ts` to cover the new files, and fail if face points code imports recognition code or the reverse
- [ ] T061 [P] Add an automated check that every Principle III rule in this feature maps to a named test, per FR-026, in `tests/unit/face-privacy-coverage.test.ts`
- [ ] T062 [P] Update `README.md` for face setup, keys, limits, the not-a-security-feature note and the home-use assumption
- [ ] T063 [P] Update the storage note in `specs/001-project-foundation/plan.md` and the keyboard table in `specs/001-project-foundation/contracts/user-interface.md` to point to this feature
- [ ] T064 Run `yarn build`, `yarn test`, `yarn e2e` and `yarn verify`, and record the real results
- [ ] T065 Measure YuNet 2026may at 320×240 and SC-005 on the reference device, and record them in `specs/002-facial-recognition/research.md`, because planning did not measure it
- [ ] T066 **Maintainer task**: run every live scenario in `specs/002-facial-recognition/quickstart.md`, and time SC-001 and SC-009 with first-time users who agree
- [ ] T067 **Maintainer task**: have the SFace training data and biometric consent wording reviewed before any commercial release, per the risks in `specs/002-facial-recognition/research.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup, and blocks all stories until its checkpoint passes
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on US1
- **US3 (Phase 5)**: Depends on US2
- **US4 (Phase 6)**: Depends on US1; can run alongside US2 and US3, though its "Unknown" test needs US2
- **US5 (Phase 7)**: Depends on US2, and T059 depends on the maintainer's T058
- **Polish (Phase 8)**: Depends on the stories being delivered

### Within Each User Story

- Tests are written first and must fail
- Vision, then Core, then Spatial, then `src/main.ts`
- Tasks touching `src/spatial/face-panel.ts`, `src/core/face-control.ts` or `src/core/keyboard-input.ts` run one at a time

### Parallel Opportunities

- T003 and T004
- T005 to T008
- T019 to T023, T033 to T037 (T036 and T023 both touch `tests/e2e/privacy.spec.ts`, so run them apart), T043 to T045, T048 and T049, T053 and T054
- T060 to T063

## Parallel Example: User Story 2

```bash
Task: "Contract tests for matching in tests/contract/face-matcher.contract.test.ts"
Task: "Unit tests for recognition state in tests/unit/core/face-control.test.ts"
Task: "End-to-end test in tests/e2e/recognition.spec.ts"
```

---

## Implementation Strategy

### First visible result

Phases 1 and 2 give you face points, and show whether this Mac can carry the load, before any stored data exists. Stop and review there.

### MVP

Add Phases 3 and 4 for enrolment and names. Do not share or show MVP recognition to others until Phases 5 and 6 are also done, because correction and deletion are part of the consent promise.

### Incremental Delivery

1. Face points → review performance
2. Enrol and recognise → test with people who agree
3. Correct and delete → the promise in the consent wording is complete
4. Verify → accuracy targets can be proven

---

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Do not lower a target to pass it. Report the miss
- Commit after each task or logical group
