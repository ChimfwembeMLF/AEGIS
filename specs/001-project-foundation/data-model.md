# Data Model: Project Foundation

All state lives in memory. The only files AEGIS produces are recordings and verification reports,
both created at a maintainer's request.

## Scene Object

| Field           | Type        | Rules                                         |
| --------------- | ----------- | --------------------------------------------- |
| `position`      | `{x, y}`    | Stays inside the Scene Bounds (FR-003)        |
| `rotation`      | radians     | Around the axis facing the viewer; wraps      |
| `initialPose`   | pose        | Fixed; target of reset                        |

Movement uses the plane facing the viewer, and rotation uses one axis. Full 3D manipulation is a
later feature.

## Scene Bounds

| Field                  | Type   | Rules                               |
| ---------------------- | ------ | ----------------------------------- |
| `minX, maxX, minY, maxY` | number | Derived from the visible scene area |

## Hand Frame

Vision's output for one processed camera frame. Contains no image data.

| Field         | Type                 | Rules                                       |
| ------------- | -------------------- | ------------------------------------------- |
| `timestampMs` | number               | Capture time; increases with every frame    |
| `hands`       | `TrackedHand[]`      | Empty when no hand is found                 |

**TrackedHand**: `handId`, `handedness` (`left` or `right`), `trackingScore` (0–1), and exactly 21
`landmarks`, each with normalised `x`, `y`, `z`. The tracker has no quality score, so `trackingScore`
rescales its handedness certainty, which runs from 0.5 to 1, to run from 0 to 1.

## Gesture Interpretation

Motion's output, passed to Core.

| Field         | Type                                        | Rules                      |
| ------------- | ------------------------------------------- | -------------------------- |
| `gesture`     | `pinch-drag`, `pinch-twist`, `open-palm`, `unknown`, `hand-present` |                    |
| `phase`       | `start`, `update`, `end`                    |                            |
| `confidence`  | 0–1                                         | Required on every message  |
| `delta`       | `{dx, dy}` or `{dAngle}`                    | Absent for `open-palm`     |
| `handId`      | string                                      | Hand holding control       |
| `timestampMs` | number                                      | From the source Hand Frame |

## Hand Markers

Motion's output for display, passed through Core to Spatial. Contains no image data.

| Field       | Type       | Rules                                   |
| ----------- | ---------- | --------------------------------------- |
| `handId`    | string     |                                         |
| `landmarks` | 21 points  | Same coordinates as Hand Frame          |
| `pinching`  | boolean    | True while a pinch is registered        |

## Camera View State

| Field            | Type    | Rules                                            |
| ---------------- | ------- | ------------------------------------------------ |
| `visible`        | boolean | True only while capture is `active` and not hidden |
| `hiddenByPerson` | boolean | Kept across camera restarts                      |

## Action

A request to change the object, from a gesture or the keyboard.

| Field    | Type                          | Rules                               |
| -------- | ----------------------------- | ----------------------------------- |
| `type`   | `move`, `rotate`, `reset`     |                                     |
| `source` | `gesture`, `keyboard`         | Keyboard takes priority while held  |
| `delta`  | as above                      | Absent for `reset`                  |

## Interaction Settings

Starting values, tuned against the evaluation set and kept in one versioned file.

| Setting              | Initial | Used by |
| -------------------- | ------- | ------- |
| `moveThreshold`      | 0.60    | FR-006  |
| `rotateThreshold`    | 0.70    | FR-006  |
| `resetThreshold`     | 0.80    | FR-006  |
| `resetHoldMs`        | 1000    | FR-004  |
| `maxInputAgeMs`      | 150     | FR-009  |

## Feedback

Core's output to Spatial's on-screen status.

| Field     | Type                                                          |
| --------- | ------------------------------------------------------------- |
| `kind`    | `recognised`, `not-understood`, `capture-state`, `poor-tracking`, `hand-state` |
| `gesture` | gesture name, when relevant                                   |
| `captureState` | capture state, on `capture-state` feedback               |
| `message` | short text for the person                                     |

## Capture Session

| Field    | Type                                                           |
| -------- | -------------------------------------------------------------- |
| `state`  | `starting`, `active`, `stopped`, `unavailable`                 |
| `reason` | `no-camera`, `camera-busy`, `permission-denied`, `camera-lost`, `tracking-failed`, when unavailable |

```text
starting ──granted──▶ active ──person stops──▶ stopped ──person restarts──▶ starting
    │                   │
    └──failure──▶ unavailable ◀──camera lost──┘
                    │
                    └──person retries──▶ starting
```

The capture indicator shows while the state is `active` (FR-013). Keyboard control works in every
state (FR-012).

## Gesture Control

Core's state for which hand has control (FR-008).

```text
idle ──gesture start at or above threshold──▶ controlled(handId)
controlled ──gesture end, or hand lost──▶ idle (object stays where it is)
controlled ──key held──▶ suspended ──key released──▶ idle
```

## Recorded Session

The file format is [recorded-session.schema.json](contracts/recorded-session.schema.json).

- Contains Hand Frames and labelled gesture spans, and never images or audio.
- `consent` must be `true`, with a non-identifying `subjectId`.
- A label is a gesture type with start and end times. `none` marks unrelated hand movement, used to
  measure unintended actions (SC-003).

## Evaluation Dataset

A versioned folder of Recorded Sessions with a manifest. It is valid for one tracking model
checksum, so changing the model requires a new dataset version.

## Verification Report

The file format is [verification-report.schema.json](contracts/verification-report.schema.json).

`result` is `pass`, `fail` or `incomplete`. A target that could not be measured makes the result
`incomplete`, and never `pass`.
