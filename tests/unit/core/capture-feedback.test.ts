import { describe, expect, it } from 'vitest';
import { CaptureFeedback } from '../../../src/core/capture-feedback';

const REFUSED = { state: 'unavailable', reason: 'permission-denied' } as const;

describe('CaptureFeedback', () => {
  it('tells the person to answer the browser prompt while starting', () => {
    const { message } = new CaptureFeedback().describe({ state: 'starting' });
    expect(message).toBe('Starting camera. If your browser asks, choose Allow.');
  });

  it('explains what to do when camera access is off', () => {
    const { message } = new CaptureFeedback().describe(REFUSED);
    expect(message).toContain('Press Try camera again and choose Allow.');
    expect(message).toContain('use the keyboard');
  });

  it('shows a different message after each failed try, so a click is never silent', () => {
    const feedback = new CaptureFeedback();
    const messages = [REFUSED, REFUSED, REFUSED].map((session) => {
      feedback.describe({ state: 'starting' });
      return feedback.describe(session).message;
    });

    expect(new Set(messages).size).toBe(3);
    expect(messages[1]).toMatch(/^Try 2 failed\. /);
    expect(messages[2]).toMatch(/^Try 3 failed\. /);
  });

  it('counts tries again once the camera has worked', () => {
    const feedback = new CaptureFeedback();
    feedback.describe(REFUSED);
    feedback.describe({ state: 'active' });
    expect(feedback.describe(REFUSED).message).not.toContain('Try 2');
  });

  it('counts tries again after the person stops the camera', () => {
    const feedback = new CaptureFeedback();
    feedback.describe(REFUSED);
    feedback.describe({ state: 'stopped' });
    expect(feedback.describe(REFUSED).message).not.toContain('Try 2');
  });

  it('reports the capture state for the on-screen controls', () => {
    expect(new CaptureFeedback().describe(REFUSED)).toMatchObject({
      kind: 'capture-state',
      captureState: 'unavailable',
    });
  });
});
