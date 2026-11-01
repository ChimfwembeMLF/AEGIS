# Feature Specification: Facial Recognition

**Feature Branch**: `002-facial-recognition`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "Facial recognition: AEGIS recognises several enrolled people by face. Each person enrols with their agreement and AEGIS tells them apart, running on this device. Anyone not enrolled shows as unknown and nothing is stored about them. Include per-person consent, deletion of a person's face data, and handling of misidentification."

## Clarifications

### Session 2026-10-31

- Q: When should face points appear? → A: Off by default, and shown only after a person turns them on with a button or key.
- Q: How detailed should the face points be? → A: An outline of points joined by lines around the eyes, brows, nose, lips and face edge, about 100 to 150 points.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enrol With Agreement (Priority: P1)

A person who wants AEGIS to know them chooses to enrol, reads what will be stored and why, agrees,
enters a display name, and looks at the camera for a short guided capture. AEGIS then holds a Face
Profile for them on this device. Nobody can be enrolled without being present and agreeing.

**Why this priority**: Nothing can be recognised until someone is enrolled, and enrolment is where
consent is obtained, so every other story depends on it.

**Independent Test**: Enrol one person with the camera on, and confirm that a Face Profile and its
Consent Record exist on the device, that no image was stored, and that refusing consent stores
nothing.

**Acceptance Scenarios**:

1. **Given** the person has opened enrolment, **When** they have not yet agreed, **Then** the
   capture cannot start and nothing is stored.
2. **Given** the person has agreed and entered a display name, **When** the guided capture
   completes, **Then** a Face Profile and a Consent Record are saved, and AEGIS confirms it.
3. **Given** enrolment is in progress, **When** more than one face is in view, **Then** the capture
   pauses and asks for one person only.
4. **Given** enrolment is in progress, **When** the person cancels or the camera stops, **Then**
   nothing from that attempt is kept.
5. **Given** the capture quality is too low, **When** it finishes, **Then** AEGIS explains what to
   improve, such as lighting, and saves nothing.
6. **Given** the person's face matches an existing Face Profile, **When** they try to enrol again,
   **Then** AEGIS says they may already be enrolled and offers to replace that profile, only after
   that person confirms it is theirs.

---

### User Story 2 - Be Recognised, and Tell People Apart (Priority: P1)

With recognition turned on, each enrolled person who is in view sees their display name beside
their face. Several people can be in view at once and each is labelled separately. Anyone who is
not enrolled is shown as "Unknown", and nothing about them is kept.

**Why this priority**: This is the feature's purpose. With User Story 1 it forms the smallest useful
version of facial recognition.

**Independent Test**: Enrol two people, then bring each into view alone, both together, and a
third person who is not enrolled. Confirm the two names and "Unknown" appear on the right faces, and
that nothing about the third person exists on the device afterwards.

**Acceptance Scenarios**:

1. **Given** recognition is on and an enrolled person is in view, **When** AEGIS is confident who
   they are, **Then** their display name appears beside their face within 2 seconds.
2. **Given** two enrolled people are in view, **When** both are recognised, **Then** each face shows
   the right name, and the names stay with the right faces as they move.
3. **Given** a person who is not enrolled is in view, **When** recognition runs, **Then** they are
   shown as "Unknown", and nothing about them is stored.
4. **Given** recognition is off, **When** faces are in view, **Then** no face is identified and no
   names or labels appear.
5. **Given** recognition is on, **When** AEGIS is in use, **Then** a visible indicator shows that
   recognition is on, separately from the camera indicator.
6. **Given** recognition is on, **When** a person turns it off, **Then** it stops at once, all labels
   disappear, and the camera can stay on.

---

### User Story 3 - Correct a Wrong Name (Priority: P2)

Recognition is probabilistic, so it will sometimes be wrong. When AEGIS is unsure it says "Unknown"
rather than guessing. When it does show a wrong name, anyone in view can say so, the name goes away,
and the person being mistaken can re-enrol to improve the match.

**Why this priority**: A wrong name is a harm in itself, and people only trust a system that does
not act on guesses and is easy to correct. It depends on User Story 2.

**Independent Test**: Using recorded input, present a face with a confidence just below the
threshold and confirm "Unknown" appears. Present a wrong name, use "Not me", and confirm the name is
removed and stays removed for that person for the rest of the session.

**Acceptance Scenarios**:

1. **Given** the match confidence is below the threshold, **When** recognition runs, **Then** the
   face is shown as "Unknown", never as a best guess.
2. **Given** a face could match two enrolled people about equally, **When** recognition runs,
   **Then** the face is shown as "Unknown".
3. **Given** a wrong name is showing, **When** a person uses the "Not me" control, **Then** that
   label is removed within 1 second and that name is not shown on that face again this session.
4. **Given** "Not me" has been used, **When** the session ends, **Then** no record of the correction
   remains, and the Face Profile is unchanged.
5. **Given** a person is repeatedly mistaken for someone else, **When** they open that help,
   **Then** AEGIS explains how to re-enrol or delete the profile.

---

### User Story 4 - Withdraw and Delete Face Data (Priority: P2)

Any enrolled person can see who is enrolled and permanently delete a Face Profile, which also
withdraws their consent. Deleting is confirmed, immediate and complete. All Face Profiles can be
deleted at once.

**Why this priority**: Consent means little unless it can be withdrawn, and biometric data must not
outlive a person's agreement. It depends on User Story 1.

**Independent Test**: Enrol two people, delete one, and confirm that person's Face Profile and
Consent Record no longer exist on the device, that they now show as "Unknown", and that the other
person is still recognised.

**Acceptance Scenarios**:

1. **Given** profiles exist, **When** a person opens the list, **Then** they see each display name
   and enrolment date, and no face image.
2. **Given** a person chooses to delete a profile, **When** they have not confirmed, **Then** nothing
   is deleted.
3. **Given** a person confirms deletion, **When** it completes, **Then** the Face Profile and Consent
   Record are gone within 1 second, with no recoverable copy kept by AEGIS, and AEGIS confirms it.
4. **Given** a deleted person is in view, **When** recognition runs, **Then** they show as "Unknown".
5. **Given** several profiles exist, **When** a person confirms "Delete all", **Then** every Face
   Profile and Consent Record is removed.

---

### User Story 5 - Verify Recognition Without Live People (Priority: P3)

A maintainer can measure recognition accuracy from a versioned evaluation set, without anyone
standing in front of a camera, and gets a report that fails when a target is missed.

**Why this priority**: Recognition cannot be trusted or safely changed unless its accuracy can be
measured repeatably. It does not change what people experience, so it follows the other stories.

**Independent Test**: Run verification with no camera connected, and confirm it reports correct
recognitions, misidentifications and unknown-person errors against SC-002 to SC-004.

**Acceptance Scenarios**:

1. **Given** the evaluation set, **When** verification runs with no camera, **Then** it reports each
   accuracy target as pass or fail.
2. **Given** a target is not met, **When** verification runs, **Then** it fails and names the target.
3. **Given** the evaluation set, **When** it is inspected, **Then** everyone in it agreed to take
   part, and their agreement is on record.

---

### Edge Cases

- **Low confidence or ambiguous match**: the face shows as "Unknown". Recognition never acts on a
  guess.
- **Wrong name**: "Not me" removes it, as in User Story 3. Recognition grants no access and changes
  no behaviour beyond showing a name, so a wrong name cannot unlock or expose anything.
- **Photo, screen or lookalike shown to the camera**: AEGIS may show the name. This is accepted
  because recognition is not a security feature (FR-022), and the on-screen guidance says so.
- **Identical twins or close relatives**: they may be confused. If the match is ambiguous, the face
  shows as "Unknown".
- **Changed appearance**, such as glasses, a beard or ageing: the person may show as "Unknown" until
  they re-enrol.
- **Face partly covered, turned away, too far away or in poor light**: shows as "Unknown", or no
  label if the face cannot be found.
- **Camera unavailable or stopped**: all labels and face points disappear, and gestures and the keyboard behave as
  in the foundation. Managing and deleting profiles still works.
- **Stored data cannot be read or is damaged**: AEGIS treats that profile as absent, says so, and
  still lets a person delete it.
- **Limit reached**: at 10 profiles, enrolment explains that one must be deleted first.
- **Browser data cleared by hand**: all Face Profiles and Consent Records are gone, and people must
  enrol again.
- **Recording mode**: Recorded Sessions and fixtures never contain face data or names.
- **Sensor data**: camera images are analysed in memory only. Only Face Profiles and Consent Records
  persist, on this device, until deleted. Nothing leaves the device.
- **Alternative input path**: every enrolment, correction, on/off and deletion action has an
  on-screen control that works by keyboard, without gestures. Recognition is never required to use
  AEGIS.

## Requirements *(mandatory)*

### Functional Requirements

**Enrolment and consent**

- **FR-001**: System MUST enrol a person only after they have seen what is stored, why, for how long
  and how to delete it, and have explicitly agreed.
- **FR-002**: System MUST save a Consent Record with each Face Profile, holding the display name,
  the date and the version of the consent wording agreed to.
- **FR-003**: System MUST enrol only from a live camera capture of the person present, and MUST NOT
  accept uploaded photos or videos.
- **FR-004**: System MUST capture only when exactly one face is in view, and MUST discard everything
  from a cancelled, interrupted or low-quality attempt.
- **FR-005**: System MUST support at least 10 Face Profiles, and MUST explain when that limit is
  reached.

**Recognition**

- **FR-006**: Recognition MUST be off until a person turns it on, and MUST NOT run while no Face
  Profile exists.
- **FR-007**: Users MUST be able to turn recognition on and off at any time, with an on-screen
  control and a keyboard key, independently of the camera.
- **FR-008**: System MUST show a visible indicator whenever recognition is on, separate from the
  camera indicator.
- **FR-009**: System MUST label every face in view with an enrolled display name or "Unknown", and
  MUST keep each label on the right face as faces move.
- **FR-010**: Every recognition result MUST carry a confidence value, and System MUST show a name
  only when confidence meets a documented threshold and clearly favours one Face Profile.

**Face points**

- **FR-027**: Face points MUST be off each time AEGIS opens, and MUST appear only after a person turns
  them on, with an on-screen control and a keyboard key.
- **FR-028**: While on and the camera is on, System MUST show face points on every face in view, as an
  outline of about 100 to 150 points joined by lines around the eyes, brows, nose, lips and face edge,
  aligned with that face in the mirrored camera view. They MUST stay visible when the camera view is
  hidden.
- **FR-029**: Face points MUST work without any Face Profile, MUST NOT identify anyone, and MUST NOT be
  stored, logged or included in Recorded Sessions.
- **FR-030**: While face points and recognition are both off, System MUST NOT analyse faces at all.

**Unknown people and data limits**

- **FR-011**: System MUST NOT store, log or count anything about a person who is not enrolled,
  including any face data, sighting or visit count.
- **FR-012**: System MUST NOT keep any history of who was recognised or when.
- **FR-013**: System MUST NOT store face images. A Face Profile MUST hold only what is needed to
  match a face, and MUST be encrypted on the device. It MUST be treated as biometric data, because
  published attacks can rebuild a likeness from such data, and the consent wording MUST say so.
- **FR-014**: System MUST process faces on this device, and MUST NOT send Face Profiles, Consent
  Records, images or recognition results off the device.
- **FR-015**: System MUST NOT include Face Profiles, display names or face images in logs,
  diagnostics, verification reports or Recorded Sessions.
- **FR-016**: System MUST NOT infer or show emotion, age, gender, ethnicity or any other trait from a
  face.

**Correction**

- **FR-017**: Users MUST be able to reject a shown name with a "Not me" control, after which that
  name MUST NOT appear on that face for the rest of the session.
- **FR-018**: A "Not me" correction MUST NOT change any Face Profile and MUST NOT persist after the
  session.

**Deletion**

- **FR-019**: Users MUST be able to list Face Profiles by display name and enrolment date, showing no
  face image.
- **FR-020**: Users MUST be able to permanently delete one Face Profile or all of them, with explicit
  confirmation, and System MUST remove the Consent Record at the same time.
- **FR-021**: After confirmed deletion, System MUST stop recognising that person immediately, and
  MUST keep no copy, backup or trace of that person.

**Scope limits**

- **FR-022**: Recognition MUST NOT unlock, authorise or restrict anything. Its only effect is the
  name shown. On-screen guidance MUST say that it is not a security feature.
- **FR-023**: Gestures, the keyboard and every foundation feature MUST work the same whether
  recognition is on or off, and whoever is in view.

**Verification**

- **FR-024**: System MUST produce a verification report of recognition accuracy from a versioned
  evaluation set, with no camera or live person needed.
- **FR-025**: Evaluation data MUST come only from people who agreed to take part in it.
- **FR-026**: Every privacy rule in this feature MUST have an automated test.

### Changes to the foundation specification

- **FR-016 of the foundation** forbids recording anything derived from camera images that could
  reproduce a person's image. Face Profiles are a second, narrow exception to it, alongside recordings:
  stored only with that person's explicit agreement, as Principle III allows.
- **SC-008 of the foundation** covers camera images. It stands, because no images are stored.
- **The foundation's assumption of one person at a time** no longer holds for what is on screen,
  because several faces can be labelled. One hand still controls the object.
- **The foundation plan's "Storage: None in the app"** changes: Face Profiles and Consent Records are
  the one stored exception, by explicit opt-in as Principle III allows.

### Key Entities

- **Face Profile**: what AEGIS needs to match one enrolled person's face. It belongs to one person
  and holds no image. It exists only with a Consent Record, and lasts until deleted.
- **Consent Record**: proof that a person agreed. It holds the display name, date and consent wording
  version, and is deleted with its Face Profile.
- **Face Points**: temporary positions marking a face in view, used only for display. They carry no
  identity and are never stored.
- **Recognition Result**: a temporary result for one face in view: a display name or "Unknown", with
  a confidence value. It is never stored.
- **Session Correction**: a "Not me" rejection, held in memory for the session only.
- **Face Evaluation Set**: versioned data from people who agreed, used only to measure accuracy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time person completes enrolment, from opening it to confirmation, in under 60
  seconds using only the on-screen guidance.
- **SC-002**: In the evaluation set, enrolled people are shown with their correct name at least 95%
  of the time when clearly in view.
- **SC-003**: In the evaluation set, an enrolled person is shown with another enrolled person's name
  in fewer than 1% of cases.
- **SC-004**: In the evaluation set, a person who is not enrolled is shown with an enrolled name in
  fewer than 1% of cases.
- **SC-005**: A name appears within 2 seconds of an enrolled person coming clearly into view, in at
  least 95% of cases.
- **SC-006**: With recognition and face points on and three faces in view, the frame rate drops by no more than 2
  frames per second, and gesture response stays within the foundation's targets.
- **SC-007**: Inspection after a session with non-enrolled people in view finds no data about them on
  the device, and none sent from it.
- **SC-008**: After confirmed deletion, inspection finds no data for that person, and they show as
  "Unknown" in 100% of attempts.
- **SC-009**: A wrong name can be removed in under 5 seconds, using a control visible on screen.
- **SC-010**: Accuracy targets SC-002 to SC-004 are also reported per group of people in the
  evaluation set, and any gap of more than 5 percentage points between groups is flagged.

## Assumptions

- Recognition only shows a name. It is deliberately not a login, lock or access control, because
  browser-based recognition without liveness checks can be fooled by a photo. Per-person settings
  or permissions would be a later feature.
- AEGIS is used in a home or personal setting with people who know the camera is on. Use in public
  or shared spaces, or to identify people who have not been told, is out of scope. The person running
  AEGIS is responsible for telling others in view.
- There are no accounts or administrator. Anyone at the device can view the list of names and delete
  a profile, which favours easy withdrawal over protecting a profile from deletion.
- Display names are chosen by the person and need not be real names.
- Enrolment requires adults, or a parent or guardian's agreement for a child. AEGIS cannot check
  this, so the consent wording states it.
- Face data lasts until deleted, with no automatic expiry, and stays in the browser on this device.
  It does not sync between devices or browsers.
- Biometric data carries legal duties in many places. These requirements follow explicit consent,
  data minimisation and easy deletion, but this specification is not legal advice.
- The foundation's frame rate target is still unresolved (its T085), so SC-006 is measured against
  the frame rate with recognition off, not against a fixed number.
- Recognition reuses the foundation's camera, on-screen status and verification reporting.
