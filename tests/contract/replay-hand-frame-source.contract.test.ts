import { describe, expect, it } from 'vitest';
import type { GestureInterpretation, HandFrame } from '../../src/contracts';
import { GestureInterpreter } from '../../src/motion/gesture-interpreter';
import { ReplayHandFrameSource } from '../../src/vision/replay-hand-frame-source';
import { frame, makeHand } from '../helpers/hand-frames';
import { checkHandFrameSource } from '../helpers/hand-frame-source.suite';

const frames: HandFrame[] = [
  frame(1000, makeHand({ shape: 'pinch', wrist: { x: 0.3, y: 0.3 } })),
  frame(1033, makeHand({ shape: 'pinch', wrist: { x: 0.4, y: 0.3 } })),
  frame(1066, makeHand({ shape: 'pinch', wrist: { x: 0.5, y: 0.3 } })),
  frame(1100, makeHand({ shape: 'relaxed', wrist: { x: 0.5, y: 0.3 } })),
];

async function interpretations(): Promise<GestureInterpretation[]> {
  const source = new ReplayHandFrameSource(frames);
  const out: GestureInterpretation[] = [];
  new GestureInterpreter(source).onInterpretation((item) => out.push(item));
  await source.start();
  return out;
}

describe('ReplayHandFrameSource', () => {
  it('meets the HandFrameSource contract', async () => {
    const result = await checkHandFrameSource(new ReplayHandFrameSource(frames), async () => {});
    expect(result.frames).toBe(frames.length);
    expect(result.timestampsIncrease).toBe(true);
    expect(result.imageFields).toEqual([]);
    expect(result.framesAfterStop).toBe(0);
  });

  it('gives identical interpretations on every replay (SC-009)', async () => {
    const first = await interpretations();
    expect(first.length).toBeGreaterThan(0);
    expect(await interpretations()).toEqual(first);
    expect(await interpretations()).toEqual(first);
  });

  it('stops delivering frames once stopped', async () => {
    const source = new ReplayHandFrameSource(frames);
    const seen: HandFrame[] = [];
    source.onFrame((item) => {
      seen.push(item);
      source.stop();
    });
    await source.start();
    expect(seen).toHaveLength(1);
  });
});
