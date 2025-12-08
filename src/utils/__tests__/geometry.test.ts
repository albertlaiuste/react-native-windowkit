/// <reference types="jest" />

import {
  clampWindowToBounds,
  computeDragSnapTarget,
  computeResizeSnapTarget,
  type SnapCandidate,
} from '../geometry';
import {
  SNAP_BEHAVIOR_DEFAULTS,
  WINDOW_STYLE_DEFAULTS,
} from '../../constants/windows';
import { type WindowData } from '../../types/windows';

const baseConfig = {
  distance: SNAP_BEHAVIOR_DEFAULTS.distance,
  overlap: SNAP_BEHAVIOR_DEFAULTS.overlap,
};

const makeWindow = (overrides: Partial<WindowData>): WindowData => ({
  id: 'win',
  x: 0,
  y: 0,
  width: WINDOW_STYLE_DEFAULTS.minWidth,
  height: WINDOW_STYLE_DEFAULTS.minHeight,
  zIndex: 0,
  ...overrides,
});

describe('clampWindowToBounds', () => {
  it('enforces minimum size and clamps to the canvas origin', () => {
    const window = clampWindowToBounds(
      makeWindow({ x: -50, y: -10, width: 100, height: 100 }),
      { width: 400, height: 400 },
    );

    expect(window).toMatchObject({
      x: 0,
      y: 0,
      width: WINDOW_STYLE_DEFAULTS.minWidth,
      height: WINDOW_STYLE_DEFAULTS.minHeight,
    });
  });

  it('keeps the rect fully inside the canvas bounds', () => {
    const window = clampWindowToBounds(
      makeWindow({ x: 700, y: 700, width: 400, height: 300 }),
      { width: 1000, height: 1000 },
    );

    expect(window.x + window.width).toBeLessThanOrEqual(1000);
    expect(window.y + window.height).toBeLessThanOrEqual(1000);
    expect(window.x).toBe(600);
    expect(window.y).toBe(700);
  });
});

describe('computeDragSnapTarget', () => {
  it('snaps to the nearest aligned edge while dragging', () => {
    const active = makeWindow({
      id: 'active',
      x: 100,
      y: 100,
      width: 300,
      height: 300,
    });
    const neighbor = makeWindow({
      id: 'neighbor',
      x: 420,
      y: 100,
      width: 300,
      height: 300,
    });

    const target = computeDragSnapTarget(
      active,
      [neighbor],
      undefined,
      null,
      baseConfig,
    );

    expect(target).not.toBeNull();
    expect(target?.edges).toEqual(expect.arrayContaining(['right']));
    expect(target?.window).toMatchObject({
      x: 120,
      y: 100,
      width: WINDOW_STYLE_DEFAULTS.minWidth,
      height: 300,
    });
    expect(target?.targetIds).toEqual(['neighbor']);
    expect(target?.distance).toBe(20);
  });

  it('reuses the sticky target when still within range', () => {
    const sticky: SnapCandidate = {
      activeId: 'active',
      targetIds: ['neighbor'],
      edges: ['left'],
      window: makeWindow({ id: 'active', x: 50, y: 50 }),
      distance: 5,
    };
    const active = makeWindow({ id: 'active', x: 55, y: 55 });

    const target = computeDragSnapTarget(
      active,
      [],
      undefined,
      sticky,
      baseConfig,
    );

    expect(target).toEqual(sticky);
  });
});

describe('computeResizeSnapTarget', () => {
  it('snaps bottom edge while resizing south when aligned', () => {
    const active = makeWindow({
      id: 'active',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    });
    const below = makeWindow({
      id: 'below',
      x: 100,
      y: 320,
      width: 200,
      height: 100,
    });

    const target = computeResizeSnapTarget(
      active,
      [below],
      's',
      undefined,
      baseConfig,
    );

    expect(target?.edges).toEqual(['bottom']);
    expect(target?.window.height).toBe(WINDOW_STYLE_DEFAULTS.minHeight);
    expect(target?.window.x).toBe(100);
    expect(target?.window.y).toBe(100);
    expect(target?.targetIds).toEqual(['below']);
  });
});
