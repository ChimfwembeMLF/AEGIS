# Quickstart: Validate Facial Recognition

This guide proves the feature works once it is built. See [contracts/](contracts/).

## Setup

```sh
yarn install
yarn setup:model       # also downloads and checks the three face models
yarn dev
```

## Automated checks (no camera or person needed)

| Command       | Proves                                                     | Expected       |
| ------------- | ---------------------------------------------------------- | -------------- |
| `yarn test`   | Matching rules, consent rules, storage and deletion        | All tests pass |
| `yarn e2e`    | Controls, privacy, nothing stored without enrolment        | All tests pass |
| `yarn verify` | SC-002 to SC-006 and SC-010                                | `result: pass` |

`yarn verify` reports `incomplete`, never `pass`, if the evaluation set is missing.

## Live scenarios

### 1. Face points

1. Press `F`. **Expected**: a silver outline follows your face, and your hand points keep working.
2. Press `V`. **Expected**: the outline stays while the camera view hides.
3. Press `F` again. **Expected**: the outline disappears. Reload, and it stays off.

### 2. Enrol

1. Press **Enrol someone**, and try to start without agreeing. **Expected**: it refuses.
2. Agree and complete the capture. **Expected**: confirmation in under 60 seconds.
3. Try again with two people in view. **Expected**: it pauses and asks for one person.

### 3. Recognise

1. Press `I`. **Expected**: the **Recognition on** indicator appears, and your name within 2 seconds.
2. Enrol a second person who agrees. **Expected**: each sees their own name, including together.
3. Ask someone not enrolled to step in, with their knowledge. **Expected**: "Unknown".

### 4. Correct

With a name showing, press **Not me**. **Expected**: the name goes within 1 second and does not return
to that face this session. Reload. **Expected**: nothing about the correction remains.

### 5. Delete

Delete a person and confirm. **Expected**: that person shows as "Unknown", and everyone else is still
recognised. After **Delete everyone**, the database no longer exists in Chrome's DevTools.

## Privacy inspection

After a session with someone not enrolled in view, check Chrome's DevTools Application tab and Network
tab. **Expected**: no data about them, and no requests to other hosts (SC-007).

## Building the evaluation set

Everyone must agree first. Record the participants in `fixtures/faces/v1/`, in normal and poor lighting,
including people acting as "unknown". Template files stay off the repository, and only the manifest is
committed.
