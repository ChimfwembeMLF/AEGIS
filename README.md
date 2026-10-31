**AEGIS is a very strong choice.** I'd actually put it ahead of VECTRA.

It has a technical, futuristic identity without sounding like a fictional chatbot.

## AEGIS

**A**daptive  
**E**nvironment for  
**G**esture  
**I**nteraction &  
**S**patial Intelligence

### Full project identity

**AEGIS — Adaptive Environment for Gesture Interaction & Spatial Intelligence**

**Category:** AI-Powered Spatial Computing Platform.

**Vision:** To create an intelligent computing environment that allows humans to interact naturally with digital information through gestures, voice and spatial interfaces.

### 1. What AEGIS represents

| Pillar            | Responsibility                        |
| ----------------- | ------------------------------------- |
| Perception        | Understand the physical environment   |
| Vision            | Detect and track objects and hands    |
| Interaction       | Interpret gestures and movements      |
| Intelligence      | Understand commands and context       |
| Spatial Computing | Render and manipulate 3D environments |

### 2. AEGIS architecture

I'd organise the platform into these modules:

```text
                 AEGIS
        SPATIAL INTELLIGENCE PLATFORM
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
    AEGIS.VISION  AEGIS.VOICE  AEGIS.AI
       |             |             |
       v             v             v
    Perception    Speech       Intelligence
    Tracking      Recognition  Reasoning
       |             |             |
       +-------------+-------------+
                     |
                     v
              AEGIS.CORE
                     |
              Interaction Engine
                     |
                     v
             AEGIS.SPATIAL
                     |
               3D Environment
```

### 3. Branding direction

I'd explore:

- **Primary colour:** Midnight navy.
- **Secondary colour:** Electric cyan.
- **Accent:** Silver.
- **Typography:** Modern geometric sans-serif.
- **Logo:** An abstract geometric shield incorporating a spatial or optical element.

The shield concept works particularly well because AEGIS historically refers to protection and defence.

### 4. Official project description

**AEGIS is an AI-powered spatial computing platform designed to redefine human-computer interaction through computer vision, gesture recognition, voice intelligence and interactive 3D environments.**

Its goal is to create an environment where digital information can be perceived, manipulated and controlled through natural human interactions.

### 5. My recommendation

Establish these naming conventions from the beginning:

| Component           | Name               |
| ------------------- | ------------------ |
| Platform            | AEGIS              |
| Computer Vision     | AEGIS Vision       |
| Gesture Engine      | AEGIS Motion       |
| Voice Engine        | AEGIS Voice        |
| AI Intelligence     | AEGIS Intelligence |
| Spatial Renderer    | AEGIS Spatial      |
| Core Runtime        | AEGIS Core         |
| Developer Interface | AEGIS SDK          |

**One thing I'd preserve:** AEGIS should be the platform, not the assistant's name. The conversational AI can have its own identity later.

That gives you room to build an entire ecosystem around AEGIS.

---

## Getting started

AEGIS runs locally in Chrome. Your camera view and hand points appear behind the 3D object, on your
screen only. Nothing from your camera is saved or leaves your device.

**You need:** Node 20.19 or later, Yarn 4, Chrome with hardware acceleration on, and a webcam for
gestures.
Tested with Chrome 150 on an Intel MacBook Pro running macOS 12.7.

```sh
yarn install
yarn setup:model       # downloads the hand-tracking model once
yarn dev               # then open the localhost address it prints
```

Allow camera access when Chrome asks. If you skip the camera, the keyboard controls everything.

| Gesture         | Effect                   | Key        |
| --------------- | ------------------------ | ---------- |
| Pinch and drag  | Move the object          | Arrow keys |
| Pinch and twist | Rotate the object        | `Q` / `E`  |
| Open palm (1s)  | Reset the object         | `R`        |
|                 | Stop or restart camera   | `C`        |
|                 | Hide or show camera view | `V`        |

## Checking that it works

| Command          | What it checks                                                | Camera needed |
| ---------------- | ------------------------------------------------------------- | ------------- |
| `yarn test`      | Contracts, gesture rules and Core decisions                   | No            |
| `yarn e2e`       | App behaviour, camera failures and privacy, in Chrome         | No            |
| `yarn verify`    | Accuracy and responsiveness against targets, with a report    | No            |

`yarn verify` opens a visible Chrome window, because a headless browser has no real GPU. It
reports `incomplete` until the evaluation dataset and benchmark photo exist. To create them, see
[quickstart.md](specs/001-project-foundation/quickstart.md).

## Project layout

| Folder         | Module        | Responsibility                                  |
| -------------- | ------------- | ----------------------------------------------- |
| `src/vision`   | AEGIS Vision  | Camera, hand tracking, live and replayed input  |
| `src/motion`   | AEGIS Motion  | Gesture rules and confidence                    |
| `src/core`     | AEGIS Core    | Decisions, keyboard, capture state, recording   |
| `src/spatial`  | AEGIS Spatial | 3D scene and on-screen status                   |

Modules talk only through `src/contracts`. Project rules are in
[the constitution](.specify/memory/constitution.md).
