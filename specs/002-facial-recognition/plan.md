# Implementation Plan: Facial Recognition

**Branch**: `002-facial-recognition` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-facial-recognition/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add optional face points and on-device recognition of up to 10 enrolled people. Face points draw an
outline on every face using MediaPipe Face Landmarker, and stay off until turned on. Recognition uses
separate models, YuNet and SFace, in a Web Worker about once a second. Core compares each result with
encrypted Face Profiles and shows a name only when it is confident. Faces of people who are not
enrolled are shown as "Unknown", and nothing about them is kept.

## Technical Context

**Language/Version**: TypeScript 5.9.3 on Node 20.20.2

**Primary Dependencies**: Existing `@mediapipe/tasks-vision` 1.2.0 and `three` 0.187.0. New:
`onnxruntime-web` 1.30.0 (MIT), and three downloaded models: Face Landmarker (Apache 2.0), YuNet 2026may
(MIT) and SFace 2021dec (Apache 2.0). See [research.md](research.md).

**Storage**: IndexedDB in the browser profile, created only at the first enrolment, and encrypted with
AES-GCM using a non-extractable WebCrypto key.

**Testing**: Vitest (unit, contract, verification), Playwright with installed Chrome (end-to-end,
simulated camera)

**Target Platform**: Chrome on macOS from `localhost`, same reference device as the foundation

**Project Type**: Local web application

**Performance Goals**: Name within 2 seconds (SC-005); with everything on and three faces, a frame rate
drop of no more than 2 fps (SC-006)

**Constraints**: Fully on-device; no images stored; no run-time third-party requests; automated checks
need no camera or person; face analysis fully off unless turned on

**Scale/Scope**: Up to 10 Face Profiles, about 3 faces in view

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Before research | After design |
| --------- | ---- | --------------- | ------------ |
| I. Modular Platform & Canonical Naming | Canonical names; contracts only | Pass | Pass with one justified exception: see Complexity Tracking |
| II. Reliable Natural Interaction | Confidence; Core decides; feedback; alternative input; confirm destructive actions | Pass | Pass: Vision reports, Core matches; every control works by keyboard; deletion is confirmed |
| III. Private-by-Default Perception | In-memory; visible; opt-in; no raw data in logs; consent | Pass | Pass: only Face Profiles persist, by explicit opt-in and encrypted; separate recognition indicator; CSP still blocks other hosts |
| IV. Measured Real-Time Performance | Budget, named hardware, repeatable benchmark | Pass | **Pass, at risk**: budgets set, but SC-006 is unproven and first measurements were over a frame. See Risks |
| V. Verifiable Behaviour | Tests first; no live hardware; versioned dataset | Pass | Pass: fixtures of templates; privacy rules have tests; dataset tied to model checksums |
| VI. Vertical Slices Before Breadth | Real input to visible outcome; nothing speculative | Pass | Pass: each story is usable alone; no accounts, settings or liveness work |

**Platform Constraints**: Licences are in [research.md](research.md). All models are downloaded at
setup, not stored in the repository.

## Project Structure

### Documentation (this feature)

```text
specs/002-facial-recognition/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── module-contracts.md
│   ├── user-interface.md
│   └── face-evaluation-manifest.schema.json
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── contracts/
│   ├── index.ts                 # Face contracts; version becomes 5
│   └── recognition-settings.ts  # Threshold, margin, rates
├── vision/
│   ├── face-tracker.ts          # Face Landmarker, for face points only
│   ├── face-recogniser.ts       # Main-thread side of the worker
│   └── face-worker.ts           # YuNet and SFace; returns templates, keeps nothing
├── core/
│   ├── face-matcher.ts          # Threshold, margin and agreement rules
│   ├── face-profile-store.ts    # Encrypted storage and deletion
│   ├── enrolment.ts             # Consent, capture and quality rules
│   ├── face-control.ts          # On/off state and session corrections
│   └── tracking-schedule.ts     # Which camera frames run face tracking
├── spatial/
│   ├── face-overlay.ts          # Face outline and labels
│   └── face-panel.ts            # Enrol, list, delete, on/off controls
└── main.ts

tests/
├── contract/
├── unit/
├── e2e/                         # Includes face privacy tests
└── verify/                      # Face accuracy and performance

fixtures/
└── faces/v1/                    # Manifest committed; templates git-ignored
```

**Structure Decision**: Same single project and module folders as the foundation. Storage sits in Core
because Core alone decides on identity.

## Delivery order

1. **Face points**: the visible slice with no stored data, which also proves the performance approach
   before recognition is built on it.
2. **Enrolment** (User Story 1): consent, capture and encrypted storage.
3. **Recognition** (User Story 2): worker, matching and labels.
4. **Deletion and correction** (User Stories 3 and 4).
5. **Verification** (User Story 5): evaluation set, report and tuning.

## Risks

| Risk | Impact | Response |
| ---- | ------ | -------- |
| Hand and face tracking compete for the GPU | SC-006 missed; running both took 64–244 ms against a 33 ms frame | Never run both in a frame; measure first in step 1; drop to every fifth frame if needed |
| The foundation's frame rate target is already missed | Little headroom (T085) | SC-006 is measured against recognition off; report both figures |
| Chrome closed in 2 of 5 benchmark runs | Possible instability with several models loaded | Step 1 includes a long stability run; cause is unknown and may be unrelated |
| YuNet at 320×240 is unmeasured | Recognition may run slower than planned | Measure in step 3; the rate can drop while staying within 2 seconds |
| Accuracy targets are unproven | SC-002 to SC-004 may fail, especially across groups | Tune against the evaluation set; never lower targets without recording why |
| SFace's training data is unclear | Legal and ethical exposure on commercial release | Recorded in research; needs review before any commercial use |
| Stored templates can reveal a likeness | Harm if the browser profile is copied | Encryption, explicit consent wording, easy deletion |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| Face results go Vision → Core, not through Motion (Principle I: Vision → Motion → Core) | Faces are not movement, so Motion has nothing to interpret. The flow stays one way, and Motion's job does not change | Passing them through Motion unchanged would add a contract with no purpose and suggest Motion handles identity |
| Two separate face paths and a new runtime | BlazeFace's card puts identity recognition out of scope, and no MediaPipe task compares faces | Reusing the bundle's crop would use BlazeFace for a purpose its card excludes |
