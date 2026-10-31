# Feature Specification: Project Foundation

**Feature Branch**: `001-project-foundation`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "start the project foundation from the requirements"

## Overview

AEGIS aims to let people work with digital information through gestures, voice and spatial
interfaces. This foundation is the first working version of that idea: a person moves and
rotates a 3D object on screen using their bare hands in front of a webcam. It delivers one
complete path from real human input to a visible result, and it gives every later feature a
safe, testable base to build on.

## Clarifications

### Session 2026-10-31

- Q: Where should the camera view appear? → A: Full background: the mirrored camera fills the scene, with hand points on top and the 3D object in front.
- Q: Should you be able to hide the camera view while gestures keep working? → A: Shown by default, and a button and key hide or show it while gestures keep working.
- Q: How should the points on your hands look? → A: All 21 points joined by finger lines, changing colour when a pinch registers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Control a 3D Object With Hand Gestures (Priority: P1)

A person opens AEGIS, sees a 3D object in a spatial scene, and raises a hand in front of the
webcam. They pinch and drag to move the object, pinch and twist to rotate it, and hold an open
palm to return it to its starting position. AEGIS shows which gesture it recognised as it
happens.

**Why this priority**: This is the core promise of AEGIS. Without it, nothing demonstrates that
natural interaction with digital content works.

**Independent Test**: Can be fully tested by having a person with a webcam perform each of the
three gestures and confirming that the object responds correctly and the recognised gesture is
shown on screen.

**Acceptance Scenarios**:

1. **Given** the scene is showing and the camera is active, **When** the person pinches and
   drags, **Then** the object follows the hand's movement.
2. **Given** the scene is showing and the camera is active, **When** the person pinches and
   twists, **Then** the object rotates in the direction of the twist.
3. **Given** the object has been moved or rotated, **When** the person holds an open palm for
   one second, **Then** the object returns to its starting position and orientation.
4. **Given** the person is performing a gesture, **When** AEGIS recognises it, **Then** the
   gesture's name is shown on screen.
5. **Given** AEGIS is unsure what a hand movement means, **When** its confidence is below the
   threshold for that action, **Then** the object does not change and the person sees that the
   gesture was not understood.
6. **Given** the camera is active, **When** the person raises a hand, **Then** they see themselves
   mirrored behind the object, with points and finger lines on their hand, and are told what to do
   next.
7. **Given** hand points are showing, **When** the person pinches, **Then** the points change colour
   until the pinch ends.

---

### User Story 2 - Control the Object Without a Camera (Priority: P2)

A person whose camera is missing, blocked or unreliable, or who cannot perform the gestures,
controls the same object from the keyboard. Every action available by gesture is also available
this way, and the on-screen controls explain which keys to use.

**Why this priority**: AEGIS must remain usable when recognition is unavailable. It is second
because it adds no new interaction concept, but it is what makes the system dependable.

**Independent Test**: Can be fully tested on a device with no camera by moving, rotating and
resetting the object using only the keyboard.

**Acceptance Scenarios**:

1. **Given** no camera is available, **When** AEGIS starts, **Then** the scene still opens, the
   person is told gestures are unavailable, and keyboard controls are shown.
2. **Given** the scene is showing, **When** the person uses the move, rotate or reset keys,
   **Then** the object responds as it does to the matching gesture.
3. **Given** the camera stops working during a session, **When** this is detected, **Then** the
   person is told and can continue from the keyboard without restarting.

---

### User Story 3 - Stay in Control of the Camera (Priority: P3)

A person can always see whether AEGIS is using the camera and can stop it at any moment, either
with an on-screen control or with a key. Stopping it never closes the scene.

**Why this priority**: AEGIS watches people, so trust is a condition of using it. It follows the
first two stories because it needs a working camera experience to control.

**Independent Test**: Can be fully tested by starting AEGIS, confirming the capture indicator is
visible, stopping capture by each method, and confirming that the camera stops and the indicator
clears.

**Acceptance Scenarios**:

1. **Given** the camera is in use, **When** the person looks at the screen, **Then** a capture
   indicator is visible at all times.
2. **Given** the camera is in use, **When** the person stops capture by the on-screen control or
   the key, **Then** capture ends, the indicator clears, and keyboard control continues.
3. **Given** capture has been stopped, **When** the person chooses to restart it, **Then** gesture
   control resumes without restarting AEGIS.
4. **Given** a session has ended, **When** the device is inspected, **Then** no camera images from
   that session remain on it.
5. **Given** the camera view is showing, **When** the person hides it, **Then** the view disappears,
   hand points stay visible, and gestures keep working.
6. **Given** capture has been stopped, **When** the person looks at the scene, **Then** no camera
   view or hand points are shown.

---

### User Story 4 - Verify AEGIS Without a Camera (Priority: P4)

A maintainer checks that AEGIS still works after a change by replaying recorded hand sessions
instead of performing gestures live. They receive a clear report of what was recognised, how
accurate it was, and whether responsiveness stayed within budget.

**Why this priority**: Every later feature depends on being able to prove that existing behaviour
still works. It comes last because it validates the other stories rather than adding to what a
person can do.

**Independent Test**: Can be fully tested on a machine with no camera by running the verification
against recorded sessions and confirming that it produces a pass or fail report.

**Acceptance Scenarios**:

1. **Given** a set of recorded hand sessions, **When** the maintainer runs verification, **Then**
   each session produces the same actions as it would have live.
2. **Given** verification has run, **When** the maintainer reads the report, **Then** it shows
   recognition accuracy and responsiveness against their targets.
3. **Given** a change lowers accuracy below target or breaks a responsiveness budget, **When**
   verification runs, **Then** it fails and identifies which target was missed.
4. **Given** no recording has been started, **When** AEGIS is used normally, **Then** nothing from
   the camera is saved.

---

### Edge Cases

- **Low-confidence or ambiguous recognition**: No action is taken and the person sees that the
  gesture was not understood.
- **Wrong recognition**: The person can undo any effect by resetting the object, as no action in
  this foundation is destructive.
- **Camera unavailable**: With no camera, permission denied, or the camera lost mid-session, the
  scene stays open and the person is told why and offered keyboard control.
- **Hand leaves view mid-gesture**: The gesture ends and the object stays where it is.
- **Several hands or people in view**: Only one hand controls the object at a time. The hand that
  started the gesture keeps control until the gesture ends.
- **Poor lighting**: When conditions make recognition unreliable, the person is told, rather than
  gestures silently failing.
- **Object pushed out of view**: The object stops at the edge of the visible scene and always
  remains reachable.
- **Gesture and keyboard used together**: The keyboard takes priority until the key is released.
- **System under load**: Out-of-date hand movements are dropped, and the object never replays a
  backlog of delayed input.
- **Sensor data**: Camera images are used only in memory, are shown only on this screen, and never
  leave the device or get saved. An explicitly started recording saves hand positions, not images.

## Requirements *(mandatory)*

### Functional Requirements

**Scene and object control**

- **FR-001**: System MUST display a spatial scene containing one 3D object.
- **FR-002**: Users MUST be able to move the object, rotate it, and reset it to its starting
  position and orientation.
- **FR-003**: System MUST keep the object within the visible scene.

- **FR-024**: While the camera is on, System MUST show the mirrored camera view filling the scene,
  with hand points on top of it and the 3D object in front.
- **FR-025**: Users MUST be able to hide and show the camera view with an on-screen control and a
  key, without stopping the camera or gesture control. The view MUST be shown by default, and hand
  points MUST stay visible while it is hidden.
- **FR-026**: System MUST show all 21 points of every hand in view, aligned with that hand in the
  mirrored view and joined by finger lines, and MUST change their colour while a pinch is registered.
- **FR-027**: When the camera is off or unavailable, System MUST show the plain scene with no camera
  view and no hand points.

**Gesture interaction**

- **FR-004**: System MUST recognise three gestures from webcam input: pinch and drag (move), pinch
  and twist (rotate), and open palm held for one second (reset).
- **FR-005**: System MUST attach a confidence value to each gesture it interprets.
- **FR-006**: System MUST carry out a gesture's action only when its confidence meets the
  documented threshold for that action.
- **FR-007**: System MUST show the name of each recognised gesture, and MUST show when a gesture
  was detected but not understood.
- **FR-028**: System MUST tell the person when a hand is detected and what to do next, and MUST ask
  for a hand when none is in view.
- **FR-008**: System MUST give control to one hand at a time and keep it with that hand until the
  gesture ends.
- **FR-009**: System MUST discard out-of-date input rather than act on it.

**Alternative input**

- **FR-010**: Users MUST be able to perform every object action and start or stop capture from the
  keyboard.
- **FR-011**: System MUST show the keyboard controls on screen.
- **FR-012**: System MUST remain usable from the keyboard when the camera is missing, denied, lost
  or stopped, and MUST tell the person why gestures are unavailable.

**Privacy and camera control**

- **FR-013**: System MUST show a visible indicator whenever the camera is in use.
- **FR-014**: Users MUST be able to stop and restart capture at any time without restarting AEGIS.
- **FR-015**: System MUST process camera images in memory only and MUST NOT send them off the
  device.
- **FR-016**: System MUST NOT record camera images, or anything derived from them that could
  reproduce a person's image, except during a recording a maintainer explicitly started.
- **FR-017**: System MUST NOT include camera images in logs or diagnostics.

**Verification**

- **FR-018**: System MUST allow recorded sessions to stand in for live camera input, producing the
  same interpretations as the same input would live.
- **FR-019**: System MUST produce a verification report showing recognition accuracy and
  responsiveness against their targets, with an overall pass or fail.
- **FR-020**: System MUST let a maintainer record a labelled session for verification, only after
  explicitly starting it.
- **FR-021**: Each stage from sensing through interpretation, decision and display MUST be testable
  on its own, without camera hardware.

**Foundation**

- **FR-022**: System MUST use the canonical AEGIS module names, and MUST refer to itself as a
  platform rather than as an assistant.
- **FR-023**: Project documentation MUST explain how to set up, run and verify AEGIS.

### Key Entities

- **Spatial Scene**: The 3D space the person sees; contains the object and its visible boundaries.
- **Scene Object**: The 3D item being controlled; has a position, an orientation and a starting
  state to return to.
- **Gesture Interpretation**: What AEGIS believes a hand did; has a gesture type, a confidence
  value and a time.
- **Action**: A requested change to the object (move, rotate or reset), from either a gesture or
  the keyboard.
- **Capture Session**: A period of camera use; has a state (active, stopped or unavailable) that
  the person can always see.
- **Recorded Session**: A labelled recording of hand movement, with the gestures it contains, made
  with the agreement of the person recorded.
- **Verification Report**: The outcome of a verification run; has accuracy, responsiveness, their
  targets, and an overall result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 80% of first-time users can move the object to a marked target and rotate
  it within 2 minutes, using only on-screen guidance.
- **SC-002**: At least 90% of the gestures in the recorded evaluation set are correctly recognised.
- **SC-003**: AEGIS takes no more than 1 unintended action per 5 minutes while a person's hands are
  in view doing unrelated things.
- **SC-004**: In 95% of gestures, the person sees the result within 0.2 seconds on the reference
  device.
- **SC-005**: Movement of the object looks smooth, at 30 frames per second or more on the reference
  device, while gestures are in use.
- **SC-006**: All object actions can be completed from the keyboard with no camera present.
- **SC-007**: After the person stops capture, the camera is off within 0.5 seconds, every time.
- **SC-008**: Inspection after a normal session finds no camera images on the device and none sent
  from it.
- **SC-009**: Three consecutive verification runs on the same recordings, with no camera attached,
  give identical recognition results.
- **SC-010**: A new contributor can set up, run and verify AEGIS within 30 minutes by following the
  documentation alone.
- **SC-011**: With the camera view showing, hand points land on the visible hand and follow it, with
  a person seeing them update within 0.2 seconds in 95% of movements on the reference device.

## Assumptions

- The README is the source of requirements. No separate requirements document exists.
- "Foundation" means a working first slice rather than an empty project skeleton, because the
  constitution requires each specification to deliver a path from real input to a visible
  outcome (Principle VI).
- Only the capabilities this slice needs are in scope: Vision, Motion, Core and Spatial. Voice,
  Intelligence, the SDK and physical-environment or object perception are left to later features.
- One person uses AEGIS at a time, locally on one device. There are no accounts and nothing is
  shared.
- Object position is not saved between sessions.
- Resetting the object needs no confirmation, because no work is lost and nothing in this
  foundation is destructive.
- The reference device is the maintainer's MacBook Pro (quad-core Intel Core i7, 16 GB memory) with
  its built-in webcam, and the plan confirms this. The targets in SC-004 and SC-005 are initial
  values that the plan may revise with a reason.
- Automated verification runs on recordings from people who agreed to be recorded.
