import type { HandFrame, HandFrameSource } from '../../src/contracts';

const IMAGE_FIELD = /image|bitmap|pixels?|frame_?data|video|canvas/i;

export function imageFields(value: unknown, path = 'frame'): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return [path];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(IMAGE_FIELD.test(key) ? [`${path}.${key}`] : []),
    ...imageFields(child, `${path}.${key}`),
  ]);
}

export interface SourceCheckResult {
  frames: number;
  timestampsIncrease: boolean;
  imageFields: string[];
  framesAfterStop: number;
}

/** Runs the HandFrameSource contract against any source, live or replayed. */
export async function checkHandFrameSource(
  source: HandFrameSource,
  run: (frames: HandFrame[]) => Promise<void>,
): Promise<SourceCheckResult> {
  const frames: HandFrame[] = [];
  const unsubscribe = source.onFrame((frame) => frames.push(frame));

  await source.start();
  await run(frames);
  source.stop();

  const countAtStop = frames.length;
  await new Promise((resolve) => setTimeout(resolve, 100));
  unsubscribe();

  return {
    frames: countAtStop,
    timestampsIncrease: frames.every(
      (frame, index) => index === 0 || frame.timestampMs > (frames[index - 1] as HandFrame).timestampMs,
    ),
    imageFields: frames.flatMap((frame) => imageFields(frame)),
    framesAfterStop: frames.length - countAtStop,
  };
}
