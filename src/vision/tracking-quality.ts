/**
 * The tracker exposes no quality score for a hand. Its handedness certainty is the nearest signal,
 * and it falls as a hand gets harder to read, but as the top of two classes it never goes below
 * 0.5. This spreads that 0.5 to 1 range over 0 to 1, so that low values can actually occur.
 */
export function trackingQuality(handednessCertainty: number): number {
  return Math.min(1, Math.max(0, (handednessCertainty - 0.5) * 2));
}
