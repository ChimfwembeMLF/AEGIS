# Research: Facial Recognition

Checked and measured on 2026-10-31 on the reference device: Intel Iris Pro, 16 GB, macOS 12.7.6,
Chrome 150.

## Decisions

### 1. Two separate face paths

- **Decision**: Face points use MediaPipe Face Landmarker. Recognition uses YuNet to find faces and
  SFace to compare them. The two paths share no model.
- **Rationale**: MediaPipe's Face Landmarker bundle contains BlazeFace, whose model card states that
  "any form of surveillance or identity recognition is explicitly out of scope". The Face Mesh V2 card
  says its landmarks do not provide recognition. Both are Apache 2.0, so this is a stated limit on
  intended use rather than a licence term, and AEGIS respects it. YuNet is also what SFace's published
  pipeline pairs with: it returns the five face points that SFace needs for alignment.
- **Alternatives considered**: Reusing the bundle's face crop for SFace (one fewer model, but uses
  BlazeFace for a purpose its card excludes). `face-api.js` and `human` (MIT code, but the licence of
  their weights could not be confirmed). InsightFace models (not considered further: their pretrained
  weights are widely reported as non-commercial; not checked for this plan).

### 2. Models and licences

| Part           | Model                               | Size    | Licence                        |
| -------------- | ----------------------------------- | ------- | ------------------------------ |
| Face points    | `face_landmarker.task` float16, v1  | 3.8 MB  | Apache 2.0, stated on the card |
| Finding faces  | `face_detection_yunet_2026may.onnx` | 0.23 MB | MIT, in the model's folder     |
| Comparing faces | `face_recognition_sface_2021dec.onnx` | 38.7 MB | Apache 2.0, in the model's folder |

SHA-256:

- `face_landmarker.task`: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- YuNet 2026may: `ebafce4e3c118d6554634be5c27ab333b4c047a9a8c3faf1d7cf93101c22f0f0`
- SFace float: `0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79`

The models are downloaded by `setup:model` and checked, as in the foundation. The float SFace model is
used because the int8 version took 578 ms against 86 ms here, and the small size saving does not matter
for a local app. OpenCV's page reports 0.9940 accuracy for SFace without naming the benchmark.

### 3. Runtime: ONNX Runtime Web on the CPU, in a worker

- **Decision**: `onnxruntime-web` 1.30.0 (MIT), WebAssembly backend, one thread, in a dedicated Web
  Worker. Its runtime is about 14 MB and is served by the app, like MediaPipe's.
- **Rationale**: WebGPU failed on the Iris Pro with a Transpose error. The CPU backend ran both models.
  A worker keeps recognition from blocking rendering, and the CPU avoids further competition for the
  GPU. Version 1.30.0 is used because 1.31.1 is only five days old and Yarn's quarantine would refuse it.
- **Alternatives considered**: Threads (needs cross-origin isolation headers, which adds risk for a
  task that only has to run about once a second).

### 4. Recognition rate

- **Decision**: Recognition runs about once a second, and a name needs two agreeing results.
- **Rationale**: Names change rarely, and SC-005 allows 2 seconds. Between results, labels follow faces
  using the face points or the last detected box.

### 5. Face points rate

- **Decision**: With face points on, every third camera frame runs face tracking *instead of* hand
  tracking, so the two never run in the same frame. With face points off, nothing changes.
- **Rationale**: Running both in a frame took 58–197 ms (p50) and 64–244 ms (p95), against a 33 ms
  frame. This lowers hand tracking to about 20 updates a second while face points are on. Because they
  are off by default, normal gesture use keeps the full rate.
- **Fallback**: If SC-006 fails, lower face points to every fifth frame, then consider a worker.

### 6. Face Profile storage

- **Decision**: IndexedDB in this browser profile, encrypted with AES-GCM using a non-extractable
  WebCrypto key. Each profile holds the average of 5 captures.
- **Rationale**: Principle III allows persistence by explicit opt-in. Published attacks rebuild
  recognisable faces from stored templates, so templates are biometric data and should not sit in the
  clear. Encryption stops the files being read by copying them, but not by someone using this browser
  profile, who can already run the app.
- **Effect on the spec**: The original FR-013 said a profile could not be used to recreate an image.
  That cannot be promised, so FR-013 was corrected.

### 7. Matching

- **Decision**: Core compares by cosine similarity. A name needs a score at or above the threshold,
  and a margin over the next profile. Starting values are 0.363 (OpenCV's published default, recalled
  from its documentation and not confirmed on the model's page) and a margin of 0.05. Both are tuned
  against the Face Evaluation Set.
- **Rationale**: Principle II: Vision reports, Core alone decides.

### 8. Evaluation data

- **Decision**: The Face Evaluation Set holds templates, not images, from people who agreed. It is
  git-ignored and stays on the maintainer's device. Only a manifest of hashes, consent dates and
  self-declared groups is committed. Replay exercises matching, not the models, so changing a model
  means recording the set again.
- **Rationale**: Principle V needs a versioned dataset, and templates are biometric data that should
  not be published. Group labels come from participants, because FR-016 forbids AEGIS inferring them.

## Measured on the reference device

Two complete runs of a throwaway benchmark, in visible Chrome, on one still 640×480 portrait with one
face and no hand. Timings are per frame, p50 / p95, after 40 warm-up frames.

| Measure                       | Quieter run  | Busier run    |
| ----------------------------- | ------------ | ------------- |
| Hand tracking alone           | 41 / 57 ms   | 98 / 139 ms   |
| Face points alone             | 22 / 37 ms   | 98 / 148 ms   |
| Hand then face, same frame    | 58 / 64 ms   | 197 / 244 ms  |
| Hand, face on every third     | not measured | 109 / 204 ms  |
| Alternating hand and face     | not measured | 97 / 140 ms   |
| SFace, one face               | 81 / 128 ms  | 86 / 93 ms    |
| YuNet 2023mar, 640×640        | not captured | 347 / 646 ms  |

**Limits of these numbers**: The machine was in use, with a load average near 5 and other Chrome
windows open, which likely explains the gap between runs. Hand figures are a worst case, because with
no hand in view the detector runs every frame. YuNet 2026may at 320×240, which the plan uses, was
**not measured**: Chrome closed during that run. It closed in 2 of 5 runs, and one more run reloaded,
for reasons not established, so a task must confirm stability. No run tested accuracy.

## Risks found

- **Training data**: The SFace paper says it was trained on CASIA-WebFace, VGGFace2 and MS-Celeb-1M,
  and OpenCV does not say which was used for this file. Such datasets were collected without asking
  the people in them. This does not change the model's Apache 2.0 licence, but it needs a legal check
  before any commercial release.
- **Fairness**: Face recognition accuracy can differ between groups of people. SC-010 reports it, but a
  handful of volunteers can only give a rough signal.

## Sources

- [SFace README](https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/README.md)
  and [licence](https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/LICENSE)
- [YuNet README](https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/README.md)
- [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker),
  [Face Mesh V2 card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)
  and [BlazeFace card](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf)
- [SFace paper](https://arxiv.org/abs/2205.12010)
- Template inversion: [Shahreza and Marcel, ICCV 2023](https://openaccess.thecvf.com/content/ICCV2023/html/Shahreza_Template_Inversion_Attack_against_Face_Recognition_Systems_using_3D_Face_ICCV_2023_paper.html),
  [Face Reconstruction from Face Embeddings](https://arxiv.org/html/2411.03960v1)
