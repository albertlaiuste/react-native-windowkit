/// <reference types="jest" />

import {
  clampWindowToBounds,
  computeDragHintTarget,
  computeDragSnapTarget,
  computeResizeHintTarget,
  computeResizeSnapTarget,
  mergeHintConfig,
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
  visualPreview: SNAP_BEHAVIOR_DEFAULTS.visualPreview,
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

describe('computeDragHintTarget', () => {
  const hintConfig = mergeHintConfig(
    {
      enabled: true,
      distance: 6,
      snap: {
        enabled: true,
        distance: 6,
        overlap: SNAP_BEHAVIOR_DEFAULTS.overlap,
        visualPreview: true,
      },
    },
    baseConfig,
  );

  it('returns guides when aligning edges without overlap', () => {
    const active = makeWindow({
      id: 'active',
      x: 100,
      y: 0,
      width: 200,
      height: 200,
    });
    const distant = makeWindow({
      id: 'distant',
      x: 100,
      y: 600,
      width: 220,
      height: 160,
    });

    const result = computeDragHintTarget(
      active,
      [distant],
      { width: 1200, height: 1200 },
      hintConfig,
    );

    expect(result.guides).toHaveLength(2);
    expect(result.target?.edges).toContain('left');
    expect(result.target?.targetIds).toContain('distant');
  });
});

describe('computeResizeHintTarget', () => {
  const hintConfig = mergeHintConfig(
    {
      enabled: true,
      distance: 6,
      snap: {
        enabled: true,
        distance: 6,
        overlap: SNAP_BEHAVIOR_DEFAULTS.overlap,
        visualPreview: true,
      },
    },
    baseConfig,
  );

  it('suggests a hint when resizing toward a nearby edge', () => {
    const active = makeWindow({
      id: 'active',
      x: 100,
      y: 100,
      width: 290,
      height: 200,
      windowStyle: { minWidth: 100 },
    });
    const neighbor = makeWindow({
      id: 'neighbor',
      x: 396,
      y: 120,
      width: 180,
      height: 160,
    });

    const result = computeResizeHintTarget(
      active,
      [neighbor],
      'e',
      { width: 1000, height: 800 },
      hintConfig,
    );

    expect(result.guides).toHaveLength(1);
    expect(result.target?.edges).toContain('right');
    expect(result.target?.window.width).toBe(296);
  });
});
