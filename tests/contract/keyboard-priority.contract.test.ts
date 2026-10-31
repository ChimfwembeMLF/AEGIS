import { describe, expect, it } from 'vitest';
import type { Action, GestureInterpretation, Pose, SceneCommands, SceneInfo } from '../../src/contracts';
import { interactionSettings } from '../../src/contracts/interaction-settings';
import { GestureControl } from '../../src/core/gesture-control';
import { InteractionEngine } from '../../src/core/interaction-engine';
import { KeyboardInput } from '../../src/core/keyboard-input';

const initialPose: Pose = { position: { x: 0, y: 0 }, rotation: 0 };

function setup() {
  const poses: Pose[] = [];
  const scene: SceneCommands = { setPose: (pose) => poses.push(pose), showFeedback: () => {} };
  const info: SceneInfo = {
    bounds: () => ({ minX: -3, maxX: 3, minY: -2, maxY: 2 }),
    onBoundsChange: () => () => {},
  };
  const engine = new InteractionEngine(scene, info, initialPose);
  return { poses, control: new GestureControl(engine, scene, info, interactionSettings, () => 1000) };
}

const drag = (phase: GestureInterpretation['phase'], handId = 'a'): GestureInterpretation => ({
  gesture: 'pinch-drag',
  phase,
  confidence: 0.95,
  delta: { dx: 0.1, dy: 0 },
  handId,
  timestampMs: 1000,
});

function press(target: EventTarget, type: 'keydown' | 'keyup', key: string, repeat = false) {
  const event = Object.assign(new Event(type, { cancelable: true }), { key, repeat });
  target.dispatchEvent(event);
  return event;
}

function keyboard() {
  const target = new EventTarget();
  const actions: Action[] = [];
  const held: boolean[] = [];
  const viewToggles: string[] = [];
  const input = new KeyboardInput(target, {
    onAction: (action) => actions.push(action),
    onHeldChange: (isHeld) => held.push(isHeld),
    onToggleCapture: () => {},
    onToggleView: () => viewToggles.push('view'),
  });
  return { target, actions, held, input, viewToggles };
}

describe('keyboard priority over gestures', () => {
  it('ignores gestures while a key is held', () => {
    const { control, poses } = setup();
    control.setKeyboardHeld(true);
    control.handle(drag('start'));
    control.handle(drag('update'));
    expect(poses).toEqual([]);
  });

  it('takes control from a gesture in progress', () => {
    const { control, poses } = setup();
    control.handle(drag('start'));
    control.setKeyboardHeld(true);
    control.handle(drag('update'));
    expect(poses).toHaveLength(1);
  });

  it('returns to idle on release, so any hand can start', () => {
    const { control, poses } = setup();
    control.handle(drag('start', 'a'));
    control.setKeyboardHeld(true);
    control.setKeyboardHeld(false);
    control.handle(drag('start', 'b'));
    expect(poses).toHaveLength(2);
  });
});

describe('keyboard input', () => {
  it('moves every frame while an arrow key is held, by elapsed time', () => {
    const { target, actions, input } = keyboard();
    press(target, 'keydown', 'ArrowRight');
    input.tick(100);
    input.tick(100);
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({ type: 'move', source: 'keyboard', delta: { dy: 0 } });
    press(target, 'keyup', 'ArrowRight');
    input.tick(100);
    expect(actions).toHaveLength(2);
  });

  it.each([
    ['ArrowLeft', { dx: -1, dy: 0 }],
    ['ArrowRight', { dx: 1, dy: 0 }],
    ['ArrowUp', { dx: 0, dy: 1 }],
    ['ArrowDown', { dx: 0, dy: -1 }],
  ])('%s moves in the expected direction', (key, direction) => {
    const { target, actions, input } = keyboard();
    press(target, 'keydown', key);
    input.tick(100);
    const action = actions[0] as Extract<Action, { type: 'move' }>;
    expect(Math.sign(action.delta.dx)).toBe(direction.dx);
    expect(Math.sign(action.delta.dy)).toBe(direction.dy);
  });

  it('rotates left with Q and right with E, in either case', () => {
    const { target, actions, input } = keyboard();
    press(target, 'keydown', 'q');
    input.tick(100);
    press(target, 'keyup', 'q');
    press(target, 'keydown', 'E');
    input.tick(100);
    const [left, right] = actions as Array<Extract<Action, { type: 'rotate' }>>;
    expect(left?.delta.dAngle).toBeGreaterThan(0);
    expect(right?.delta.dAngle).toBeLessThan(0);
  });

  it('resets once per press of R, ignoring key repeat', () => {
    const { target, actions } = keyboard();
    press(target, 'keydown', 'r');
    press(target, 'keydown', 'r', true);
    expect(actions).toEqual([{ type: 'reset', source: 'keyboard' }]);
  });

  it('reports held changes once, and keeps holding until the last key is up', () => {
    const { target, held } = keyboard();
    press(target, 'keydown', 'ArrowLeft');
    press(target, 'keydown', 'ArrowUp');
    press(target, 'keyup', 'ArrowLeft');
    press(target, 'keyup', 'ArrowUp');
    expect(held).toEqual([true, false]);
  });

  it('releases every key when the window loses focus', () => {
    const { target, held, input, actions } = keyboard();
    press(target, 'keydown', 'ArrowLeft');
    input.releaseAll();
    input.tick(100);
    expect(held).toEqual([true, false]);
    expect(actions).toEqual([]);
  });

  it('toggles the camera view with V, once per press', () => {
    const { target, viewToggles, held } = keyboard();
    press(target, 'keydown', 'v');
    press(target, 'keydown', 'v', true);
    expect(viewToggles).toEqual(['view']);
    expect(held).toEqual([]);
  });

  it('ignores keys typed into a form field', () => {
    const actions: Action[] = [];
    const window = new EventTarget();
    const field = Object.assign(new EventTarget(), { tagName: 'INPUT' });
    const handlers = {
      onAction: (action: Action) => actions.push(action),
      onHeldChange: () => {},
      onToggleCapture: () => actions.push({ type: 'reset', source: 'keyboard' }),
      onToggleView: () => actions.push({ type: 'reset', source: 'keyboard' }),
    };
    new KeyboardInput(window, handlers);
    const event = Object.assign(new Event('keydown'), { key: 'c', repeat: false });
    Object.defineProperty(event, 'target', { value: field });
    window.dispatchEvent(event);
    expect(actions).toEqual([]);
  });

  it('stops arrow keys from scrolling the page', () => {
    const { target } = keyboard();
    expect(press(target, 'keydown', 'ArrowDown').defaultPrevented).toBe(true);
  });
});
