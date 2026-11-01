# Module Contracts

**Contract version**: 5. These additions extend the
[foundation contracts](../../001-project-foundation/contracts/module-contracts.md), which stay in force.

| From    | To      | Contract           | Carries                                      |
| ------- | ------- | ------------------ | -------------------------------------------- |
| Vision  | Core    | `FaceStream`       | Face Observations and Face Markers           |
| Core    | Vision  | `FaceAnalysis`     | Which analyses to run                        |
| Core    | Spatial | `FaceDisplay`      | Face Markers, labels, and face states        |
| Spatial | Core    | `FaceCommands`     | The person's requests                        |

## `FaceStream`

```ts
interface FaceStream {
  onObservations(listener: (faces: FaceObservation[]) => void): Unsubscribe;
  onMarkers(listener: (faces: FaceMarkers[]) => void): Unsubscribe;
}
```

**Guarantees**: nothing is emitted for an analysis that is off; every observation has a confidence;
`faceId` follows a face while it stays in view; no image data is included.

## `FaceAnalysis`

```ts
interface FaceAnalysis {
  setPoints(on: boolean): void;
  setRecognition(on: boolean): void;
}
```

**Guarantees**: with both off, no face model runs and no frame leaves the main thread; models load only
when first needed; a failure is reported and leaves gestures untouched.

## `FaceDisplay`

```ts
interface FaceDisplay {
  showMarkers(faces: FaceMarkers[]): void;
  showLabels(labels: FaceLabel[]): void;
  showFaceState(state: FaceState): void;
}
```

**Guarantees**: Spatial only draws what Core sends. Labels and markers clear when the camera stops.

## `FaceCommands`

```ts
interface FaceCommands {
  togglePoints(): void;
  toggleRecognition(): void;
  startEnrolment(details: EnrolmentDetails): string | null;
  cancelEnrolment(): void;
  rejectLabel(faceId: string): void;
  listProfiles(): Promise<ProfileSummary[]>;
  deleteProfile(profileId: string, confirmed: boolean): Promise<void>;
  deleteAllProfiles(confirmed: boolean): Promise<void>;
}
```

**Guarantees**: `startEnrolment` returns the reason it refused, or null, and refuses without agreement;
delete does nothing unless `confirmed` is true; `ProfileSummary` holds a name and date, and no template.

## Change to `CameraFeed`

The foundation says nothing copies frames. Recognition needs one exception: Vision may hand a single
in-memory frame to its own worker, about once a second, which closes it after use. Nothing leaves
Vision except templates.

## Required contract tests (Principle V)

- Core shows no name below the threshold, without the margin, or without two agreeing results.
- No face model loads and no worker starts with both analyses off.
- Deletion removes the Face Profile and Consent Record together, and needs confirmation.
- Stored bytes contain no readable template or name.
- `FaceDisplay` receives nothing for a face after a "Not me" for that profile.
- The import-scan test covers the new files.
- The foundation privacy test stays unchanged, proving that nothing is stored without enrolment.
