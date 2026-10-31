import { describe, expect, it } from 'vitest';
import type {
  CameraDisplay,
  CameraViewState,
  CaptureControl,
  CaptureSession,
  CaptureState,
  HandMarkers,
} from '../../../src/contracts';
import { CameraViewControl } from '../../../src/core/camera-view-control';

const hands: HandMarkers[] = [{ handId: 'a', landmarks: [], pinching: false }];

function setup() {
  let listener: (session: CaptureSession) => void = () => {};
  const capture: CaptureControl = {
    start: async () => {},
    stop: () => {},
    onStateChange: (next) => {
      listener = next;
      return () => {};
    },
  };
  const shownHands: HandMarkers[][] = [];
  const views: CameraViewState[] = [];
  const display: CameraDisplay = {
    showHands: (items) => shownHands.push(items),
    showCameraView: (view) => views.push(view),
  };
  return {
    control: new CameraViewControl(display, capture),
    shownHands,
    views,
    report: (state: CaptureState) => listener({ state }),
  };
}

describe('CameraViewControl', () => {
  it('shows the view by default once the camera is on', () => {
    const { views, report } = setup();
    report('active');
    expect(views.at(-1)).toEqual({ visible: true, hiddenByPerson: false });
  });

  it('shows no view until the camera is on', () => {
    const { views } = setup();
    expect(views.at(-1)?.visible).toBe(false);
  });

  it('hides and shows the view on request, while the camera stays on', () => {
    const { control, views, report } = setup();
    report('active');
    control.toggle();
    expect(views.at(-1)).toEqual({ visible: false, hiddenByPerson: true });
    control.toggle();
    expect(views.at(-1)).toEqual({ visible: true, hiddenByPerson: false });
  });

  it('keeps showing hand points while the view is hidden (FR-025)', () => {
    const { control, shownHands, report } = setup();
    report('active');
    control.toggle();
    control.showHands(hands);
    expect(shownHands.at(-1)).toEqual(hands);
  });

  it.each(['stopped', 'unavailable', 'starting'] as const)('clears view and points when %s (FR-027)', (state) => {
    const { control, shownHands, views, report } = setup();
    report('active');
    control.showHands(hands);
    report(state);
    expect(shownHands.at(-1)).toEqual([]);
    expect(views.at(-1)?.visible).toBe(false);
  });

  it('ignores a late frame once the camera is off', () => {
    const { control, shownHands, report } = setup();
    report('active');
    report('stopped');
    const count = shownHands.length;
    control.showHands(hands);
    expect(shownHands).toHaveLength(count);
  });

  it('remembers a hidden view when the camera restarts', () => {
    const { control, views, report } = setup();
    report('active');
    control.toggle();
    report('stopped');
    report('active');
    expect(views.at(-1)).toEqual({ visible: false, hiddenByPerson: true });
  });
});
