# Quickstart: Validate the Project Foundation

This guide proves the feature works once it is built. The contracts it relies on are in
[contracts/](contracts/).

## Prerequisites

- Node 20.19 or later, Yarn 4, and Chrome with hardware acceleration on
- A webcam for the live scenarios

## Setup

```sh
yarn install
yarn setup:model       # downloads the tracking model once and checks its checksum
yarn dev               # serves AEGIS at the localhost address it prints
```

## Automated checks (no camera needed)

| Command          | Proves                                                   | Expected          |
| ---------------- | -------------------------------------------------------- | ----------------- |
| `yarn test`      | Contracts, gesture rules, Core decisions, module imports | All tests pass    |
| `yarn e2e`       | App behaviour, camera failures, privacy (simulated camera) | All tests pass  |
| `yarn verify`    | SC-002, SC-003, SC-004, SC-005, SC-009                   | `result: pass`    |

`yarn verify` opens a visible Chrome window, because a headless browser has no real GPU. It
reports `incomplete`, never `pass`, if a software renderer is used or a target is not measured.

## Live scenarios

### 1. Gestures (User Story 1)

1. Allow camera access and raise one hand.
2. Pinch and drag: the object follows your hand.
3. Pinch and twist: the object rotates.
4. Hold an open palm for one second: the object resets.
5. Make a vague hand movement: the object stays put and "Gesture not understood" may appear.

**Expected**: the gesture name appears each time, and a second hand never takes over mid-gesture.

### 2. Keyboard only (User Story 2)

1. Deny camera access and reload.
2. Use the arrow keys, `Q`, `E` and `R`.
3. Allow the camera, then unplug or disable it during use, if an external camera is available.

**Expected**: the scene stays open, the message explains why, and the keyboard still works.

### 3. Camera control (User Story 3)

1. Confirm the capture indicator is showing, and the Mac's green camera light is on.
2. Press `C`, then restart using the button.

**Expected**: the green light goes off within 0.5 seconds, and gestures resume without a reload.

### 4. Privacy (SC-008)

Covered by `yarn e2e`, which fails on any request to another host or any stored camera data.

### 5. Whole-path latency (SC-004, one-off check)

Film your hand and the screen together with a phone at 120 fps or more. Count the frames between
the pinch closing and the on-screen change, over 20 gestures. Record the result in the plan.

**Expected**: at least 19 of the 20 gestures take 0.2 seconds or less.

## First-use test (SC-001)

Open AEGIS with `?target=1` to show a marked ring. Ask each person to move the object onto it and
rotate the object, using only the on-screen guidance.

## Recording evaluation sessions

Open AEGIS with `?record=1`. Record at least 20 of each gesture, and at least 5 minutes of unrelated
hand movement, in normal and poor lighting. Save the downloaded files in
`fixtures/sessions/v1/`. Record only people who have agreed.
