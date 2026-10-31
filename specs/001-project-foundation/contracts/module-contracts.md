# Module Contracts

**Contract version**: 4

These are the only interfaces between modules. Field details are in
[data-model.md](../data-model.md). Each contract lives in `src/contracts`, and any breaking change
increases the version.

| From          | To            | Contract         | Carries                                |
| ------------- | ------------- | ---------------- | -------------------------------------- |
| Vision        | Motion        | `HandFrameSource`  | Hand Frames                          |
| Motion        | Core          | `GestureStream`    | Gesture Interpretations and hand markers |
| Core          | Spatial       | `SceneCommands`    | Object pose updates and Feedback     |
| Core          | Spatial       | `CameraDisplay`    | Hand markers and camera view state   |
| Vision        | Spatial       | `CameraFeed`       | The live camera element, for display only |
| Core          | Vision        | `CaptureControl`   | Start and stop; capture state returned |
| Spatial       | Core          | `SceneInfo`        | Scene Bounds and bounds changes      |
| Spatial       | Core          | `CaptureCommands`  | The person's request to toggle capture |
| Spatial       | Core          | `CameraViewCommands` | The person's request to hide or show the view |
| Spatial       | Core          | `RecordingCommands` | Recording controls                  |
| Vision        | Core          | `HandFrameSource`  | Hand Frames, for recording only      |

Input travels one way, as in Principle I. `CaptureControl` and `SceneInfo` are control paths: they
carry no gesture or voice input, so they do not change that flow. `CaptureCommands` and
`RecordingCommands` carry on-screen button presses to Core, which decides what happens. The recorder
reads Hand Frames only to store them, and never acts on them, so interpretation still goes through
Motion.

## `HandFrameSource`

Implemented by the live camera source and by the replay source, which must be interchangeable
(FR-018).

```ts
interface HandFrameSource {
  start(): Promise<void>;
  stop(): void;
  onFrame(listener: (frame: HandFrame) => void): Unsubscribe;
}
```

**Guarantees**: timestamps always increase; only the newest available frame is delivered; no image
data is included; `stop()` releases the camera before it returns control.

## `GestureStream`

```ts
interface GestureStream {
  onInterpretation(listener: (i: GestureInterpretation) => void): Unsubscribe;
  onHands(listener: (hands: HandMarkers[]) => void): Unsubscribe;
}
```

**Guarantees**: every interpretation has a confidence; given the same Hand Frames, the output is
identical; a hand leaving view produces an `end`; no clock or randomness is used beyond frame
timestamps.

## `SceneCommands`

```ts
interface SceneCommands {
  setPose(pose: Pose): void;
  showFeedback(feedback: Feedback): void;
}
```

**Guarantees**: Spatial decides nothing about interaction, and only draws what Core sends.

## `CaptureControl`

```ts
interface CaptureControl {
  start(): Promise<void>;
  stop(): void;
  onStateChange(listener: (s: CaptureSession) => void): Unsubscribe;
}
```

**Guarantees**: the state is reported on every change; the `unavailable` state always has a reason;
`active` is reported as soon as a camera stream exists; `start` does nothing if already starting or
active, so there is only ever one stream to stop; `stop` works during `starting`.

## `SceneInfo`

```ts
interface SceneInfo {
  bounds(): SceneBounds;
  onBoundsChange(listener: () => void): Unsubscribe;
}
```

## `CaptureCommands`

```ts
interface CaptureCommands {
  toggle(): void;
}
```

**Guarantees**: stops the camera when it is starting or active, and starts it otherwise.

## `CameraFeed`

```ts
interface CameraFeed {
  readonly element: HTMLVideoElement;
}
```

**Guarantees**: Spatial only displays this element. Nothing copies, records, saves or sends its
frames. It stays in the page when hidden, because Chrome throttles a video that is removed.

## `CameraDisplay`

```ts
interface CameraDisplay {
  showHands(hands: HandMarkers[]): void;
  showCameraView(view: CameraViewState): void;
}
```

**Guarantees**: the view and hand markers appear only while capture is `active`; markers stay
visible when the person hides the view.

## `CameraViewCommands`

```ts
interface CameraViewCommands {
  toggle(): void;
}
```

## `RecordingCommands`

```ts
interface RecordingCommands {
  start(details: RecordingDetails): string | null;
  label(gesture: LabelledGesture | null): void;
  stop(): RecordingResult;
}
```

**Guarantees**: `start` returns the reason it refused, or null; `stop` returns only a valid session.

## Required contract tests (Principle V)

- Live and replay sources both pass one shared `HandFrameSource` test suite. The live run uses
  Chrome's simulated camera.
- Motion gives identical output for repeated runs of the same frames.
- Core blocks actions below their threshold, drops input older than `maxInputAgeMs`, and gives the
  keyboard priority.
- An import-scan test fails if a module imports anything except `src/contracts`.
