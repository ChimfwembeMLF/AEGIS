import { describe, expect, it } from 'vitest';
import { assignHandIds, type KnownHand } from '../../../src/vision/hand-identity';

function idMaker() {
  let next = 1;
  return () => `hand-${next++}`;
}

const known = (id: string, x: number, y = 0.5): KnownHand => ({ id, wrist: { x, y } });

describe('assignHandIds', () => {
  it('gives each new hand its own id', () => {
    const hands = assignHandIds([{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }], [], idMaker());
    expect(hands.map((hand) => hand.id)).toEqual(['hand-1', 'hand-2']);
  });

  it('keeps ids when the tracker reports hands in a different order', () => {
    const previous = [known('left', 0.2), known('right', 0.8)];
    const hands = assignHandIds([{ x: 0.79, y: 0.5 }, { x: 0.21, y: 0.5 }], previous, idMaker());
    expect(hands.map((hand) => hand.id)).toEqual(['right', 'left']);
  });

  it('keeps following each hand as two hands cross, one small step at a time', () => {
    let hands = [known('a', 0.3), known('b', 0.7)];
    for (let step = 1; step <= 40; step += 1) {
      const a = { x: 0.3 + step * 0.01, y: 0.4 };
      const b = { x: 0.7 - step * 0.01, y: 0.6 };
      hands = assignHandIds([b, a], hands, idMaker());
    }
    const a = hands.find((hand) => hand.id === 'a');
    expect(a?.wrist.x).toBeCloseTo(0.7);
  });

  it('never gives two hands the same id', () => {
    const hands = assignHandIds([{ x: 0.5, y: 0.5 }, { x: 0.51, y: 0.5 }], [known('a', 0.5)], idMaker());
    expect(new Set(hands.map((hand) => hand.id)).size).toBe(2);
  });

  it('gives a hand that reappears a new id, as its old gesture has ended', () => {
    const gone = assignHandIds([], [known('a', 0.5)], idMaker());
    const hands = assignHandIds([{ x: 0.5, y: 0.5 }], gone, idMaker());
    expect(hands[0]?.id).toBe('hand-1');
  });
});
