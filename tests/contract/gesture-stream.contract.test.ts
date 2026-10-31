import { describe, expect, it } from 'vitest';
import type { GestureInterpretation, HandFrame, HandFrameSource, HandMarkers } from '../../src/contracts';
import { GestureInterpreter } from '../../src/motion/gesture-interpreter';
import { frame, makeHand } from '../helpers/hand-frames';

function fakeSource() {
  let listener: (handFrame: HandFrame) => void = () => {};
  const source: HandFrameSource = {
    start: async () => {},
    stop: () => {},
    onFrame: (next) => {
      listener = next;
      return () => {};
    },
  };
  return { source, emit: (handFrame: HandFrame) => listener(handFrame) };
}

const session: HandFrame[] = [
  frame(1000, makeHand({ shape: 'pinch', wrist: { x: 0.3, y: 0.3 } })),
  frame(1033, makeHand({ shape: 'pinch', wrist: { x: 0.4, y: 0.3 } })),
  frame(1066, makeHand({ shape: 'pinch', wrist: { x: 0.5, y: 0.3 } })),
  frame(1100, makeHand({ shape: 'relaxed', wrist: { x: 0.5, y: 0.3 } })),
  frame(1133, makeHand({ shape: 'pinch', roll: 0 })),
  frame(1166, makeHand({ shape: 'pinch', roll: 0.4 })),
  frame(1200),
];

function run(frames: HandFrame[]): GestureInterpretation[] {
  const { source, emit } = fakeSource();
  const out: GestureInterpretation[] = [];
  new GestureInterpreter(source).onInterpretation((item) => out.push(item));
  frames.forEach(emit);
  return out;
}

const gestures = (items: GestureInterpretation[]) => items.filter((item) => item.gesture !== 'hand-present');

function handsSeen(frames: HandFrame[]) {
  const { source, emit } = fakeSource();
  const seen: HandMarkers[][] = [];
  new GestureInterpreter(source).onHands((hands) => seen.push(hands));
  frames.forEach(emit);
  return seen;
}

describe('hand markers', () => {
  it('reports every hand in view on every frame, including none', () => {
    const seen = handsSeen([
      frame(1000, makeHand({ shape: 'open', handId: 'a' }), makeHand({ shape: 'open', handId: 'b' })),
      frame(1033),
    ]);
    expect(seen.map((hands) => hands.map((hand) => hand.handId))).toEqual([['a', 'b'], []]);
    expect(seen[0]?.[0]?.landmarks).toHaveLength(21);
  });

  it('marks a pinch from the moment it registers until it ends', () => {
    const seen = handsSeen([
      frame(1000, makeHand({ shape: 'relaxed' })),
      frame(1033, makeHand({ shape: 'pinch' })),
      frame(1066, makeHand({ shape: 'pinch' })),
      frame(1100, makeHand({ shape: 'relaxed' })),
    ]);
    expect(seen.map((hands) => hands[0]?.pinching)).toEqual([false, true, true, false]);
  });

  it('marks a pinch on a hand that is not in control', () => {
    const seen = handsSeen([
      frame(1000, makeHand({ shape: 'pinch', handId: 'a' }), makeHand({ shape: 'pinch', handId: 'b' })),
    ]);
    expect(seen[0]?.map((hand) => hand.pinching)).toEqual([true, true]);
  });
});

describe('GestureStream contract', () => {
  it('receives frames through HandFrameSource', () => {
    expect(run(session).length).toBeGreaterThan(0);
  });

  it('gives every message a confidence between 0 and 1', () => {
    for (const item of run(session)) {
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('gives identical output for repeated runs of the same frames', () => {
    expect(run(session)).toEqual(run(session));
  });

  it('sends an end when the hand leaves view mid-gesture', () => {
    const out = gestures(run(session));
    expect(out.at(-1)).toMatchObject({ gesture: 'pinch-twist', phase: 'end', timestampMs: 1200 });
  });

  it('keeps following the hand that started, when a second hand appears', () => {
    const first = (x: number) => makeHand({ shape: 'pinch', handId: 'a', wrist: { x, y: 0.3 } });
    const second = (x: number) => makeHand({ shape: 'pinch', handId: 'b', wrist: { x, y: 0.7 } });
    const out = run([
      frame(1000, first(0.3)),
      frame(1033, first(0.4), second(0.2)),
      frame(1066, second(0.9), first(0.5)),
    ]);
    expect(out.every((item) => item.handId === 'a')).toBe(true);
  });
});
