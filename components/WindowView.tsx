import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutAnimation,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  UIManager,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import Window from './Window';
import WorkletContext from './WorkletContext';
import { useWindowKit } from './WindowKitProvider';
import {
  clampWindowToBounds,
  mergeHintConfig,
  resolveSnapConfig,
  type CanvasSize,
} from '../utils/geometry';
import {
  snapSpringConfig as defaultSnapSpringConfig,
  windowEnteringAnimation,
  windowExitingAnimation,
} from '../constants/animations';
import { HINT_BEHAVIOR_DEFAULTS } from '../constants/windows';
import useSnapPreview, { type SnapSpringConfig } from '../hooks/useSnapPreview';
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
import { type HintGuide, type SnapCandidate } from '../types/geometry';
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
    snap?: SnapSpringConfig;
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
    state: { windows, activeId, mode, snapEnabled, hintEnabled },
    actions: {
      setWindows,
      focusWindow,
      moveWindow,
      resizeWindow,
      setSnapEnabled,
      setHintEnabled,
    },
  } = useWindowKit<T>();

  const windowsRef = useRef(windows);

  const [canvasSize, setCanvasSize] = useState<CanvasSize | null>(null);
  const [interaction, setInteraction] = useState<WindowInteraction<T>>(null);
  const resolvedSnapConfig = useMemo<SnapConfig>(
    () => resolveSnapConfig(config?.snap, snapEnabled),
    [
      config?.snap?.enabled,
      config?.snap?.distance,
      config?.snap?.overlap,
      config?.snap?.visualPreview,
      snapEnabled,
    ],
  );
  const resolvedHintConfig = useMemo(() => {
    const merged = mergeHintConfig(
      {
        enabled: config?.hint?.enabled ?? HINT_BEHAVIOR_DEFAULTS.enabled,
        distance:
          config?.hint?.distance ??
          resolvedSnapConfig.distance ??
          HINT_BEHAVIOR_DEFAULTS.distance,
        snap: {
          enabled:
            config?.hint?.snap?.enabled ?? HINT_BEHAVIOR_DEFAULTS.snap.enabled,
          distance: config?.hint?.snap?.distance,
          visualPreview:
            config?.hint?.snap?.visualPreview ??
            HINT_BEHAVIOR_DEFAULTS.snap.visualPreview,
        },
      } as HintConfig,
      resolvedSnapConfig,
    );

    const enabled = merged.enabled && hintEnabled;
    return {
      ...merged,
      enabled,
      snap: {
        ...merged.snap,
        enabled: merged.snap.enabled && hintEnabled && snapEnabled,
      },
    };
  }, [
    config?.hint?.enabled,
    config?.hint?.distance,
    config?.hint?.snap?.distance,
    config?.hint?.snap?.enabled,
    config?.hint?.snap?.visualPreview,
    hintEnabled,
    snapEnabled,
    resolvedSnapConfig,
  ]);
  const resolvedAnimations = useMemo(
    () => ({
      entering: animations?.entering ?? windowEnteringAnimation,
      exiting: animations?.exiting ?? windowExitingAnimation,
      snap: animations?.snap ?? defaultSnapSpringConfig,
    }),
    [animations?.entering, animations?.exiting, animations?.snap],
  );
  const sanitizedSnapSpringConfig = useMemo<SnapSpringConfig>(() => {
    const config = resolvedAnimations.snap;
    const next: SnapSpringConfig = {};
    if (config.damping !== undefined) {
      next.damping = config.damping;
    }
    if (config.mass !== undefined) {
      next.mass = config.mass;
    }
    if (config.stiffness !== undefined) {
      next.stiffness = config.stiffness;
    }
    if (config.duration !== undefined) {
      next.duration = config.duration;
    }
    if (config.dampingRatio !== undefined) {
      next.dampingRatio = config.dampingRatio;
    }
    if (config.clamp !== undefined) {
      next.clamp = config.clamp;
    }
    if (config.velocity !== undefined) {
      next.velocity = config.velocity;
    }
    if (config.overshootClamping !== undefined) {
      next.overshootClamping = config.overshootClamping;
    }
    if (config.energyThreshold !== undefined) {
      next.energyThreshold = config.energyThreshold;
    }
    if (config.reduceMotion !== undefined) {
      next.reduceMotion = config.reduceMotion;
    }
    if (config.useNativeDriver !== undefined) {
      next.useNativeDriver = config.useNativeDriver;
    }
    return next;
  }, [resolvedAnimations.snap]);
  const resolvedShadowMode = useMemo(
    () => config?.shadow ?? 'unlocked',
    [config?.shadow],
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

  const windowsSv = useSharedValue<WindowData[]>(windowsWithDefaults);
  const canvasSizeSv = useSharedValue<CanvasSize | null>(canvasSize);
  const snapConfigSv = useSharedValue<SnapConfig>(resolvedSnapConfig);
  const hintConfigSv = useSharedValue(resolvedHintConfig);
  const snapTargetSv = useSharedValue<SnapCandidate | null>(null);
  const hintTargetSv = useSharedValue<SnapCandidate | null>(null);
  const hintGuidesSv = useSharedValue<HintGuide[]>([]);
  const snapSpringConfigSv = useSharedValue<SnapSpringConfig>(
    sanitizedSnapSpringConfig,
  );

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  useEffect(() => {
    windowsSv.value = windowsWithDefaults;
  }, [windowsSv, windowsWithDefaults]);

  useEffect(() => {
    canvasSizeSv.value = canvasSize;
  }, [canvasSize, canvasSizeSv]);

  useEffect(() => {
    snapConfigSv.value = resolvedSnapConfig;
  }, [resolvedSnapConfig, snapConfigSv]);

  useEffect(() => {
    hintConfigSv.value = resolvedHintConfig;
  }, [resolvedHintConfig, hintConfigSv]);

  useEffect(() => {
    if (!resolvedSnapConfig.enabled) {
      snapTargetSv.value = null;
    }
  }, [resolvedSnapConfig.enabled, snapTargetSv]);

  useEffect(() => {
    if (!resolvedHintConfig.enabled) {
      hintTargetSv.value = null;
      hintGuidesSv.value = [];
    }
  }, [hintGuidesSv, hintTargetSv, resolvedHintConfig.enabled]);
  useEffect(() => {
    if (!resolvedHintConfig.snap.enabled) {
      hintTargetSv.value = null;
    }
  }, [hintTargetSv, resolvedHintConfig.snap.enabled]);

  useEffect(() => {
    snapSpringConfigSv.value = sanitizedSnapSpringConfig;
  }, [sanitizedSnapSpringConfig, snapSpringConfigSv]);

  useEffect(() => {
    if (config?.snap?.enabled !== undefined) {
      setSnapEnabled(config.snap.enabled);
    }
    if (config?.hint?.enabled !== undefined) {
      setHintEnabled(config.hint.enabled);
    }
  }, [
    config?.snap?.enabled,
    config?.hint?.enabled,
    setSnapEnabled,
    setHintEnabled,
  ]);

  const clearSnapTarget = useCallback(() => {
    snapTargetSv.value = null;
  }, [snapTargetSv]);
  const clearHintTarget = useCallback(() => {
    hintTargetSv.value = null;
    hintGuidesSv.value = [];
  }, [hintGuidesSv, hintTargetSv]);

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

  const snapPreviewTarget = useDerivedValue(() => {
    const snapTarget = snapTargetSv.value;
    const hintTarget = hintTargetSv.value;
    const snapConfig = snapConfigSv.value;
    const hintConfig = hintConfigSv.value;
    const hintSnapEnabled =
      hintConfig.snap.enabled && hintConfig.enabled && snapConfig.enabled;

    if (snapConfig.visualPreview && snapTarget) {
      return snapTarget;
    }
    if (hintConfig.snap.visualPreview && hintSnapEnabled) {
      return hintTarget;
    }
    return null;
  });

  const { animatedStyle: snapPreviewAnimatedStyle } = useSnapPreview({
    snapTarget: snapPreviewTarget,
    snapSpringConfig: snapSpringConfigSv,
    snapOffset: resolvedStyles.snap.offset,
    snapBorderWidth: resolvedStyles.snap.borderWidth,
  });
  const hintPadding = resolvedStyles.hint.padding;
  const hintThickness = resolvedStyles.hint.thickness;
  const hintColor = resolvedStyles.hint.color;
  const hintDashWidth = resolvedStyles.hint.dashWidth;
  const hintDashGap = resolvedStyles.hint.dashGap;
  const hintDashEnabled =
    hintDashWidth !== undefined &&
    hintDashGap !== undefined &&
    hintDashWidth > 0 &&
    hintDashGap >= 0;
  const hintGuideBaseStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: hintThickness / 2,
      backgroundColor: hintDashEnabled ? 'transparent' : hintColor,
      borderColor: hintColor,
      borderStyle: hintDashEnabled ? 'dashed' : 'solid',
      borderWidth: hintDashEnabled ? hintThickness : 0,
    }),
    [hintColor, hintDashEnabled, hintThickness],
  );
  const horizontalHintStyle = useAnimatedStyle(() => {
    const guide = hintGuidesSv.value.find(
      (item) => item.orientation === 'horizontal',
    );
    if (!guide || !hintConfigSv.value.enabled) {
      return {
        opacity: 0,
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    }
    const start = Math.min(guide.start, guide.end);
    const end = Math.max(guide.start, guide.end);
    const length = Math.max(end - start, 0);

    return {
      opacity: 0.9,
      left: start - hintPadding,
      top: guide.position - hintThickness / 2,
      width: length + hintPadding * 2,
      height: hintThickness,
    };
  }, [hintPadding, hintThickness]);
  const verticalHintStyle = useAnimatedStyle(() => {
    const guide = hintGuidesSv.value.find(
      (item) => item.orientation === 'vertical',
    );
    if (!guide || !hintConfigSv.value.enabled) {
      return {
        opacity: 0,
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    }
    const start = Math.min(guide.start, guide.end);
    const end = Math.max(guide.start, guide.end);
    const length = Math.max(end - start, 0);

    return {
      opacity: 0.9,
      left: guide.position - hintThickness / 2,
      top: start - hintPadding,
      width: hintThickness,
      height: length + hintPadding * 2,
    };
  }, [hintPadding, hintThickness]);
  const snapPreviewEnabled =
    resolvedSnapConfig.visualPreview || resolvedHintConfig.snap.visualPreview;

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
    (
      id: string,
      _type: NonNullable<WindowInteraction<T>>['type'],
      snapTarget?: Pick<SnapCandidate, 'activeId' | 'window'> | null,
      hintTarget?: Pick<SnapCandidate, 'activeId' | 'window'> | null,
    ) => {
      if (!snapEnabled) {
        clearSnapTarget();
        clearHintTarget();
        return;
      }

      const hintSnapEnabled =
        resolvedHintConfig.snap.enabled &&
        resolvedHintConfig.enabled &&
        snapEnabled;
      const target =
        snapTarget ??
        (hintSnapEnabled ? (hintTarget ?? hintTargetSv.value) : null) ??
        snapTargetSv.value;
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
      windowsSv.value = windowsSv.value.map((win) =>
        win.id === id
          ? {
              ...win,
              x: nextWindow.x,
              y: nextWindow.y,
              width: nextWindow.width,
              height: nextWindow.height,
            }
          : win,
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
      snapTargetSv,
      hintTargetSv,
      resolvedHintConfig.enabled,
      resolvedHintConfig.snap.enabled,
      windowsSv,
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

  const workletContextValue = useMemo(
    () => ({
      windows: windowsSv,
      canvasSize: canvasSizeSv,
      snapConfig: snapConfigSv,
      hintConfig: hintConfigSv,
      snapTarget: snapTargetSv,
      hintTarget: hintTargetSv,
      hintGuides: hintGuidesSv,
    }),
    [
      windowsSv,
      canvasSizeSv,
      snapConfigSv,
      hintConfigSv,
      snapTargetSv,
      hintTargetSv,
      hintGuidesSv,
    ],
  );

  return (
    <View style={[viewStyles.container, style]} onLayout={onLayout}>
      <WorkletContext.Provider value={workletContextValue}>
        <View
          style={[
            viewStyles.canvas,
            Platform.OS === 'web' && viewStyles.canvasWeb,
            canvasStyle,
          ]}>
          {windowsWithDefaults.map((win) => (
            <Window
              key={win.id}
              window={win}
              canvasSize={canvasSize}
              isActive={activeId === win.id || interaction?.id === win.id}
              isUnlocked={mode === 'unlocked'}
              shadowEnabled={
                resolvedShadowMode === true
                  ? true
                  : resolvedShadowMode === false
                    ? false
                    : resolvedShadowMode === mode
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
          {resolvedHintConfig.enabled && (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  viewStyles.hintGuide,
                  hintGuideBaseStyle,
                  horizontalHintStyle,
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  viewStyles.hintGuide,
                  hintGuideBaseStyle,
                  verticalHintStyle,
                ]}
              />
            </>
          )}
          {snapPreviewEnabled && (
            <Animated.View
              pointerEvents="none"
              style={[
                viewStyles.snapPreview,
                snapPreviewAnimatedStyle,
                {
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
      </WorkletContext.Provider>
    </View>
  );
}

const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  canvasWeb: {
    overflow: 'hidden',
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
