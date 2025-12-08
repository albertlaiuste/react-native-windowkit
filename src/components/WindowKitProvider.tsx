import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type WindowsMode,
  type WindowKitContextValue,
  type WindowKitProviderProps,
  type WindowData,
} from '../types/windows';

const WindowKitContext =
  createContext<WindowKitContextValue<WindowData> | null>(null);

const selectNextActiveId = <T extends WindowData>(
  current: string | null,
  windows: T[],
) => {
  if (current === null) {
    return null;
  }

  if (windows.some((win) => win.id === current)) {
    return current;
  }

  return windows[0]?.id ?? null;
};

export function WindowKitProvider<T extends WindowData>({
  children,
  windows = [],
  mode = 'locked',
  snapEnabled = true,
  onWindowsChange,
  onActiveChange,
  onModeChange,
  onSnapChange,
}: WindowKitProviderProps<T>) {
  const [state, setState] = useState<WindowKitContextValue<T>['state']>(() => {
    const zCounter = windows.reduce((max, win) => Math.max(max, win.zIndex), 0);

    return {
      windows,
      activeId: null,
      zCounter,
      mode,
      snapEnabled,
    };
  });
  const previousWindows = useRef<T[]>(state.windows);
  const previousActiveId = useRef<string | null>(state.activeId);
  const previousMode = useRef<WindowsMode>(state.mode);
  const previousSnapEnabled = useRef<boolean>(state.snapEnabled);

  useEffect(() => {
    if (onWindowsChange && previousWindows.current !== state.windows) {
      previousWindows.current = state.windows;
      onWindowsChange(state.windows);
    }
  }, [onWindowsChange, state.windows]);

  useEffect(() => {
    if (onActiveChange && previousActiveId.current !== state.activeId) {
      previousActiveId.current = state.activeId;
      onActiveChange(state.activeId);
    }
  }, [onActiveChange, state.activeId]);

  useEffect(() => {
    if (onModeChange && previousMode.current !== state.mode) {
      previousMode.current = state.mode;
      onModeChange(state.mode);
    }
  }, [onModeChange, state.mode]);

  useEffect(() => {
    if (onSnapChange && previousSnapEnabled.current !== state.snapEnabled) {
      previousSnapEnabled.current = state.snapEnabled;
      onSnapChange(state.snapEnabled);
    }
  }, [onSnapChange, state.snapEnabled]);

  const setWindows = useCallback(
    (nextWindows: T[]) =>
      setState((current) => {
        const nextZCounter = nextWindows.reduce(
          (max, win) => Math.max(max, win.zIndex),
          0,
        );

        if (
          current.windows === nextWindows &&
          current.zCounter === nextZCounter
        ) {
          return current;
        }

        return {
          ...current,
          windows: nextWindows,
          zCounter: nextZCounter,
          activeId: selectNextActiveId(current.activeId, nextWindows),
        };
      }),
    [],
  );

  const focusWindow = useCallback((id: string) => {
    setState((current) => {
      const nextZ = current.zCounter + 1;
      const nextWindows = current.windows.map((win) => {
        if (win.id === id) {
          return { ...win, zIndex: nextZ };
        }

        return win;
      });

      return {
        ...current,
        activeId: id,
        zCounter: nextZ,
        windows: nextWindows,
      };
    });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setState((current) => {
      const nextWindows = current.windows.map((win) => {
        if (win.id === id) {
          if (win.x === x && win.y === y) {
            return win;
          }
          return { ...win, x, y };
        }

        return win;
      });

      if (nextWindows === current.windows) {
        return current;
      }

      return { ...current, windows: nextWindows };
    });
  }, []);

  const resizeWindow = useCallback(
    (
      id: string,
      windowData: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>,
    ) => {
      setState((current) => {
        const nextWindows = current.windows.map((win) => {
          if (win.id === id) {
            const nextWindow = { ...win, ...windowData };
            if (
              nextWindow.x === win.x &&
              nextWindow.y === win.y &&
              nextWindow.width === win.width &&
              nextWindow.height === win.height
            ) {
              return win;
            }
            return nextWindow;
          }

          return win;
        });

        if (nextWindows === current.windows) {
          return current;
        }

        return { ...current, windows: nextWindows };
      });
    },
    [],
  );

  const setMode = useCallback((mode: WindowsMode) => {
    setState((current) => {
      if (current.mode === mode) {
        return current;
      }

      return { ...current, mode };
    });
  }, []);

  const toggleMode = useCallback(() => {
    setState((current) => {
      let nextMode: WindowsMode = 'unlocked';
      if (current.mode === 'unlocked') {
        nextMode = 'locked';
      }
      return { ...current, mode: nextMode };
    });
  }, []);

  const setSnapEnabled = useCallback((snapEnabled: boolean) => {
    setState((current) => {
      if (current.snapEnabled === snapEnabled) {
        return current;
      }

      return { ...current, snapEnabled };
    });
  }, []);

  const toggleSnap = useCallback(() => {
    setState((current) => {
      const nextSnapEnabled = !current.snapEnabled;
      return { ...current, snapEnabled: nextSnapEnabled };
    });
  }, []);

  const value: WindowKitContextValue<T> = useMemo(
    () => ({
      state,
      actions: {
        setWindows,
        focusWindow,
        moveWindow,
        resizeWindow,
        setMode,
        toggleMode,
        setSnapEnabled,
        toggleSnap,
      },
    }),
    [
      focusWindow,
      moveWindow,
      resizeWindow,
      setMode,
      setSnapEnabled,
      setWindows,
      state,
      toggleMode,
      toggleSnap,
    ],
  );

  return (
    <WindowKitContext.Provider
      value={value as unknown as WindowKitContextValue<WindowData>}>
      {children}
    </WindowKitContext.Provider>
  );
}

export const useWindowKit = <T extends WindowData = WindowData>() => {
  const context = useContext(WindowKitContext);

  if (!context) {
    throw new Error('useWindowKit must be used within a WindowKitProvider');
  }

  return context as unknown as WindowKitContextValue<T>;
};
