import { describe, expect, it } from 'vitest';
import { projectPoint } from '../../../src/spatial/hand-overlay';

const camera = { width: 640, height: 480 };

describe('projectPoint', () => {
  it('maps the image centre to the view centre, in any window shape', () => {
    for (const view of [{ width: 800, height: 600 }, { width: 1600, height: 600 }, { width: 400, height: 800 }]) {
      expect(projectPoint({ x: 0.5, y: 0.5 }, camera, view)).toEqual({ x: view.width / 2, y: view.height / 2 });
    }
  });

  it('fills a view of the same shape exactly, mirrored left to right', () => {
    const view = { width: 800, height: 600 };
    expect(projectPoint({ x: 0, y: 0 }, camera, view)).toEqual({ x: 800, y: 0 });
    expect(projectPoint({ x: 1, y: 1 }, camera, view)).toEqual({ x: 0, y: 600 });
  });

  it('accounts for the top and bottom being cropped in a wide window', () => {
    // Scaled to 1600 x 1200 to fill the width, so 300 pixels are lost from the top and bottom.
    const view = { width: 1600, height: 600 };
    expect(projectPoint({ x: 0.5, y: 0.25 }, camera, view).y).toBe(0);
    expect(projectPoint({ x: 0.5, y: 0.75 }, camera, view).y).toBe(600);
  });

  it('accounts for the sides being cropped in a narrow window', () => {
    // Scaled to 1066.67 x 800 to fill the height, so 333.33 pixels are lost from each side.
    const view = { width: 400, height: 800 };
    const left = projectPoint({ x: 0.3125, y: 0.5 }, camera, view);
    expect(left.x).toBeCloseTo(400);
  });
});
