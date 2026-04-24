import React from 'react';
import { act, create } from 'react-test-renderer';
import { WindowKitProvider, useWindowKit } from '../WindowKitProvider';
import { type WindowData, type WindowOverridesFn } from '../../types/windows';

// React 18+ act API expects the host to opt into the act test environment.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Captured<T extends WindowData> = ReturnType<typeof useWindowKit<T>>;

function Capture<T extends WindowData>({
  onValue,
}: {
  onValue: (value: Captured<T>) => void;
}) {
  const value = useWindowKit<T>();
  onValue(value);
  return null;
}

const makeWindow = (overrides: Partial<WindowData>): WindowData => ({
  id: overrides.id ?? 'w',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  zIndex: overrides.zIndex ?? 1,
  ...overrides,
});

const renderProvider = (
  windows: WindowData[],
  windowOverrides?: WindowOverridesFn<WindowData>,
) => {
  let captured: Captured<WindowData> | null = null;
  const onValue = (value: Captured<WindowData>) => {
    captured = value;
  };

  act(() => {
    create(
      <WindowKitProvider windows={windows} windowOverrides={windowOverrides}>
        <Capture onValue={onValue} />
      </WindowKitProvider>,
    );
  });

  if (!captured) {
    throw new Error('Provider did not render');
  }
  return {
    get current() {
      if (!captured) throw new Error('Provider did not render');
      return captured;
    },
  };
};

describe('WindowKitProvider focusWindow', () => {
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('raises a regular window above its peers on focus', () => {
    const windows = [
      makeWindow({ id: 'a', zIndex: 1 }),
      makeWindow({ id: 'b', zIndex: 2 }),
      makeWindow({ id: 'c', zIndex: 3 }),
    ];
    const handle = renderProvider(windows);

    act(() => {
      handle.current.actions.focusWindow('a');
    });

    const next = handle.current.state.windows;
    const a = next.find((w) => w.id === 'a')!;
    const b = next.find((w) => w.id === 'b')!;
    const c = next.find((w) => w.id === 'c')!;

    expect(a.zIndex).toBeGreaterThan(b.zIndex);
    expect(a.zIndex).toBeGreaterThan(c.zIndex);
    expect(b.zIndex).toBe(2);
    expect(c.zIndex).toBe(3);
    expect(handle.current.state.activeId).toBe('a');
  });

  it('leaves zIndex unchanged when alwaysVisible is true, but still updates activeId', () => {
    const windows = [
      makeWindow({ id: 'cam', zIndex: 0, alwaysVisible: true }),
      makeWindow({ id: 'tel', zIndex: 1 }),
      makeWindow({ id: 'act', zIndex: 2 }),
    ];
    const handle = renderProvider(windows);
    const initialZCounter = handle.current.state.zCounter;

    act(() => {
      handle.current.actions.focusWindow('cam');
    });

    const next = handle.current.state.windows;
    expect(next.find((w) => w.id === 'cam')!.zIndex).toBe(0);
    expect(next.find((w) => w.id === 'tel')!.zIndex).toBe(1);
    expect(next.find((w) => w.id === 'act')!.zIndex).toBe(2);
    expect(handle.current.state.zCounter).toBe(initialZCounter);
    expect(handle.current.state.activeId).toBe('cam');
  });

  it('preserves data zIndex on alwaysVisible windows across focus calls', () => {
    // Visual rendering pins alwaysVisible windows to z=0 (in Window.tsx);
    // here we just verify the data zIndex is left intact so toggling
    // alwaysVisible off later restores the original stacking.
    const windows = [
      makeWindow({ id: 'a', zIndex: 0, alwaysVisible: true }),
      makeWindow({ id: 'mid', zIndex: 5 }),
      makeWindow({ id: 'b', zIndex: 999, alwaysVisible: true }),
    ];
    const handle = renderProvider(windows);

    act(() => {
      handle.current.actions.focusWindow('a');
    });
    act(() => {
      handle.current.actions.focusWindow('b');
    });

    const next = handle.current.state.windows;
    expect(next.find((w) => w.id === 'a')!.zIndex).toBe(0);
    expect(next.find((w) => w.id === 'b')!.zIndex).toBe(999);
    expect(next.find((w) => w.id === 'mid')!.zIndex).toBe(5);
    expect(handle.current.state.activeId).toBe('b');
  });

  it('still bumps a regular window above an alwaysVisible peer', () => {
    const windows = [
      makeWindow({ id: 'cam', zIndex: 0, alwaysVisible: true }),
      makeWindow({ id: 'tel', zIndex: 1 }),
    ];
    const handle = renderProvider(windows);

    act(() => {
      handle.current.actions.focusWindow('tel');
    });

    const next = handle.current.state.windows;
    expect(next.find((w) => w.id === 'cam')!.zIndex).toBe(0);
    expect(next.find((w) => w.id === 'tel')!.zIndex).toBeGreaterThan(1);
    expect(handle.current.state.activeId).toBe('tel');
  });
});

describe('WindowKitProvider windowOverrides', () => {
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('exposes effective windows merged with overrides via state.windows', () => {
    const windows = [
      makeWindow({ id: 'cam', zIndex: 5 }),
      makeWindow({ id: 'tel', zIndex: 1 }),
    ];
    const overrides: WindowOverridesFn<WindowData> = (w) =>
      w.id === 'cam' ? { alwaysVisible: true } : undefined;
    const handle = renderProvider(windows, overrides);

    const cam = handle.current.state.windows.find((w) => w.id === 'cam')!;
    const tel = handle.current.state.windows.find((w) => w.id === 'tel')!;
    expect(cam.alwaysVisible).toBe(true);
    expect(cam.zIndex).toBe(5);
    expect(tel.alwaysVisible).toBeUndefined();
  });

  it('honors override-supplied alwaysVisible in focusWindow (no bump)', () => {
    const windows = [
      makeWindow({ id: 'cam', zIndex: 0 }),
      makeWindow({ id: 'tel', zIndex: 1 }),
    ];
    // alwaysVisible NOT on raw data — only via override
    const overrides: WindowOverridesFn<WindowData> = (w) =>
      w.id === 'cam' ? { alwaysVisible: true } : undefined;
    const handle = renderProvider(windows, overrides);
    const initialZCounter = handle.current.state.zCounter;

    act(() => {
      handle.current.actions.focusWindow('cam');
    });

    const cam = handle.current.state.windows.find((w) => w.id === 'cam')!;
    const tel = handle.current.state.windows.find((w) => w.id === 'tel')!;
    expect(cam.zIndex).toBe(0);
    expect(tel.zIndex).toBe(1);
    expect(handle.current.state.zCounter).toBe(initialZCounter);
    expect(handle.current.state.activeId).toBe('cam');
  });
});
