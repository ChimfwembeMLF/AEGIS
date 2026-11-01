# Data Model: Facial Recognition

Only Face Profile and Consent Record persist. Everything else lives in memory.

## Stored

### Face Profile

| Field         | Type        | Rules                                                 |
| ------------- | ----------- | ----------------------------------------------------- |
| `profileId`   | string      | Random, and unrelated to the person                   |
| `template`    | encrypted   | Average of 5 captures, 128 numbers, unit length       |
| `modelSha256` | string      | Must match the current SFace model, or the profile must be re-enrolled |

A profile exists only with its Consent Record. At most 10 exist. No image is ever held.

### Consent Record

| Field            | Type       | Rules                                      |
| ---------------- | ---------- | ------------------------------------------ |
| `profileId`      | string     | Same as the Face Profile                   |
| `displayName`    | encrypted  | 1 to 32 characters, and not a real name unless the person wants |
| `enrolledOn`     | date       | Date only                                  |
| `consentVersion` | string     | Version of the wording that was agreed to  |

Both are written in one transaction and deleted in one transaction. Damaged records can still be
deleted. Deleting the last profile also deletes the database and its encryption key.

## In memory only

### Face Observation (Vision to Core)

`faceId`, `box`, `template`, `confidence` (detection quality), `timestampMs`. Dropped once matched.

### Face Markers (Vision to Core to Spatial)

`faceId`, `outline` (about 100 to 150 points chosen from the 478 landmarks). Display only.

### Recognition Result

`faceId`, `profileId` or null, `displayName` or `Unknown`, `score`. Replaced on each update.

### Session Correction

`faceId`, the rejected `profileId`, and the face's latest template, so the rejection can still apply
when that face returns to view. Cleared when the page closes, or when that profile is deleted. It is
never written anywhere.

## States

**Enrolment**: `idle` → `consenting` → `capturing` → `saved`. Any of `cancelled`, `camera-stopped`,
`low-quality` or `several-faces` discards all captures and returns to `idle`, except `several-faces`,
which pauses `capturing`.

**Recognition**: `off` → `on` → `off`. It turns off at each page load, when the last profile is deleted,
and shows no labels while the camera is off.

**Face points**: `off` → `on` → `off`. Always `off` at page load.

## Evaluation data

**Face Evaluation Set**: one git-ignored template file per participant, and a committed manifest
matching [the schema](contracts/face-evaluation-manifest.schema.json). See research decision 8.
