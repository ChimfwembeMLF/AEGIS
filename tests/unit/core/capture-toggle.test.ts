import { describe, expect, it } from 'vitest';
import type { CaptureControl, CaptureSession, CaptureState } from '../../../src/contracts';
import { CaptureToggle } from '../../../src/core/capture-toggle';

function setup() {
  let listener: (session: CaptureSession) => void = () => {};
  const calls: string[] = [];
  const control: CaptureControl = {
    start: async () => {
      calls.push('start');
    },
    stop: () => calls.push('stop'),
    onStateChange: (next) => {
      listener = next;
      return () => {};
    },
  };
  return { calls, toggle: new CaptureToggle(control), report: (state: CaptureState) => listener({ state }) };
}

describe('CaptureToggle', () => {
  it.each([
    ['active', 'stop'],
    ['starting', 'stop'],
    ['stopped', 'start'],
    ['unavailable', 'start'],
  ] as const)('when %s, it will %s', (state, expected) => {
    const { calls, toggle, report } = setup();
    report(state);
    toggle.toggle();
    expect(calls).toEqual([expected]);
  });

  it('starts when nothing has been reported yet', () => {
    const { calls, toggle } = setup();
    toggle.toggle();
    expect(calls).toEqual(['start']);
  });
});
