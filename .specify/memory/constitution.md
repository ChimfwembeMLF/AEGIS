<!--
Sync Impact Report
==================
Version change: template (unversioned) → 1.0.0 (initial adoption)

Modified principles: none (all placeholders filled for the first time)

Added principles:
  - I. Modular Platform & Canonical Naming
  - II. Reliable Natural Interaction
  - III. Private-by-Default Perception
  - IV. Measured Real-Time Performance
  - V. Verifiable Behaviour
  - VI. Vertical Slices Before Breadth

Added sections:
  - Platform Constraints
  - Development Workflow
  - Governance

Removed sections: none

Templates and guidance:
  ✅ updated   .specify/templates/tasks-template.md (test tasks follow Principle V)
  ✅ updated   .specify/templates/spec-template.md (edge-case prompts for Principles II, III)
  ✅ updated   .claude/skills/speckit-tasks/SKILL.md (test tasks follow Principle V)
  ✅ no change .specify/templates/plan-template.md (gates are derived from this file)
  ✅ no change README.md (no references to principles)

Deferred items: none. Technology stack and hardware targets are decided per feature
plan under Platform Constraints, so no TODO markers remain.
-->

# AEGIS Constitution

AEGIS (Adaptive Environment for Gesture Interaction & Spatial Intelligence) is an AI-powered
spatial computing platform for interacting with digital information through gestures, voice
and spatial interfaces.

## Core Principles

### I. Modular Platform & Canonical Naming

- AEGIS is organised into these modules, and these names MUST be used in code, documentation
  and specifications:

  | Module             | Responsibility                                   |
  | ------------------ | ------------------------------------------------ |
  | AEGIS Vision       | Perceive the environment; detect and track       |
  | AEGIS Motion       | Interpret gestures and movements                 |
  | AEGIS Voice        | Recognise speech                                 |
  | AEGIS Intelligence | Understand commands and context; reason          |
  | AEGIS Core         | Run the platform; host the interaction engine    |
  | AEGIS Spatial      | Render and manipulate 3D environments            |
  | AEGIS SDK          | Expose the platform to developers                |

- Input flows one way: Vision → Motion → Core, Voice → Core, Core → Spatial. Intelligence
  exchanges requests with Core. The SDK depends on Core and nothing depends on the SDK.
- Modules MUST interact only through documented, versioned contracts and MUST NOT reach into
  another module's internals.
- AEGIS names the platform, never an assistant. Any conversational AI MUST have its own
  separate identity and MUST NOT present itself as "AEGIS".

**Rationale**: Clear boundaries let perception, interaction and rendering evolve independently,
and keeping the platform name distinct leaves room for an ecosystem around it.

### II. Reliable Natural Interaction

- Vision, Motion, Voice and Intelligence MUST report what they interpret with a confidence
  value. AEGIS Core alone decides whether an interpretation becomes an action.
- Interpretations below the action's documented confidence threshold MUST NOT trigger it.
- Destructive or irreversible actions MUST require explicit confirmation, whatever the input
  mode.
- Every accepted, rejected or ambiguous input the user intended MUST produce perceivable
  feedback.
- Every user-facing action MUST have at least one alternative input path, so that losing a
  camera, a microphone or the user's ability to perform a gesture never blocks it.

**Rationale**: Gesture and speech recognition are probabilistic. Users only trust a natural
interface that does not act on guesses and always shows what it understood.

### III. Private-by-Default Perception

- Camera, microphone and depth data MUST be processed in memory by default. It MUST NOT be
  persisted or sent off the device without explicit opt-in for that data type.
- Any feature that sends sensor-derived data off the device MUST state in its specification
  what is sent, where, and why.
- Active capture MUST be visible to the user, and the user MUST be able to stop it at once.
- Logs and telemetry MUST NOT contain raw frames, raw audio or speech transcripts.
- Recorded test fixtures MUST come only from people who agreed to be recorded.

**Rationale**: AEGIS watches and listens to people and their surroundings. Living up to the
protective meaning of its name means this data is never collected by accident.

### IV. Measured Real-Time Performance

- Every feature on the live interaction path MUST state in its plan a p95 end-to-end latency
  budget, from sensor input to user feedback, and a minimum frame rate, both on named reference
  hardware.
- Each budget MUST be checked by a repeatable benchmark. A change that breaks a budget MUST NOT
  merge unless the budget is formally revised in the plan with a reason.
- Under load, the system MUST drop stale input rather than queue it, and it MUST never act on
  input that is out of date.

**Rationale**: Interaction that lags feels broken. Budgets are set per feature because the
right numbers depend on hardware that has not been chosen yet.

### V. Verifiable Behaviour

- Tests MUST be written before the implementation they cover for: every contract between
  modules, all confidence-threshold and confirmation logic, and every rule in Principle III.
- Automated tests MUST NOT need live hardware. Perception and speech behaviour MUST be tested
  against recorded fixtures or simulated input.
- Any change to a recognition model or its thresholds MUST be evaluated against a versioned
  dataset, with results recorded. A drop below the feature's documented accuracy target MUST
  NOT merge.
- Tests outside this scope are added where they earn their cost.

**Rationale**: Live camera and microphone input cannot be reproduced, so without recorded inputs
regressions in recognition would go unnoticed.

### VI. Vertical Slices Before Breadth

- Every specification MUST deliver a working path from real user input to an observable outcome.
- A module, abstraction or dependency MUST NOT be added until a current specification needs it.
  The module list in Principle I is a map, not a build order.
- SDK interfaces MUST NOT be published until the capability behind them has been used internally
  by at least one feature.

**Rationale**: The vision spans many hard domains. Working slices prove the architecture early,
whereas building each layer in isolation risks modules that never fit together.

## Platform Constraints

- Languages, frameworks, models and hardware targets are chosen in each feature's plan, with the
  reasoning recorded in its `research.md`. Later plans MUST reuse an earlier choice unless they
  justify the change in Complexity Tracking.
- Secrets and credentials MUST NOT be committed to the repository.
- Third-party models, datasets and libraries MUST have licences that allow the intended use, and
  MUST be recorded in the plan that introduces them.
- User-facing surfaces SHOULD follow the brand direction: midnight navy, electric cyan, silver
  and modern geometric sans-serif type.

## Development Workflow

- Features move through specify → plan → tasks → implement. `/speckit-clarify` and
  `/speckit-analyze` are used when a specification is ambiguous or artifacts may have drifted.
- Each plan MUST pass the Constitution Check before research and again after design. Violations
  MUST be justified in Complexity Tracking or the plan changed.
- A feature is complete only when its acceptance scenarios pass, the tests required by Principle
  V pass, and any budget under Principle IV is met.
- Each change MUST be reviewed against this constitution before it merges. Self-review is
  acceptable for a single maintainer.

## Governance

This constitution supersedes all other project practices. When a template, skill or guidance
document conflicts with it, this constitution wins and the conflicting file MUST be corrected.

Amendments MUST be made in a change to this file that states the reason, updates the Sync Impact
Report and updates any affected templates. Work already in progress MUST be brought into line or
receive a documented exception.

Versions follow semantic versioning:

- **MAJOR**: A principle or governance rule is removed or redefined incompatibly.
- **MINOR**: A principle or section is added or guidance is materially expanded.
- **PATCH**: Clarifications and wording changes that do not alter meaning.

Compliance is checked at each Constitution Check, in `/speckit-analyze`, and in review.

**Version**: 1.0.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-10-30
