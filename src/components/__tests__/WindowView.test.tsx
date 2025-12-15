/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render } from '@testing-library/react-native';
import WindowView from '../WindowView';
import { useWindowKit } from '../WindowKitProvider';
import { type WindowKitActions, type WindowData } from '../../types/windows';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), {
  virtual: true,
});

jest.mock(
  'react-native',
  () => {
    const View = React.forwardRef((props: any, ref) =>
      React.createElement('div', { ...props, ref }, props.children),
    );
    const Text = React.forwardRef((props: any, ref) =>
      React.createElement('span', { ...props, ref }, props.children),
    );
    const StyleSheet = { create: (styles: any) => styles };
    class AnimatedValue {
      private _value: number;
      constructor(value: number) {
        this._value = value;
      }
      interpolate() {
        return this._value;
      }
    }
    const Animated = {
      Value: AnimatedValue,
      spring: jest.fn(() => ({
        start: (cb?: () => void) => cb?.(),
      })),
    };
    const LayoutAnimation = {
      configureNext: jest.fn(),
      create: jest.fn((duration: number, type: string, property: string) => ({
        duration,
        type,
        property,
      })),
      Types: { easeInEaseOut: 'easeInEaseOut' },
      Properties: { opacity: 'opacity' },
    };
    const UIManager = {
      setLayoutAnimationEnabledExperimental: jest.fn(),
    };

    return {
      Animated,
      LayoutAnimation,
      UIManager,
      View,
      Text,
      StyleSheet,
      Platform: { OS: 'web', select: () => 'web' },
    };
  },
  { virtual: true },
);

jest.mock('react-native-reanimated', () => {
  const makeAnim = () => {
    const anim: any = {};
    anim.duration = jest.fn(() => anim);
    anim.easing = jest.fn(() => anim);
    return anim;
  };
  const ease = jest.fn((v?: unknown) => v);

  return {
    __esModule: true,
    default: { call: () => undefined },
    ZoomIn: makeAnim(),
    ZoomOut: makeAnim(),
    Easing: {
      out: jest.fn(() => ease),
      in: jest.fn(() => ease),
      cubic: jest.fn(),
    },
  };
});

jest.mock('../WindowKitProvider', () => ({
  __esModule: true,
  useWindowKit: jest.fn(),
}));

jest.mock('../Window', () => {
  const comparator = (prev: any, next: any) =>
    prev.styleConfig === next.styleConfig &&
    prev.renderContent === next.renderContent &&
    prev.renderContentVersion === next.renderContentVersion &&
    prev.animations?.entering === next.animations?.entering &&
    prev.animations?.exiting === next.animations?.exiting &&
    prev.shadowEnabled === next.shadowEnabled &&
    prev.headerEnabled === next.headerEnabled &&
    prev.closeButtonEnabled === next.closeButtonEnabled &&
    prev.onClose === next.onClose &&
    prev.isUnlocked === next.isUnlocked &&
    prev.isActive === next.isActive &&
    prev.canvasSize?.width === next.canvasSize?.width &&
    prev.canvasSize?.height === next.canvasSize?.height &&
    prev.window.id === next.window.id &&
    prev.window.x === next.window.x &&
    prev.window.y === next.window.y &&
    prev.window.width === next.window.width &&
    prev.window.height === next.window.height &&
    prev.window.zIndex === next.window.zIndex &&
    prev.window.windowStyle === next.window.windowStyle;

  const MockWindow = (props: any) => {
    props.renderContent(props.window);
    return null;
  };

  return React.memo(MockWindow, comparator);
});

const mockUseWindowKit = useWindowKit as jest.MockedFunction<
  typeof useWindowKit
>;

const baseActions: WindowKitActions<WindowData> = {
  setWindows: jest.fn(),
  focusWindow: jest.fn(),
  moveWindow: jest.fn(),
  resizeWindow: jest.fn(),
  setMode: jest.fn(),
  toggleMode: jest.fn(),
  setSnapEnabled: jest.fn(),
  toggleSnap: jest.fn(),
};

const createState = (windows: any[]) => ({
  windows,
  activeId: null,
  mode: 'unlocked' as const,
  snapEnabled: false,
  zCounter: 1,
});

describe('WindowView memoization', () => {
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not rerender window content when data stays stable', () => {
    const windows = [
      { id: '1', x: 0, y: 0, width: 100, height: 100, zIndex: 1 },
    ];
    mockUseWindowKit.mockReturnValue({
      state: createState(windows),
      actions: baseActions,
    });
    const renderWindowContent = jest.fn(() => null);

    const element = React.createElement(WindowView, {
      renderWindowContent,
    });
    const { rerender } = render(element);

    expect(renderWindowContent).toHaveBeenCalledTimes(1);

    rerender(
      React.createElement(WindowView, {
        renderWindowContent,
      }),
    );

    expect(renderWindowContent).toHaveBeenCalledTimes(1);
  });

  it('rerenders window content when window data changes', () => {
    const windowsA = [
      { id: '1', x: 0, y: 0, width: 100, height: 100, zIndex: 1 },
    ];
    const windowsB = [{ ...windowsA[0], width: 150 }];
    mockUseWindowKit
      .mockReturnValueOnce({
        state: createState(windowsA),
        actions: baseActions,
      })
      .mockReturnValue({
        state: createState(windowsB),
        actions: baseActions,
      });
    const renderWindowContent = jest.fn(() => null);

    const element = React.createElement(WindowView, {
      renderWindowContent,
    });
    const { rerender } = render(element);

    renderWindowContent.mockClear();

    rerender(
      React.createElement(WindowView, {
        renderWindowContent,
      }),
    );

    expect(renderWindowContent).toHaveBeenCalledTimes(1);
  });

  it('only rerenders the window that changes', () => {
    const windowsA = [
      { id: '1', x: 0, y: 0, width: 100, height: 100, zIndex: 1 },
      { id: '2', x: 20, y: 20, width: 120, height: 120, zIndex: 2 },
      { id: '3', x: 40, y: 40, width: 140, height: 140, zIndex: 3 },
    ];
    const windowsB = [
      windowsA[0],
      { ...windowsA[1], x: 50, y: 60, width: 160, height: 110 },
      windowsA[2],
    ];

    mockUseWindowKit
      .mockReturnValueOnce({
        state: createState(windowsA),
        actions: baseActions,
      })
      .mockReturnValueOnce({
        state: createState(windowsB),
        actions: baseActions,
      });

    const renderCounts: Record<string, number> = {};
    const renderWindowContent = jest.fn((win: { id: string }) => {
      renderCounts[win.id] = (renderCounts[win.id] ?? 0) + 1;
      return null;
    });

    const element = React.createElement(WindowView, {
      renderWindowContent,
    });
    const { rerender } = render(element);

    expect(renderCounts).toEqual({ '1': 1, '2': 1, '3': 1 });

    renderWindowContent.mockClear();

    rerender(
      React.createElement(WindowView, {
        renderWindowContent,
      }),
    );

    expect(renderCounts).toEqual({ '1': 1, '2': 2, '3': 1 });
    expect(renderWindowContent).toHaveBeenCalledTimes(1);
  });
});
