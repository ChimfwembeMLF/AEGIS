# User Interface Contract

## Gestures

| Gesture        | Performed by                                | Effect                          |
| -------------- | ------------------------------------------- | ------------------------------- |
| Pinch and drag | Thumb and index finger together, then move  | Moves the object                |
| Pinch and twist | Pinch, then rotate the hand                | Rotates the object              |
| Open palm      | All fingers extended, held for one second   | Resets the object               |

The camera view is mirrored, so moving a hand to the right moves the object to the right.

## Scene layers

From back to front: the mirrored camera view, cropped to fill the scene; hand points and finger
lines, cyan normally and amber while a pinch registers; and the 3D object. With the camera off or
unavailable, the scene is plain navy with no view or points.

## Keyboard

| Key          | Effect                      |
| ------------ | --------------------------- |
| Arrow keys   | Move the object             |
| `Q` / `E`    | Rotate left / right         |
| `R`          | Reset the object            |
| `C`          | Stop or restart the camera  |
| `V`          | Hide or show the camera view |

## Always on screen

- The 3D scene with the object, over the camera view while the camera is on.
- Keyboard controls and gesture hints.
- Camera status, with the capture indicator while the camera is on.
- A stop or restart camera button, labelled Try camera again after a failure, and a hide or show
  camera view button.
- The last recognised gesture, or "Gesture not understood".

## Messages

| Situation            | Message                                                        |
| -------------------- | -------------------------------------------------------------- |
| No camera            | No camera found. If this device has one, quit Chrome fully and reopen it, or use the keyboard. |
| Camera busy          | Your camera is being used by another app. You can use the keyboard. |
| Permission denied    | Camera access is off. Press Try camera again and choose Allow. If nothing appears, use the camera icon in Chrome's address bar, or use the keyboard. |
| Camera starting      | Starting camera. If your browser asks, choose Allow.           |
| A retry fails        | Try N failed, followed by the message for that failure         |
| Camera lost          | Camera disconnected. You can continue with the keyboard.       |
| Tracking failed      | Hand tracking could not start. You can use the keyboard.       |
| Camera stopped       | Camera off. Press C to turn it on.                             |
| Hand seen            | Hand detected. Pinch and move it, or hold an open palm.        |
| No hand              | Raise a hand to begin                                          |
| Poor tracking        | Having trouble seeing your hand. Try better lighting.          |

## First-use testing

Opening the app with `?target=1` shows a marked ring to move the object to, for SC-001.

## Recording (maintainers only)

Opening the app with `?record=1` shows recording controls. Nothing is captured until the maintainer
confirms the person agreed and presses Start. While recording, keys `1` (drag), `2` (twist), `3`
(palm) and `0` (unrelated movement) begin a label, and pressing the same key ends it. Stopping
downloads one session file. The app stores nothing itself.
