import { describe, expect, it } from 'vitest';
import type { GestureInterpretation, HandFrameSource } from '../../../src/contracts';
import { interactionSettings } from '../../../src/contracts/interaction-settings';
import { GestureInterpreter } from '../../../src/motion/gesture-interpreter';
import { isOpenPalm, pinchRatio } from '../../../src/motion/gesture-rules';
import { frame, makeHand, type HandOptions } from '../../helpers/hand-frames';

const noSource: HandFrameSource = {
  start: async () => {},
  stop: () => {},
  onFrame: () => () => {},
};

function interpret(frames: Array<ReturnType<typeof frame>>) {
  const interpreter = new GestureInterpreter(noSource);
  const out: GestureInterpretation[] = [];
  interpreter.onInterpretation((interpretation) => out.push(interpretation));
  frames.forEach((item) => interpreter.process(item));
  return out.filter((item) => item.gesture !== 'hand-present');
}

function presence(frames: Array<ReturnType<typeof frame>>) {
  const interpreter = new GestureInterpreter(noSource);
  const out: GestureInterpretation[] = [];
  interpreter.onInterpretation((item) => out.push(item));
  frames.forEach((item) => interpreter.process(item));
  return out.filter((item) => item.gesture === 'hand-present').map((item) => item.phase);
}

const sequence = (steps: HandOptions[], stepMs = 33) =>
  steps.map((options, index) => frame(1000 + index * stepMs, makeHand(options)));

const named = (out: GestureInterpretation[], gesture: string) =>
  out.filter((item) => item.gesture === gesture);

describe('hand measurements', () => {
  it('reports a small pinch ratio for a pinch and a large one for a relaxed hand', () => {
    expect(pinchRatio(makeHand({ shape: 'pinch' }))).toBeLessThan(0.2);
    expect(pinchRatio(makeHand({ shape: 'relaxed' }))).toBeGreaterThan(0.7);
  });

  it('keeps the same pinch ratio however the hand is rolled', () => {
    const upright = pinchRatio(makeHand({ shape: 'relaxed' }));
    expect(pinchRatio(makeHand({ shape: 'relaxed', roll: 1 }))).toBeCloseTo(upright, 5);
  });

  it('tells an open palm from a relaxed hand', () => {
    expect(isOpenPalm(makeHand({ shape: 'open' }))).toBe(true);
    expect(isOpenPalm(makeHand({ shape: 'relaxed' }))).toBe(false);
    expect(isOpenPalm(makeHand({ shape: 'pinch' }))).toBe(false);
  });
});

describe('pinch and drag', () => {
  const drag = sequence([
    { shape: 'relaxed', wrist: { x: 0.3, y: 0.3 } },
    { shape: 'pinch', wrist: { x: 0.3, y: 0.3 } },
    { shape: 'pinch', wrist: { x: 0.35, y: 0.3 } },
    { shape: 'pinch', wrist: { x: 0.4, y: 0.35 } },
    { shape: 'relaxed', wrist: { x: 0.4, y: 0.35 } },
  ]);

  it('starts, updates and ends', () => {
    const phases = named(interpret(drag), 'pinch-drag').map((item) => item.phase);
    expect(phases).toEqual(['start', 'update', 'end']);
  });

  it('moves right and up as the person sees it', () => {
    const [start, update] = named(interpret(drag), 'pinch-drag');
    expect(start?.delta).toMatchObject({ dx: expect.closeTo(0.05), dy: expect.closeTo(0) });
    expect(update?.delta).toMatchObject({ dx: expect.closeTo(0.05), dy: expect.closeTo(0.05) });
  });

  it('does not act on a pinch that has not moved', () => {
    const still = sequence([{ shape: 'pinch' }, { shape: 'pinch' }, { shape: 'pinch' }]);
    expect(interpret(still)).toEqual([]);
  });
});

describe('pinch and twist', () => {
  const twist = sequence([
    { shape: 'pinch', roll: 0 },
    { shape: 'pinch', roll: 0.1 },
    { shape: 'pinch', roll: 0.3 },
    { shape: 'pinch', roll: 0.5 },
    { shape: 'relaxed', roll: 0.5 },
  ]);

  it('is told apart from a drag', () => {
    const out = interpret(twist);
    expect(named(out, 'pinch-drag')).toEqual([]);
    expect(named(out, 'pinch-twist').map((item) => item.phase)).toEqual(['start', 'update', 'end']);
  });

  it('rotates anticlockwise as the person sees it', () => {
    const [start, update] = named(interpret(twist), 'pinch-twist');
    expect(start?.delta).toMatchObject({ dAngle: expect.closeTo(0.3, 5) });
    expect(update?.delta).toMatchObject({ dAngle: expect.closeTo(0.2, 5) });
  });

  it('stays a twist once decided, even if the wrist then shifts', () => {
    const out = interpret(
      sequence([
        { shape: 'pinch', roll: 0 },
        { shape: 'pinch', roll: 0.3 },
        { shape: 'pinch', roll: 0.3, wrist: { x: 0.6, y: 0.3 } },
      ]),
    );
    expect(named(out, 'pinch-drag')).toEqual([]);
  });
});

describe('open palm', () => {
  const held = (durationMs: number, stepMs = 100) =>
    Array.from({ length: Math.floor(durationMs / stepMs) + 1 }, (_, index) =>
      frame(1000 + index * stepMs, makeHand({ shape: 'open' })),
    );

  it('fires only after the hold time', () => {
    expect(named(interpret(held(interactionSettings.resetHoldMs - 100)), 'open-palm')).toEqual([]);
    const out = named(interpret(held(interactionSettings.resetHoldMs + 500)), 'open-palm');
    expect(out.map((item) => item.phase)).toEqual(['start']);
  });

  it('ends when the palm closes', () => {
    const closing = [...held(1100), frame(3000, makeHand({ shape: 'relaxed' }))];
    expect(named(interpret(closing), 'open-palm').map((item) => item.phase)).toEqual(['start', 'end']);
  });

  it('does not fire for a hand waving past', () => {
    const waving = Array.from({ length: 16 }, (_, index) =>
      frame(1000 + index * 100, makeHand({ shape: 'open', wrist: { x: 0.2 + index * 0.04, y: 0.3 } })),
    );
    expect(named(interpret(waving), 'open-palm')).toEqual([]);
  });
});

describe('hand presence', () => {
  it('reports a hand appearing and leaving, once each', () => {
    const hand = () => makeHand({ shape: 'relaxed' });
    expect(presence([frame(1000), frame(1033, hand()), frame(1066, hand()), frame(1100)])).toEqual(['start', 'end']);
  });

  it('stays quiet with no hand', () => {
    expect(presence([frame(1000), frame(1033)])).toEqual([]);
  });

  it('counts a second hand as the same presence', () => {
    const hand = (handId: string) => makeHand({ shape: 'relaxed', handId });
    expect(presence([frame(1000, hand('a')), frame(1033, hand('a'), hand('b')), frame(1066, hand('b'))])).toEqual(['start']);
  });
});

describe('unclear input', () => {
  it('reports a hand that keeps vanishing, which is what fading light looks like', () => {
    const flicker = Array.from({ length: 12 }, (_, index) =>
      index % 2 === 0 ? frame(1000 + index * 200, makeHand({ shape: 'relaxed' })) : frame(1000 + index * 200),
    );
    const unknown = named(interpret(flicker), 'unknown');
    expect(unknown.length).toBeGreaterThan(1);
    expect(unknown.every((item) => item.phase === 'update' && item.confidence === 0)).toBe(true);
  });

  it('stays quiet when a hand simply leaves once', () => {
    expect(interpret([frame(1000, makeHand({ shape: 'relaxed' })), frame(1033)])).toEqual([]);
  });

  it('reports a hand that stays between a pinch and a relaxed hand', () => {
    const hovering = Array.from({ length: 10 }, (_, index) =>
      frame(1000 + index * 100, makeHand({ shape: 'near-pinch' })),
    );
    const unknown = named(interpret(hovering), 'unknown');
    expect(unknown.map((item) => item.phase)).toEqual(['start']);
  });

  it('stays quiet for a relaxed hand', () => {
    const relaxed = Array.from({ length: 30 }, (_, index) =>
      frame(1000 + index * 100, makeHand({ shape: 'relaxed' })),
    );
    expect(interpret(relaxed)).toEqual([]);
  });

  it('reports low-quality tracking without recognising a gesture', () => {
    const out = interpret(sequence([{ shape: 'pinch', score: 0.3 }, { shape: 'pinch', score: 0.3 }]));
    expect(out.every((item) => item.gesture === 'unknown' && item.phase === 'update')).toBe(true);
    expect(out).toHaveLength(2);
  });
});
