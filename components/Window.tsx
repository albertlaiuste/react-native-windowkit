import { type ReactNode, memo, useCallback, useMemo, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import {
  HANDLE_STYLE_DEFAULTS,
  HEADER_STYLE_DEFAULTS,
  SHADOW_STYLE_DEFAULTS,
  WINDOW_STYLE_DEFAULTS,
  buildBorderHitAreas,
  buildHandleLayouts,
} from '../constants/windows';
import {
  windowEnteringAnimation,
  windowExitingAnimation,
} from '../constants/animations';
import {
  clampWindowToBounds,
  resolveMaxHeight,
  resolveMaxWidth,
  resolveMinHeight,
  resolveMinWidth,
  type CanvasSize,
} from '../utils/geometry';
import {
  type WindowInteraction,
  type WindowData,
  type ResizeDirection,
  type RenderHeaderProps,
} from '../types/windows';
import { type ResolvedWindowStyles } from '../utils/windows';

type WindowProps<T extends WindowData> = {
  window: T;
  canvasSize?: CanvasSize | null;
  isActive: boolean;
  isUnlocked: boolean;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (
    windowData: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>,
  ) => void;
  onRelease: (
    id: T['id'],
    type: NonNullable<WindowInteraction>['type'],
  ) => void;
  onInteractionChange: (interaction: WindowInteraction<T>) => void;
  renderContent: (window: T) => ReactNode;
  renderContentVersion: number;
  renderHeader?: (props: RenderHeaderProps<T>) => ReactNode;
  renderHeaderVersion?: number;
  animations?: {
    entering?: typeof windowEnteringAnimation;
    exiting?: typeof windowExitingAnimation;
  };
  styleConfig?: ResolvedWindowStyles;
  shadowEnabled: boolean;
  headerEnabled: boolean;
  closeButtonEnabled: boolean;
  onClose?: (id: string) => void;
};

function Window<T extends WindowData>({
  window,
  canvasSize,
  isActive,
  isUnlocked,
  onFocus,
  onMove,
  onResize,
  onRelease,
  onInteractionChange,
  renderContent,
  animations,
  styleConfig,
  shadowEnabled,
  headerEnabled,
  closeButtonEnabled,
  onClose,
  renderContentVersion,
  renderHeader,
  renderHeaderVersion,
}: WindowProps<T>) {
  const renderContentFn = useMemo(() => renderContent, [renderContentVersion]);
  const renderHeaderFn = useMemo(() => renderHeader, [renderHeaderVersion]);
  const componentStyles = useMemo(
    () =>
      styleConfig ?? {
        window: WINDOW_STYLE_DEFAULTS,
        handle: HANDLE_STYLE_DEFAULTS,
        header: HEADER_STYLE_DEFAULTS,
        shadow: SHADOW_STYLE_DEFAULTS,
        handlesLayout: buildHandleLayouts(HANDLE_STYLE_DEFAULTS.size),
        borderHitAreas: buildBorderHitAreas(
          HANDLE_STYLE_DEFAULTS.borderHitThickness,
          HANDLE_STYLE_DEFAULTS.cornerHitSize,
        ),
      },
    [styleConfig],
  );
  const mergedWindowStyle = useMemo(
    () => ({
      ...componentStyles.window,
      ...(window.windowStyle ?? {}),
    }),
    [componentStyles.window, window.windowStyle],
  );
  const resolvedWindow = useMemo<WindowData>(() => {
    const minWidth = mergedWindowStyle.minWidth;
    const minHeight = mergedWindowStyle.minHeight;
    const maxWidth = mergedWindowStyle.maxWidth ?? Number.POSITIVE_INFINITY;
    const maxHeight = mergedWindowStyle.maxHeight ?? Number.POSITIVE_INFINITY;
    const width = window.width ?? minWidth;
    const height = window.height ?? minHeight;

    return {
      ...window,
      windowStyle: mergedWindowStyle,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      width,
      height,
    };
  }, [mergedWindowStyle, window]);
  let borderWidth = 0;
  let handleOpacity = componentStyles.handle.inactiveOpacity;
  let borderColor = componentStyles.window.borderColorInactive;
  let handleBackgroundColor = componentStyles.handle.backgroundInactive;
  let handleBorderColor = componentStyles.handle.borderInactive;

  if (isUnlocked) {
    borderWidth = componentStyles.window.borderWidth ?? 0;
    handleOpacity = componentStyles.handle.activeOpacity;
  }

  const shadowStyle = useMemo<ViewStyle>(() => {
    if (!shadowEnabled) {
      return {};
    }

    if (Platform.OS === 'web') {
      return componentStyles.shadow.boxShadow
        ? { boxShadow: componentStyles.shadow.boxShadow }
        : {};
    }

    const { shadowOpacity, shadowRadius, shadowOffset, shadowColor } =
      componentStyles.shadow;
    const nativeShadow: ViewStyle = {};

    if (shadowOpacity !== undefined) {
      nativeShadow.shadowOpacity = shadowOpacity;
    }
    if (shadowRadius !== undefined) {
      nativeShadow.shadowRadius = shadowRadius;
    }
    if (shadowOffset !== undefined) {
      nativeShadow.shadowOffset = shadowOffset;
    }
    if (shadowColor !== undefined) {
      nativeShadow.shadowColor = shadowColor;
    }

    return nativeShadow;
  }, [componentStyles.shadow, shadowEnabled]);

  if (isActive) {
    borderColor = componentStyles.window.borderColorActive;
    handleBackgroundColor = componentStyles.handle.backgroundActive;
    handleBorderColor = componentStyles.handle.borderActive;
  }
  const gestureStart = useRef({
    x: window.x,
    y: window.y,
    width: window.width,
    height: window.height,
  });

  const updateInteraction = useCallback(
    (interaction: WindowInteraction<T>) => {
      onInteractionChange(interaction);
    },
    [onInteractionChange],
  );
  const startInteraction = useCallback(
    (
      interaction: WindowInteraction<T>,
      targetWindow: Pick<WindowData, 'x' | 'y' | 'width' | 'height'>,
    ) => {
      gestureStart.current = {
        x: targetWindow.x,
        y: targetWindow.y,
        width: targetWindow.width,
        height: targetWindow.height,
      };
      onFocus();
      updateInteraction(interaction);
    },
    [onFocus, updateInteraction],
  );

  const applyMove = useCallback(
    (dx: number, dy: number) => {
      const next = clampWindowToBounds(
        {
          ...resolvedWindow,
          x: gestureStart.current.x + dx,
          y: gestureStart.current.y + dy,
        },
        canvasSize ?? undefined,
      );
      onMove(next.x, next.y);
    },
    [canvasSize, onMove, resolvedWindow],
  );

  const applyResize = useCallback(
    (dir: ResizeDirection, dx: number, dy: number) => {
      const start = gestureStart.current;
      let next: WindowData = { ...resolvedWindow, ...start };
      const minWidth = resolveMinWidth(resolvedWindow);
      const minHeight = resolveMinHeight(resolvedWindow);
      const maxWidth = resolveMaxWidth(resolvedWindow, canvasSize ?? undefined);
      const maxHeight = resolveMaxHeight(
        resolvedWindow,
        canvasSize ?? undefined,
      );

      if (dir.includes('e')) {
        next.width = start.width + dx;
      }
      if (dir.includes('s')) {
        next.height = start.height + dy;
      }
      if (dir.includes('w')) {
        next.width = start.width - dx;
        next.x = start.x + dx;
      }
      if (dir.includes('n')) {
        next.height = start.height - dy;
        next.y = start.y + dy;
      }

      if (dir.includes('w')) {
        if (next.width < minWidth) {
          const delta = minWidth - next.width;
          next.width = minWidth;
          next.x -= delta;
        } else if (next.width > maxWidth) {
          const delta = next.width - maxWidth;
          next.width = maxWidth;
          next.x += delta;
        }
      } else if (dir.includes('e')) {
        if (next.width < minWidth) {
          next.width = minWidth;
        } else if (next.width > maxWidth) {
          next.width = maxWidth;
        }
      }

      if (dir.includes('n')) {
        if (next.height < minHeight) {
          const delta = minHeight - next.height;
          next.height = minHeight;
          next.y -= delta;
        } else if (next.height > maxHeight) {
          const delta = next.height - maxHeight;
          next.height = maxHeight;
          next.y += delta;
        }
      } else if (dir.includes('s')) {
        if (next.height < minHeight) {
          next.height = minHeight;
        } else if (next.height > maxHeight) {
          next.height = maxHeight;
        }
      }

      next = clampWindowToBounds(next, canvasSize ?? undefined);
      onResize({
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
      });
    },
    [canvasSize, onResize, resolvedWindow],
  );

  const buildResizeGesture = useCallback(
    (dir: ResizeDirection) =>
      Gesture.Pan()
        .enabled(isUnlocked)
        .onBegin(() => {
          runOnJS(startInteraction)(
            {
              type: 'resize',
              id: resolvedWindow.id,
              direction: dir,
            },
            resolvedWindow,
          );
        })
        .onUpdate((event) => {
          runOnJS(applyResize)(dir, event.translationX, event.translationY);
        })
        .onFinalize(() => {
          runOnJS(updateInteraction)(null);
          runOnJS(onRelease)(resolvedWindow.id, 'resize');
        }),
    [
      applyResize,
      isUnlocked,
      onFocus,
      onRelease,
      updateInteraction,
      startInteraction,
      resolvedWindow.height,
      resolvedWindow.id,
      resolvedWindow.width,
      resolvedWindow.x,
      resolvedWindow.y,
    ],
  );

  const handleGestures = useMemo(
    () =>
      componentStyles.handlesLayout.map((handle) => ({
        ...handle,
        gesture: buildResizeGesture(handle.key as ResizeDirection),
      })),
    [buildResizeGesture, componentStyles.handlesLayout],
  );

  const borderGestures = useMemo(
    () =>
      componentStyles.borderHitAreas.map((area) => ({
        ...area,
        gesture: buildResizeGesture(area.key as ResizeDirection),
      })),
    [buildResizeGesture, componentStyles.borderHitAreas],
  );

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .requireExternalGestureToFail(
          ...handleGestures.map((item) => item.gesture),
          ...borderGestures.map((item) => item.gesture),
        )
        .enabled(isUnlocked)
        .onBegin(() => {
          runOnJS(startInteraction)(
            { type: 'drag', id: resolvedWindow.id },
            resolvedWindow,
          );
        })
        .onUpdate((event) => {
          runOnJS(applyMove)(event.translationX, event.translationY);
        })
        .onFinalize(() => {
          runOnJS(updateInteraction)(null);
          runOnJS(onRelease)(resolvedWindow.id, 'drag');
        }),
    [
      applyMove,
      borderGestures,
      handleGestures,
      isUnlocked,
      onFocus,
      onRelease,
      updateInteraction,
      startInteraction,
      resolvedWindow.height,
      resolvedWindow.id,
      resolvedWindow.width,
      resolvedWindow.x,
      resolvedWindow.y,
    ],
  );

  const entering = animations?.entering ?? windowEnteringAnimation;
  const exiting = animations?.exiting ?? windowExitingAnimation;
  const triggerClose = useCallback(() => {
    onClose?.(resolvedWindow.id);
  }, [onClose, resolvedWindow.id]);
  const onCloseForHeader = useMemo(
    () =>
      onClose
        ? (id: string) => {
            if (id === resolvedWindow.id) {
              triggerClose();
            }
          }
        : undefined,
    [onClose, resolvedWindow.id, triggerClose],
  );
  const closeButtonSize = componentStyles.header.closeButton.size;
  const closeButtonStyle = useMemo<ViewStyle>(
    () => ({
      width: closeButtonSize,
      height: closeButtonSize,
      borderRadius: closeButtonSize ? closeButtonSize / 2 : undefined,
      opacity: componentStyles.header.closeButton.opacity,
      ...(componentStyles.header.closeButton.style ?? {}),
    }),
    [
      closeButtonSize,
      componentStyles.header.closeButton.opacity,
      componentStyles.header.closeButton.style,
    ],
  );

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      style={[
        baseStyles.window,
        {
          backgroundColor:
            mergedWindowStyle.backgroundColor ??
            componentStyles.window.backgroundColor,
          borderColor,
          borderWidth,
          borderRadius: mergedWindowStyle.borderRadius,
          ...shadowStyle,
          zIndex: resolvedWindow.zIndex,
          width: resolvedWindow.width,
          height: resolvedWindow.height,
          left: resolvedWindow.x,
          top: resolvedWindow.y,
        },
      ]}>
      <GestureDetector gesture={dragGesture}>
        <View
          style={[
            baseStyles.fill,
            baseStyles.clip,
            { borderRadius: mergedWindowStyle.borderRadius },
          ]}>
          {renderContentFn(resolvedWindow as T)}

          {headerEnabled &&
            (renderHeaderFn?.({
              window: resolvedWindow as T,
              isActive,
              closeButtonEnabled,
              ...(onCloseForHeader ? { onClose: onCloseForHeader } : {}),
            }) ?? (
              <View
                style={[
                  baseStyles.hintBar,
                  {
                    backgroundColor: componentStyles.header.backgroundColor,
                    borderTopLeftRadius: mergedWindowStyle.borderRadius,
                    borderTopRightRadius: mergedWindowStyle.borderRadius,
                    paddingHorizontal: componentStyles.header.paddingHorizontal,
                    paddingVertical: componentStyles.header.paddingVertical,
                  },
                ]}>
                <View style={baseStyles.headerRow}>
                  <Text
                    style={[
                      baseStyles.hintText,
                      { color: componentStyles.header.textColor },
                    ]}>
                    {window.id}
                  </Text>
                  {closeButtonEnabled && (
                    <Pressable
                      onPress={triggerClose}
                      hitSlop={8}
                      style={[baseStyles.closeButton, closeButtonStyle]}>
                      {componentStyles.header.closeButton.icon ?? (
                        <Text
                          style={[
                            baseStyles.closeIcon,
                            {
                              color:
                                componentStyles.header.closeButton.color ??
                                componentStyles.header.textColor,
                            },
                          ]}>
                          ×
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
        </View>
      </GestureDetector>

      <View
        pointerEvents={isUnlocked ? 'box-none' : 'none'}
        style={baseStyles.handleLayer}>
        {borderGestures.map((hitArea) => (
          <GestureDetector
            key={`border-${hitArea.key}`}
            gesture={hitArea.gesture}>
            <View
              pointerEvents="box-only"
              style={[baseStyles.borderHit, hitArea.style]}
            />
          </GestureDetector>
        ))}
        {handleGestures.map((handle) => (
          <GestureDetector key={handle.key} gesture={handle.gesture}>
            <View
              pointerEvents="box-only"
              style={[
                baseStyles.handle,
                handle.position,
                {
                  opacity: handleOpacity,
                  backgroundColor: handleBackgroundColor,
                  borderColor: handleBorderColor,
                  width: componentStyles.handle.size,
                  height: componentStyles.handle.size,
                  borderRadius: componentStyles.handle.size / 2,
                },
              ]}
            />
          </GestureDetector>
        ))}
      </View>
    </Animated.View>
  );
}

const baseStyles = StyleSheet.create({
  window: {
    position: 'absolute',
    borderRadius: 0,
    shadowColor: '#000',
  },
  fill: {
    flex: 1,
  },
  clip: {
    overflow: 'hidden',
    borderRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  borderHit: {
    position: 'absolute',
  },
  handle: {
    opacity: 0.25,
    position: 'absolute',
    width: 0,
    height: 0,
    borderRadius: 0,
    borderWidth: 1,
  },
  hintBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: '#000',
  },
  hintText: {
    color: '#000',
    fontWeight: '600',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
});

const MemoWindow = memo(
  Window,
  (prev, next) =>
    prev.styleConfig === next.styleConfig &&
    prev.renderContent === next.renderContent &&
    prev.renderContentVersion === next.renderContentVersion &&
    prev.renderHeader === next.renderHeader &&
    prev.renderHeaderVersion === next.renderHeaderVersion &&
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
    prev.window.windowStyle === next.window.windowStyle,
) as typeof Window;

export default MemoWindow;
