import { type ReactNode } from 'react';

export type WindowsMode = 'locked' | 'unlocked';

export type WindowData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  // When true, focusWindow leaves the window's zIndex unchanged so consumers
  // can pin a window to a fixed layer (e.g. a back-layer camera). activeId
  // still updates so border/active styling continues to work.
  alwaysVisible?: boolean;
  windowStyle?: Partial<
    Pick<
      WindowStyle,
      | 'minWidth'
      | 'minHeight'
      | 'maxWidth'
      | 'maxHeight'
      | 'gaps'
      | 'borderRadius'
      | 'borderWidth'
      | 'borderColorActive'
      | 'borderColorInactive'
      | 'backgroundColor'
    >
  >;
};

export type Window = WindowData;

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type WindowInteraction<T extends WindowData = WindowData> =
  | {
      type: 'drag';
      id: T['id'];
    }
  | {
      type: 'resize';
      id: T['id'];
      direction: ResizeDirection;
    }
  | null;

export type WindowKitState<T extends WindowData = WindowData> = {
  windows: T[];
  activeId: string | null;
  zCounter: number;
  mode: WindowsMode;
  snapEnabled: boolean;
  hintEnabled: boolean;
};

export type WindowKitActions<T extends WindowData = WindowData> = {
  setWindows: (windows: T[]) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (
    id: string,
    rect: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>,
  ) => void;
  setMode: (mode: WindowsMode) => void;
  toggleMode: () => void;
  setSnapEnabled: (snapEnabled: boolean) => void;
  toggleSnap: () => void;
  setHintEnabled: (hintEnabled: boolean) => void;
  toggleHints: () => void;
};

export type WindowKitContextValue<T extends WindowData = WindowData> = {
  state: WindowKitState<T>;
  actions: WindowKitActions<T>;
};

export type WindowOverridesFn<T extends WindowData = WindowData> = (
  window: T,
) => Partial<T> | undefined;

export type WindowKitProviderProps<T extends WindowData = WindowData> = {
  children: ReactNode;
  windows?: T[];
  mode?: WindowsMode;
  snapEnabled?: boolean;
  hintEnabled?: boolean;
  // Render-time per-window overrides. Called for each window on every render;
  // the returned partial is shallow-merged on top of the stored window data
  // before the library renders or evaluates focus rules. Useful for flipping
  // flags like `alwaysVisible` based on app state (e.g. responsive
  // breakpoint) without imperatively calling `setWindows`. Memoize with
  // `useCallback` to avoid unnecessary recomputation.
  windowOverrides?: WindowOverridesFn<T>;
  onWindowsChange?: (windows: T[]) => void;
  onActiveChange?: (activeId: string | null) => void;
  onModeChange?: (mode: WindowsMode) => void;
  onSnapChange?: (snapEnabled: boolean) => void;
  onHintChange?: (hintEnabled: boolean) => void;
};

export type WindowStyle = {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  gaps?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColorActive?: string;
  borderColorInactive?: string;
  backgroundColor?: string;
};

export type ShadowStyle = {
  boxShadow?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowOffset?: { width: number; height: number };
  shadowColor?: string;
};

export type SnapStyle = {
  borderWidth?: number;
  borderRadius?: number;
  borderColor?: string;
  backgroundColor?: string;
  offset?: number;
};

export type HintStyle = {
  thickness?: number;
  color?: string;
  padding?: number;
  dashWidth?: number;
  dashGap?: number;
};

export type HandleStyle = {
  size?: number;
  borderHitThickness?: number;
  cornerHitSize?: number;
  activeOpacity?: number;
  inactiveOpacity?: number;
  backgroundActive?: string;
  backgroundInactive?: string;
  borderActive?: string;
  borderInactive?: string;
};

export type HeaderStyle = {
  backgroundColor?: string;
  textColor?: string;
  showTitle?: boolean;
  paddingHorizontal?: number;
  paddingVertical?: number;
  closeButton?: {
    size?: number;
    opacity?: number;
    color?: string;
    style?: Record<string, unknown>;
    icon?: ReactNode;
  };
};

export type RenderHeaderProps<T extends WindowData = WindowData> = {
  window: T;
  isActive: boolean;
  closeButtonEnabled: boolean;
  onClose?: (id: string) => void;
};
