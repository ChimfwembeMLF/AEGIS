// Interaction Settings version 1. Tuned against the evaluation dataset.
export const INTERACTION_SETTINGS_VERSION = 1;

export const interactionSettings = {
  moveThreshold: 0.6,
  rotateThreshold: 0.7,
  resetThreshold: 0.8,
  resetHoldMs: 1000,
  maxInputAgeMs: 150,
} as const;

export type InteractionSettings = typeof interactionSettings;
