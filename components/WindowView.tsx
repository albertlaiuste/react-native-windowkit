import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  LayoutAnimation,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  UIManager,
  View,
  type ViewStyle,
} from 'react-native';
import Window from './Window';
import { useWindowKit } from './WindowKitProvider';
import {
  clampWindowToBounds,
  mergeHintConfig,
  type CanvasSize,
} from '../utils/geometry';
import {
  snapSpringConfig as defaultSnapSpringConfig,
  windowEnteringAnimation,
  windowExitingAnimation,
} from '../constants/animations';
import {
  HINT_BEHAVIOR_DEFAULTS,
  SNAP_BEHAVIOR_DEFAULTS,
} from '../constants/windows';
import useSnapTarget from '../hooks/useSnapTarget';
import useSnapPreview from '../hooks/useSnapPreview';
import useHintGuides from '../hooks/useHintGuides';
import {
  type HandleStyle,
  type HeaderStyle,
  type ShadowStyle,
  type SnapStyle,
  type HintStyle,
  type WindowStyle,
  type WindowInteraction,
  type WindowData,
  type RenderHeaderProps,
} from '../types/windows';
import {
  type WindowKitConfig,
  type SnapConfig,
  type HintConfig,
} from '../types/config';
import {
  createWindowNormalizer,
  resolveWindowStyles,
  type WindowStylesInput,
} from '../utils/windows';

const MAX_HINT_DASH_SEGMENTS = 512;

type WindowViewProps<T extends WindowData> = {
  renderWindowContent: (window: T) => ReactNode;
  renderWindowContentPlaceholder?: ReactNode | (() => ReactNode);
  renderHeader?: (props: RenderHeaderProps<T>) => ReactNode;
  style?: ViewStyle;
  canvasStyle?: ViewStyle;
  onCloseWindow?: (id: string) => void;
  animations?: {
    entering?: typeof windowEnteringAnimation;
    exiting?: typeof windowExitingAnimation;
    snap?: Omit<Animated.SpringAnimationConfig, 'toValue'>;
  };
  config?: WindowKitConfig;
  windowStyles?: {
    window?: WindowStyle;
    snap?: SnapStyle;
    hint?: HintStyle;
    handle?: HandleStyle;
    header?: HeaderStyle;
    shadow?: ShadowStyle;
  };
};

function WindowView<T extends WindowData>({
  renderWindowContent,
  renderWindowContentPlaceholder,
  renderHeader,
  style,
  canvasStyle,
  animations,
  config,
  windowStyles,
  onCloseWindow,
}: WindowViewProps<T>) {
  const {
    state: { windows, activeId, mode, snapEnabled },
    actions: { setWindows, focusWindow, moveWindow, resizeWindow },
  } = useWindowKit<T>();

  const windowsRef = useRef(windows);
  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  const [canvasSize, setCanvasSize] = useState<CanvasSize | null>(null);
  const [interaction, setInteraction] = useState<WindowInteraction<T>>(null);
  const resolvedSnapConfig = useMemo<SnapConfig>(
    () => ({
      distance: config?.snap?.distance ?? SNAP_BEHAVIOR_DEFAULTS.distance,
      overlap: config?.snap?.overlap ?? SNAP_BEHAVIOR_DEFAULTS.overlap,
      visualPreview:
        config?.snap?.visualPreview ?? SNAP_BEHAVIOR_DEFAULTS.visualPreview,
    }),
    [
      config?.snap?.distance,
      config?.snap?.overlap,
      config?.snap?.visualPreview,
    ],
  );
  const resolvedHintConfig = useMemo(
    () =>
      mergeHintConfig(
        {
          enabled: config?.hint?.enabled ?? HINT_BEHAVIOR_DEFAULTS.enabled,
          distance:
            config?.hint?.distance ??
            resolvedSnapConfig.distance ??
            HINT_BEHAVIOR_DEFAULTS.distance,
          snap: {
            enabled:
              config?.hint?.snap?.enabled ??
              HINT_BEHAVIOR_DEFAULTS.snap.enabled,
            distance: config?.hint?.snap?.distance,
            visualPreview:
              config?.hint?.snap?.visualPreview ??
              HINT_BEHAVIOR_DEFAULTS.snap.visualPreview,
          },
        } as HintConfig,
        resolvedSnapConfig,
      ),
    [
      config?.hint?.enabled,
      config?.hint?.distance,
      config?.hint?.snap?.distance,
      config?.hint?.snap?.enabled,
      config?.hint?.snap?.visualPreview,
      resolvedSnapConfig,
    ],
  );
  const resolvedAnimations = useMemo(
    () => ({
      entering: animations?.entering ?? windowEnteringAnimation,
      exiting: animations?.exiting ?? windowExitingAnimation,
      snap: animations?.snap ?? defaultSnapSpringConfig,
    }),
    [animations?.entering, animations?.exiting, animations?.snap],
  );
  const resolvedShadowConfig = useMemo(
    () => ({
      lockedShadow: config?.lockedShadow ?? false,
      unlockedShadow: config?.unlockedShadow ?? true,
    }),
    [config?.lockedShadow, config?.unlockedShadow],
  );
  const resolvedHeaderConfig = useMemo(() => {
    const closeButtonConfig = config?.header?.closeButton;
    let closeButtonEnabled = true;

    if (closeButtonConfig === 'locked') {
      closeButtonEnabled = mode === 'locked';
    } else if (closeButtonConfig === 'unlocked') {
      closeButtonEnabled = mode === 'unlocked';
    } else if (closeButtonConfig !== undefined) {
      closeButtonEnabled = closeButtonConfig;
    }

    return {
      enabled: config?.header?.enabled ?? true,
      closeButton: closeButtonEnabled,
    };
  }, [config?.header?.closeButton, config?.header?.enabled, mode]);
  const stylesCacheRef = useRef<ReturnType<typeof resolveWindowStyles> | null>(
    null,
  );
  const renderContentRef = useRef(renderWindowContent);
  const renderContentVersionRef = useRef(0);
  if (renderContentRef.current !== renderWindowContent) {
    renderContentRef.current = renderWindowContent;
    renderContentVersionRef.current += 1;
  }
  const stableRenderContent = useCallback(
    (win: T) => renderContentRef.current(win),
    [],
  );
  const renderHeaderRef = useRef(renderHeader);
  const renderHeaderVersionRef = useRef(0);
  if (renderHeaderRef.current !== renderHeader) {
    renderHeaderRef.current = renderHeader;
    renderHeaderVersionRef.current += 1;
  }
  const stableRenderHeader = useCallback(
    (props: RenderHeaderProps<T>) => renderHeaderRef.current?.(props),
    [],
  );

  const resolvedStyles = useMemo(() => {
    const cache = resolveWindowStyles(
      windowStyles as WindowStylesInput | undefined,
      stylesCacheRef.current,
    );
    stylesCacheRef.current = cache;
    return cache.resolved;
  }, [windowStyles]);

  const applyWindowStyleDefaults = useMemo(
    () => createWindowNormalizer<T>(resolvedStyles.window),
    [resolvedStyles.window],
  );

  const windowsWithDefaults = useMemo(
    () => windows.map((win) => applyWindowStyleDefaults(win)),
    [applyWindowStyleDefaults, windows],
  );

  const { snapTarget, latestSnapTarget, clearSnapTarget } = useSnapTarget({
    interaction,
    windows: windowsWithDefaults,
    canvasSize,
    snapEnabled,
    snapConfig: resolvedSnapConfig,
  });
  const {
    hintTarget,
    guides: hintGuides,
    latestHintTarget,
    clearHintTarget,
  } = useHintGuides({
    interaction,
    windows: windowsWithDefaults,
    canvasSize,
    hintConfig: resolvedHintConfig,
  });

  useEffect(() => {
    if (mode !== 'unlocked') {
      setInteraction(null);
      clearSnapTarget();
      clearHintTarget();
    }
  }, [mode, clearSnapTarget, clearHintTarget]);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  }, []);

  const hintSnapEnabled = resolvedHintConfig.snap.enabled && snapEnabled;
  const snapPreviewTarget =
    (resolvedSnapConfig.visualPreview && snapTarget) ||
    (resolvedHintConfig.snap.visualPreview && hintSnapEnabled
      ? hintTarget
      : null);

  const { snapAnim, previewTransform } = useSnapPreview({
    snapTarget: snapPreviewTarget,
    snapSpringConfig: resolvedAnimations.snap,
    snapOffset: resolvedStyles.snap.offset,
  });

  const handlerCache = useRef<
    Map<
      string,
      {
        onFocus: () => void;
        onMove: (x: number, y: number) => void;
        onResize: (
          window: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>,
        ) => void;
      }
    >
  >(new Map());

  const getHandlers = useCallback(
    (id: string) => {
      const existing = handlerCache.current.get(id);
      if (existing) {
        return existing;
      }

      const created = {
        onFocus: () => focusWindow(id),
        onMove: (x: number, y: number) => moveWindow(id, x, y),
        onResize: (window: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>) =>
          resizeWindow(id, window),
      };

      handlerCache.current.set(id, created);
      return created;
    },
    [focusWindow, moveWindow, resizeWindow],
  );

  const handleRelease = useCallback(
    (id: string) => {
      if (!snapEnabled) {
        clearSnapTarget();
        clearHintTarget();
        return;
      }

      const target =
        latestSnapTarget() ?? (hintSnapEnabled ? latestHintTarget() : null);
      if (!target || target.activeId !== id) {
        clearSnapTarget();
        clearHintTarget();
        return;
      }

      let canvasDimensions: { width: number; height: number } | undefined;
      if (canvasSize) {
        canvasDimensions = {
          width: canvasSize.width,
          height: canvasSize.height,
        };
      }

      const nextWindow = clampWindowToBounds(
        { ...target.window, id, zIndex: 0 },
        canvasDimensions,
      );

      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          220,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );

      resizeWindow(id, {
        x: nextWindow.x,
        y: nextWindow.y,
        width: nextWindow.width,
        height: nextWindow.height,
      });

      clearSnapTarget();
      clearHintTarget();
    },
    [
      snapEnabled,
      canvasSize,
      resizeWindow,
      clearSnapTarget,
      clearHintTarget,
      latestSnapTarget,
      hintSnapEnabled,
      latestHintTarget,
    ],
  );

  const handleClose = useCallback(
    (id: string) => {
      if (onCloseWindow) {
        onCloseWindow(id);
        return;
      }
      setWindows(windowsRef.current.filter((win) => win.id !== id));
    },
    [onCloseWindow, setWindows],
  );

  let resolvedEmptyState: ReactNode | null = null;
  if (typeof renderWindowContentPlaceholder === 'function') {
    resolvedEmptyState = renderWindowContentPlaceholder();
  } else {
    resolvedEmptyState = renderWindowContentPlaceholder ?? null;
  }

  return (
    <View style={[viewStyles.container, style]} onLayout={onLayout}>
      <View style={[viewStyles.canvas, canvasStyle]}>
        {windowsWithDefaults.map((win) => (
          <Window
            key={win.id}
            window={win}
            canvasSize={canvasSize}
            isActive={activeId === win.id || interaction?.id === win.id}
            isUnlocked={mode === 'unlocked'}
            shadowEnabled={
              mode === 'unlocked'
                ? resolvedShadowConfig.unlockedShadow
                : resolvedShadowConfig.lockedShadow
            }
            headerEnabled={resolvedHeaderConfig.enabled}
            closeButtonEnabled={resolvedHeaderConfig.closeButton}
            onClose={handleClose}
            animations={{
              entering: resolvedAnimations.entering,
              exiting: resolvedAnimations.exiting,
            }}
            styleConfig={resolvedStyles}
            onFocus={getHandlers(win.id).onFocus}
            onMove={getHandlers(win.id).onMove}
            onResize={getHandlers(win.id).onResize}
            onRelease={handleRelease}
            onInteractionChange={setInteraction}
            renderContent={stableRenderContent}
            renderContentVersion={renderContentVersionRef.current}
            renderHeader={stableRenderHeader}
            renderHeaderVersion={renderHeaderVersionRef.current}
          />
        ))}
        {resolvedHintConfig.enabled &&
          hintGuides.flatMap((guide) => {
            const isVertical = guide.orientation === 'vertical';
            const start = Math.min(guide.start, guide.end);
            const end = Math.max(guide.start, guide.end);
            const length = Math.max(end - start, 0);
            const padding = resolvedStyles.hint.padding;
            const thickness = resolvedStyles.hint.thickness;
            const dashWidth = resolvedStyles.hint.dashWidth;
            const dashGap = resolvedStyles.hint.dashGap;
            const dashEnabled =
              dashWidth !== undefined &&
              dashGap !== undefined &&
              dashWidth > 0 &&
              dashGap >= 0;
            const style: ViewStyle = {
              backgroundColor: resolvedStyles.hint.color,
              borderRadius: thickness / 2,
              ...(isVertical
                ? {
                    left: guide.position - thickness / 2,
                    top: start - padding,
                    width: thickness,
                    height: length + padding * 2,
                  }
                : {
                    left: start - padding,
                    top: guide.position - thickness / 2,
                    width: length + padding * 2,
                    height: thickness,
                  }),
            };

            if (!dashEnabled) {
              return (
                <View
                  key={`hint-${guide.orientation}-${guide.position}-${guide.targetIds.join(',')}`}
                  pointerEvents="none"
                  style={[viewStyles.hintGuide, style]}
                />
              );
            }

            if ((dashWidth ?? 0) === 0 && (dashGap ?? 0) === 0) {
              return (
                <View
                  key={`hint-${guide.orientation}-${guide.position}-${guide.targetIds.join(',')}`}
                  pointerEvents="none"
                  style={[viewStyles.hintGuide, style]}
                />
              );
            }

            const dashSegments: ReactNode[] = [];
            const totalLength = length + padding * 2;
            const baseOffset = isVertical ? start - padding : start - padding;
            const step = dashWidth + dashGap;
            if (step <= 0) {
              return (
                <View
                  key={`hint-${guide.orientation}-${guide.position}-${guide.targetIds.join(',')}`}
                  pointerEvents="none"
                  style={[viewStyles.hintGuide, style]}
                />
              );
            }
            const segmentCount = Math.ceil(totalLength / step);
            if (segmentCount > MAX_HINT_DASH_SEGMENTS) {
              return (
                <View
                  key={`hint-${guide.orientation}-${guide.position}-${guide.targetIds.join(',')}`}
                  pointerEvents="none"
                  style={[viewStyles.hintGuide, style]}
                />
              );
            }
            let offset = 0;
            let index = 0;
            while (offset < totalLength) {
              const segmentLength = Math.min(dashWidth, totalLength - offset);
              const segmentStyle: ViewStyle = {
                position: 'absolute',
                backgroundColor: resolvedStyles.hint.color,
                borderRadius: thickness / 2,
                ...(isVertical
                  ? {
                      width: thickness,
                      height: segmentLength,
                      left: guide.position - thickness / 2,
                      top: baseOffset + offset,
                    }
                  : {
                      width: segmentLength,
                      height: thickness,
                      left: baseOffset + offset,
                      top: guide.position - thickness / 2,
                    }),
              };

              dashSegments.push(
                <View
                  key={`hint-${guide.orientation}-${guide.position}-${guide.targetIds.join(',')}-dash-${index}`}
                  pointerEvents="none"
                  style={[viewStyles.hintGuide, segmentStyle]}
                />,
              );

              offset += step;
              index += 1;
            }

            return dashSegments;
          })}
        {snapPreviewTarget && (
          <Animated.View
            pointerEvents={'none'}
            style={[
              viewStyles.snapPreview,
              {
                width: snapPreviewTarget.window.width,
                height: snapPreviewTarget.window.height,
                left: snapPreviewTarget.window.x,
                top: snapPreviewTarget.window.y,
                opacity: snapAnim,
                transform: previewTransform,
                borderRadius: resolvedStyles.snap.borderRadius,
                borderWidth: resolvedStyles.snap.borderWidth,
                borderColor: resolvedStyles.snap.borderColor,
                backgroundColor: resolvedStyles.snap.backgroundColor,
              },
            ]}
          />
        )}
        {windowsWithDefaults.length === 0 && resolvedEmptyState}
      </View>
    </View>
  );
}

const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  snapPreview: {
    position: 'absolute',
    borderStyle: 'dashed',
  },
  hintGuide: {
    position: 'absolute',
    opacity: 0.9,
  },
});

export default WindowView;
