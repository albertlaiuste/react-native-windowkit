import {
  createWindowNormalizer,
  resolveWindowStyles,
  shallowEqualWindowStyles,
  type WindowStylesInput,
} from '../windows';
import { type WindowData } from '../../types';

describe('shallowEqualWindowStyles', () => {
  it('returns true for identical references', () => {
    const input: WindowStylesInput = { window: { borderWidth: 2 } };
    expect(shallowEqualWindowStyles(input, input)).toBe(true);
  });

  it('returns true for shallow-equal groups', () => {
    const a: WindowStylesInput = {
      window: { borderWidth: 2, borderRadius: 4 },
      snap: { borderWidth: 1 },
    };
    const b: WindowStylesInput = {
      window: { borderWidth: 2, borderRadius: 4 },
      snap: { borderWidth: 1 },
    };
    expect(shallowEqualWindowStyles(a, b)).toBe(true);
  });

  it('returns false when any style value differs', () => {
    const a: WindowStylesInput = { window: { borderWidth: 2 } };
    const b: WindowStylesInput = { window: { borderWidth: 3 } };
    expect(shallowEqualWindowStyles(a, b)).toBe(false);
  });
});

describe('resolveWindowStyles', () => {
  it('returns cached styles when input is shallow-equal', () => {
    const first = resolveWindowStyles({ window: { borderWidth: 2 } }, null);
    const second = resolveWindowStyles({ window: { borderWidth: 2 } }, first);

    expect(second.resolved).toBe(first.resolved);
  });

  it('returns new styles when input changes', () => {
    const first = resolveWindowStyles({ window: { borderWidth: 2 } }, null);
    const second = resolveWindowStyles({ window: { borderWidth: 3 } }, first);

    expect(second.resolved).not.toBe(first.resolved);
  });
});

const baseStyle = {
  minWidth: 200,
  minHeight: 150,
  borderRadius: 0,
  borderWidth: 2,
  borderColorActive: '#ff0',
  borderColorInactive: '#000',
  backgroundColor: '#333',
} satisfies Record<string, unknown>;

type TestWindow = WindowData & {
  width?: number;
  height?: number;
};

describe('createWindowNormalizer', () => {
  it('fills in missing dimensions from defaults', () => {
    const normalize = createWindowNormalizer<TestWindow>(baseStyle as never);
    const win = {
      id: '1',
      x: 0,
      y: 0,
      zIndex: 0,
      width: undefined,
      height: undefined,
    } as unknown as TestWindow;

    const normalized = normalize(win);
    expect(normalized.width).toBe(baseStyle.minWidth);
    expect(normalized.height).toBe(baseStyle.minHeight);
  });

  it('merges window style overrides', () => {
    const normalize = createWindowNormalizer<TestWindow>(baseStyle as never);
    const win = {
      id: '2',
      x: 0,
      y: 0,
      zIndex: 0,
      width: 250,
      height: 180,
      windowStyle: { minWidth: 220 },
    } as TestWindow;

    const normalized = normalize(win);
    expect(normalized.windowStyle?.minWidth).toBe(220);
    expect(normalized.windowStyle?.borderWidth).toBe(baseStyle.borderWidth);
  });

  it('returns cached normalized windows when input and style are unchanged', () => {
    const normalize = createWindowNormalizer<TestWindow>(baseStyle as never);
    const win = {
      id: '3',
      x: 0,
      y: 0,
      zIndex: 0,
      width: 240,
      height: 170,
    } as TestWindow;

    const first = normalize(win);
    const second = normalize(win);
    expect(second).toBe(first);
  });

  it('busts cache when relevant values change', () => {
    const normalize = createWindowNormalizer<TestWindow>(baseStyle as never);
    const win = {
      id: '4',
      x: 0,
      y: 0,
      zIndex: 0,
      width: 240,
      height: 170,
    } as TestWindow;

    const first = normalize(win);
    const second = normalize({ ...win, width: 260 } as TestWindow);
    expect(second).not.toBe(first);
    expect(second.width).toBe(260);
  });
});
