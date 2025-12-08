import {
  HANDLE_STYLE_DEFAULTS,
  HEADER_STYLE_DEFAULTS,
  SHADOW_STYLE_DEFAULTS,
  SNAP_STYLE_DEFAULTS,
  WINDOW_STYLE_DEFAULTS,
  buildBorderHitAreas,
  buildHandleLayouts,
} from '../constants/windows';
import {
  type HandleStyle,
  type HeaderStyle,
  type ShadowStyle,
  type SnapStyle,
  type WindowData,
  type WindowStyle,
} from '../types/windows';

type ResolvedWindowStyle = typeof WINDOW_STYLE_DEFAULTS &
  Pick<WindowStyle, 'width' | 'height' | 'maxWidth' | 'maxHeight'>;

export type WindowStylesInput = {
  window?: WindowStyle;
  snap?: SnapStyle;
  handle?: HandleStyle;
  header?: HeaderStyle;
  shadow?: ShadowStyle;
};

export type ResolvedWindowStyles = {
  window: typeof WINDOW_STYLE_DEFAULTS;
  snap: typeof SNAP_STYLE_DEFAULTS;
  handle: typeof HANDLE_STYLE_DEFAULTS;
  header: typeof HEADER_STYLE_DEFAULTS;
  shadow: typeof SHADOW_STYLE_DEFAULTS;
  handlesLayout: ReturnType<typeof buildHandleLayouts>;
  borderHitAreas: ReturnType<typeof buildBorderHitAreas>;
};

export type WindowStylesCache = {
  input: WindowStylesInput | undefined;
  resolved: ResolvedWindowStyles;
};

export const shallowEqualWindowStyles = (
  next?: WindowStylesInput,
  prev?: WindowStylesInput,
) => {
  if (next === prev) {
    return true;
  }

  const groups: Array<keyof NonNullable<WindowStylesInput>> = [
    'window',
    'snap',
    'handle',
    'header',
    'shadow',
  ];

  for (const key of groups) {
    const a = next?.[key];
    const b = prev?.[key];
    if (a === b) {
      continue;
    }
    if (!a || !b) {
      return false;
    }

    const keys = Object.keys({ ...a, ...b });
    for (const k of keys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((a as any)[k] !== (b as any)[k]) {
        return false;
      }
    }
  }

  return true;
};

export const resolveWindowStyles = (
  input?: WindowStylesInput,
  cache?: WindowStylesCache | null,
): WindowStylesCache => {
  if (cache && shallowEqualWindowStyles(input, cache.input)) {
    return cache;
  }

  const windowStyle = { ...WINDOW_STYLE_DEFAULTS, ...input?.window };
  const snapStyle = { ...SNAP_STYLE_DEFAULTS, ...input?.snap };
  const handleStyle = { ...HANDLE_STYLE_DEFAULTS, ...input?.handle };
  const headerStyle = { ...HEADER_STYLE_DEFAULTS, ...input?.header };
  const shadowStyle = { ...SHADOW_STYLE_DEFAULTS, ...input?.shadow };
  const resolved: ResolvedWindowStyles = {
    window: windowStyle,
    snap: snapStyle,
    handle: handleStyle,
    header: headerStyle,
    shadow: shadowStyle,
    handlesLayout: buildHandleLayouts(handleStyle.size),
    borderHitAreas: buildBorderHitAreas(
      handleStyle.borderHitThickness,
      handleStyle.cornerHitSize,
    ),
  };

  return { input, resolved };
};

type CacheEntry<T extends WindowData> = {
  input: T;
  normalized: T;
  style: ResolvedWindowStyle;
};

export const createWindowNormalizer = <T extends WindowData>(
  resolvedStyle: ResolvedWindowStyle,
) => {
  const cache = new Map<string, CacheEntry<T>>();

  const stylesEqual = (a: ResolvedWindowStyle, b: ResolvedWindowStyle) => {
    for (const key of Object.keys(a) as Array<keyof ResolvedWindowStyle>) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    return true;
  };

  return (win: T): T => {
    const mergedStyle = {
      ...resolvedStyle,
      ...(win.windowStyle ?? {}),
    };
    const minWidth = mergedStyle.minWidth;
    const minHeight = mergedStyle.minHeight;
    const width = win.width ?? mergedStyle.width ?? minWidth;
    const height = win.height ?? mergedStyle.height ?? minHeight;

    const cached = cache.get(win.id);
    if (
      cached &&
      cached.input === win &&
      stylesEqual(cached.style, mergedStyle) &&
      cached.normalized.width === width &&
      cached.normalized.height === height
    ) {
      return cached.normalized;
    }

    const normalized = {
      ...win,
      windowStyle: mergedStyle,
      width,
      height,
    };
    cache.set(win.id, { input: win, normalized, style: mergedStyle });
    return normalized;
  };
};
