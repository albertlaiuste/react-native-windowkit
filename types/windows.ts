import { type ReactNode } from 'react';

export type WindowsMode = 'locked' | 'unlocked';

export type WindowData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  windowStyle?: Partial<
    Pick<
      WindowStyle,
      | 'minWidth'
      | 'minHeight'
      | 'maxWidth'
      | 'maxHeight'
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
};

export type WindowKitContextValue<T extends WindowData = WindowData> = {
  state: WindowKitState<T>;
  actions: WindowKitActions<T>;
};

export type WindowKitProviderProps<T extends WindowData = WindowData> = {
  children: ReactNode;
  windows?: T[];
  mode?: WindowsMode;
  snapEnabled?: boolean;
  onWindowsChange?: (windows: T[]) => void;
  onActiveChange?: (activeId: string | null) => void;
  onModeChange?: (mode: WindowsMode) => void;
  onSnapChange?: (snapEnabled: boolean) => void;
};

export type WindowStyle = {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
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
