import {
  type HandleStyle,
  type HeaderStyle,
  type ShadowStyle,
  type ResizeDirection,
  type SnapStyle,
  type WindowStyle,
} from '../types/windows';

type ViewStyleLike = Record<string, unknown>;

export const Colors = {
  background: '#171717',
  windows: {
    defaultBackground: 'rgba(67,67,67,1)',
    borderActive: 'rgba(247,226,166,1.0)',
    borderInactive: 'rgba(255,255,255,1.0)',
    handleActive: 'rgba(247,226,166,0.45)',
    handleInactive: 'rgba(255,255,255,0.25)',
    hintBar: 'rgba(0, 0, 0, 0.25)',
    hintText: '#ffffff',
    overlayBackground: 'rgba(255,255,255,0.12)',
    overlayBorder: 'rgba(255,255,255,0.35)',
    snapPreviewBackground: 'rgba(247,226,166,0.18)',
  },
};

type ResolvedWindowStyle = Omit<
  Required<WindowStyle>,
  'width' | 'height' | 'maxWidth' | 'maxHeight'
> & {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
};

export const WINDOW_STYLE_DEFAULTS: ResolvedWindowStyle = {
  minWidth: 320,
  minHeight: 240,
  borderRadius: 0,
  borderWidth: 3,
  borderColorActive: Colors.windows.borderActive,
  borderColorInactive: Colors.windows.borderInactive,
  backgroundColor: Colors.windows.defaultBackground,
};

export const SHADOW_STYLE_DEFAULTS: Required<ShadowStyle> = {
  boxShadow: '0px 8px 12px rgba(0, 0, 0, 0.3)',
  shadowOpacity: 0.3,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  shadowColor: '#000',
};

export const SNAP_STYLE_DEFAULTS: Required<SnapStyle> = {
  borderWidth: 2,
  borderRadius: WINDOW_STYLE_DEFAULTS.borderRadius,
  borderColor: Colors.windows.borderActive,
  backgroundColor: Colors.windows.snapPreviewBackground,
  offset: 6,
};

export const HANDLE_STYLE_DEFAULTS: Required<HandleStyle> = {
  size: 24,
  borderHitThickness: 12,
  cornerHitSize: 24,
  activeOpacity: 0.25,
  inactiveOpacity: 0,
  backgroundActive: Colors.windows.handleActive,
  backgroundInactive: Colors.windows.handleInactive,
  borderActive: Colors.windows.borderActive,
  borderInactive: Colors.windows.borderInactive,
};

export const HEADER_STYLE_DEFAULTS: Required<HeaderStyle> = {
  backgroundColor: Colors.windows.hintBar,
  textColor: Colors.windows.hintText,
  paddingHorizontal: 10,
  paddingVertical: 6,
  closeButton: {
    size: 26,
    opacity: 0.9,
    color: Colors.windows.hintText,
    style: {
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 14,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: null,
  },
};

export const SNAP_BEHAVIOR_DEFAULTS = {
  distance: 32,
  overlap: 64,
};

export const buildHandleLayouts = (size: number) =>
  [
    {
      key: 'n' as const,
      position: {
        top: -size / 2,
        left: '50%' as const,
        marginLeft: -size / 2,
      },
    },
    {
      key: 's' as const,
      position: {
        bottom: -size / 2,
        left: '50%' as const,
        marginLeft: -size / 2,
      },
    },
    {
      key: 'e' as const,
      position: {
        right: -size / 2,
        top: '50%' as const,
        marginTop: -size / 2,
      },
    },
    {
      key: 'w' as const,
      position: {
        left: -size / 2,
        top: '50%' as const,
        marginTop: -size / 2,
      },
    },
    {
      key: 'ne' as const,
      position: { top: -size / 2, right: -size / 2 },
    },
    {
      key: 'nw' as const,
      position: { top: -size / 2, left: -size / 2 },
    },
    {
      key: 'se' as const,
      position: { bottom: -size / 2, right: -size / 2 },
    },
    {
      key: 'sw' as const,
      position: { bottom: -size / 2, left: -size / 2 },
    },
  ] satisfies { key: ResizeDirection; position: ViewStyleLike }[];

export const buildBorderHitAreas = (
  borderHitThickness: number,
  cornerHitSize: number,
) =>
  [
    {
      key: 'n' as const,
      style: {
        top: -borderHitThickness / 2,
        left: cornerHitSize / 2,
        right: cornerHitSize / 2,
        height: borderHitThickness,
      },
    },
    {
      key: 's' as const,
      style: {
        bottom: -borderHitThickness / 2,
        left: cornerHitSize / 2,
        right: cornerHitSize / 2,
        height: borderHitThickness,
      },
    },
    {
      key: 'e' as const,
      style: {
        right: -borderHitThickness / 2,
        top: cornerHitSize / 2,
        bottom: cornerHitSize / 2,
        width: borderHitThickness,
      },
    },
    {
      key: 'w' as const,
      style: {
        left: -borderHitThickness / 2,
        top: cornerHitSize / 2,
        bottom: cornerHitSize / 2,
        width: borderHitThickness,
      },
    },
    {
      key: 'ne' as const,
      style: {
        top: -cornerHitSize / 2,
        right: -cornerHitSize / 2,
        width: cornerHitSize,
        height: cornerHitSize,
      },
    },
    {
      key: 'nw' as const,
      style: {
        top: -cornerHitSize / 2,
        left: -cornerHitSize / 2,
        width: cornerHitSize,
        height: cornerHitSize,
      },
    },
    {
      key: 'se' as const,
      style: {
        bottom: -cornerHitSize / 2,
        right: -cornerHitSize / 2,
        width: cornerHitSize,
        height: cornerHitSize,
      },
    },
    {
      key: 'sw' as const,
      style: {
        bottom: -cornerHitSize / 2,
        left: -cornerHitSize / 2,
        width: cornerHitSize,
        height: cornerHitSize,
      },
    },
  ] satisfies { key: ResizeDirection; style: ViewStyleLike }[];

export const HANDLE_STYLES = buildHandleLayouts(HANDLE_STYLE_DEFAULTS.size);
export const BORDER_HIT_AREAS = buildBorderHitAreas(
  HANDLE_STYLE_DEFAULTS.borderHitThickness,
  HANDLE_STYLE_DEFAULTS.cornerHitSize,
);
