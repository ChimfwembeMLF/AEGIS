import { describe, expect, it } from 'vitest';
import { trackingQuality } from '../../../src/vision/tracking-quality';

describe('trackingQuality', () => {
  it('spreads certainty across the whole range, because the tracker never reports below 0.5', () => {
    expect(trackingQuality(0.5)).toBe(0);
    expect(trackingQuality(1)).toBe(1);
  });

  it('treats a blurred hand as poor and a clear hand as good, using measured values', () => {
    expect(trackingQuality(0.529)).toBeLessThan(0.5);
    expect(trackingQuality(0.92)).toBeGreaterThan(0.8);
  });

  it('stays between 0 and 1 for unexpected input', () => {
    expect(trackingQuality(0)).toBe(0);
    expect(trackingQuality(1.2)).toBe(1);
  });
});
