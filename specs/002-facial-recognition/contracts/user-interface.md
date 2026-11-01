# User Interface Contract

These additions extend the
[foundation interface](../../001-project-foundation/contracts/user-interface.md).

## Scene layers

Face outlines and labels share the hand points layer, behind the 3D object. Outlines are silver, so
they are not confused with hand points.

## Keyboard

| Key | Effect                                                |
| --- | ----------------------------------------------------- |
| `F` | Show or hide face points                              |
| `I` | Turn recognition on or off                            |
| `N` | "Not me" for the most recent or only named face        |

All controls are also reachable with Tab and Enter, so a person never needs a gesture. These keys are
ignored while typing a display name.

## Faces panel

Always on screen with the camera controls:

- **Show face points** / **Hide face points**
- **Turn recognition on** / **Turn recognition off**, disabled until someone is enrolled
- **Recognition on** indicator, while on
- **Enrol someone**
- **People**: each display name and enrolment date, with **Delete**
- **Delete everyone**
- A **Not me** control beside every named face

## Consent wording (version 1)

> AEGIS will save a mathematical description of your face on this device, in this browser, so it can
> show your name when it sees you. It saves no photos and nothing leaves this device. This description
> is biometric data, and research has shown a likeness can sometimes be rebuilt from it, so it is
> stored encrypted. It stays until you delete it, which anyone at this device can do at any time. This
> is not a security feature. If you are under 18, a parent or guardian must agree too.

The person ticks **I am the person being enrolled, and I agree** before capture can start.

## Messages

| Situation            | Message                                                         |
| -------------------- | --------------------------------------------------------------- |
| Several faces        | Only one person should be in view to enrol.                     |
| Low quality          | Could not get a clear view. Try better lighting and face the camera. Nothing was saved. |
| Cancelled            | Enrolment cancelled. Nothing was saved.                         |
| Enrolled             | Enrolled. Turn recognition on to see your name.                 |
| Possibly enrolled    | You may already be enrolled. Replace that profile only if it is yours. |
| Limit reached        | 10 people are enrolled. Delete someone first.                   |
| Delete confirm       | Delete this person's face data? This cannot be undone.          |
| Deleted              | Face data deleted.                                              |
| Not me               | Name removed. If this keeps happening, delete and re-enrol.     |
| Face models failed   | Face features could not start. Gestures still work.             |
| Profile unreadable   | One profile could not be read. You can delete it.               |
| Outdated profile     | This profile needs enrolling again.                             |
| Security reminder    | Recognition only shows names. It is not a security feature.     |
