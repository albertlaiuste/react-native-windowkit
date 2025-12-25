import { useCallback, useMemo } from 'react';
import { type CanvasSize, type SnapCandidate } from '@/utils/geometry';
import { computeWorkletTargets } from '@/utils/workletTargets';
import {
  type ResizeDirection,
  type WindowData,
  type WindowInteraction,
} from '@/types/windows';
import { type ResolvedWindowStyles } from '@/utils/windows';
import { type SharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { createResizeGesture } from '@/components/layouts/stacking/gestures/resize';
import { createDragGesture } from '@/components/layouts/stacking/gestures/drag';
import { type StackingContextValue } from '@/components/layouts/stacking/context';

type UseStackingGesturesParams<T extends WindowData> = {
  window: T;
  resolvedWindow: WindowData;
  componentStyles: ResolvedWindowStyles;
  canvasSize: CanvasSize | null;
  isUnlocked: boolean;
  xSv: SharedValue<number>;
  ySv: SharedValue<number>;
  widthSv: SharedValue<number>;
  heightSv: SharedValue<number>;
  startXSv: SharedValue<number>;
  startYSv: SharedValue<number>;
  startWidthSv: SharedValue<number>;
  startHeightSv: SharedValue<number>;
  stackingContext: StackingContextValue | null;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (
    windowData: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>,
  ) => void;
  onRelease: (
    id: T['id'],
    type: NonNullable<WindowInteraction>['type'],
    snapTarget?: Pick<SnapCandidate, 'activeId' | 'window'> | null,
    hintTarget?: Pick<SnapCandidate, 'activeId' | 'window'> | null,
  ) => void;
  onInteractionChange: (interaction: WindowInteraction<T>) => void;
};

export function useStackingGestures<T extends WindowData>({
  window,
  resolvedWindow,
  componentStyles,
  canvasSize,
  isUnlocked,
  xSv,
  ySv,
  widthSv,
  heightSv,
  startXSv,
  startYSv,
  startWidthSv,
  startHeightSv,
  stackingContext,
  onFocus,
  onMove,
  onResize,
  onRelease,
  onInteractionChange,
}: UseStackingGesturesParams<T>) {
  type HandleLayout = ResolvedWindowStyles['handlesLayout'][number];
  type BorderLayout = ResolvedWindowStyles['borderHitAreas'][number];
  type GestureHandle = HandleLayout & {
    gesture: ReturnType<typeof Gesture.Pan>;
  };
  type BorderHandle = BorderLayout & {
    gesture: ReturnType<typeof Gesture.Pan>;
  };
  const updateInteraction = useCallback(
    (interaction: WindowInteraction<T>) => {
      onInteractionChange(interaction);
    },
    [onInteractionChange],
  );
  const startInteraction = useCallback(
    (interaction: WindowInteraction<T>) => {
      onFocus();
      updateInteraction(interaction);
    },
    [onFocus, updateInteraction],
  );

  const findWindowById = useCallback((windows: WindowData[], id: string) => {
    'worklet';
    for (let i = 0; i < windows.length; i += 1) {
      const win = windows[i];
      if (!win) {
        continue;
      }
      if (win.id === id) {
        return win;
      }
    }
    return null;
  }, []);

  const updateWorkletTargets = useCallback(
    (
      activeWindow: WindowData,
      type: NonNullable<WindowInteraction<T>>['type'],
      direction?: ResizeDirection,
    ) => {
      'worklet';
      if (!stackingContext) {
        return;
      }

      const { snapTarget, hintTarget, hintGuides } = computeWorkletTargets(
        activeWindow,
        type,
        direction,
        stackingContext.windows.value,
        stackingContext.canvasSize.value ?? undefined,
        stackingContext.snapConfig.value,
        stackingContext.hintConfig.value,
        stackingContext.snapTarget.value,
      );

      stackingContext.snapTarget.value = snapTarget;
      stackingContext.hintTarget.value = hintTarget;
      stackingContext.hintGuides.value = hintGuides;
    },
    [stackingContext],
  );
  const updateSharedWindow = useCallback(
    (id: string, next: Pick<WindowData, 'x' | 'y' | 'width' | 'height'>) => {
      'worklet';
      if (!stackingContext) {
        return;
      }

      const current = stackingContext.windows.value;
      let changed = false;
      const updated = current.map((win) => {
        if (win.id !== id) {
          return win;
        }
        if (
          win.x === next.x &&
          win.y === next.y &&
          win.width === next.width &&
          win.height === next.height
        ) {
          return win;
        }
        changed = true;
        return { ...win, ...next };
      });

      if (changed) {
        stackingContext.windows.value = updated;
      }
    },
    [stackingContext],
  );

  const buildResizeGesture = useCallback(
    (direction: ResizeDirection) =>
      createResizeGesture(direction, {
        windowId: window.id,
        resolvedWindow,
        canvasSize,
        stackingContext,
        isUnlocked,
        xSv,
        ySv,
        widthSv,
        heightSv,
        startXSv,
        startYSv,
        startWidthSv,
        startHeightSv,
        onResize,
        onRelease,
        startInteraction,
        updateInteraction,
        updateSharedWindow,
        updateWorkletTargets,
        findWindowById,
      }),
    [
      window.id,
      resolvedWindow,
      canvasSize,
      stackingContext,
      isUnlocked,
      xSv,
      ySv,
      widthSv,
      heightSv,
      startXSv,
      startYSv,
      startWidthSv,
      startHeightSv,
      onResize,
      onRelease,
      startInteraction,
      updateInteraction,
      updateSharedWindow,
      updateWorkletTargets,
      findWindowById,
    ],
  );

  const handleGestures = useMemo<GestureHandle[]>(
    () =>
      componentStyles.handlesLayout.map((handle: HandleLayout) => ({
        ...handle,
        gesture: buildResizeGesture(handle.key as ResizeDirection),
      })),
    [buildResizeGesture, componentStyles.handlesLayout],
  );

  const borderGestures = useMemo<BorderHandle[]>(
    () =>
      componentStyles.borderHitAreas.map((area: BorderLayout) => ({
        ...area,
        gesture: buildResizeGesture(area.key as ResizeDirection),
      })),
    [buildResizeGesture, componentStyles.borderHitAreas],
  );

  const dragGesture = useMemo(
    () =>
      createDragGesture({
        windowId: window.id,
        resolvedWindow,
        canvasSize,
        stackingContext,
        isUnlocked,
        xSv,
        ySv,
        widthSv,
        heightSv,
        startXSv,
        startYSv,
        startWidthSv,
        startHeightSv,
        onMove,
        onRelease,
        startInteraction,
        updateInteraction,
        updateSharedWindow,
        updateWorkletTargets,
        findWindowById,
        resizeGestures: handleGestures.map((item) => item.gesture),
        borderGestures: borderGestures.map((item) => item.gesture),
      }),
    [
      window.id,
      resolvedWindow,
      canvasSize,
      stackingContext,
      isUnlocked,
      xSv,
      ySv,
      widthSv,
      heightSv,
      startXSv,
      startYSv,
      startWidthSv,
      startHeightSv,
      onMove,
      onRelease,
      startInteraction,
      updateInteraction,
      updateSharedWindow,
      updateWorkletTargets,
      findWindowById,
      handleGestures,
      borderGestures,
    ],
  );

  return { dragGesture, handleGestures, borderGestures };
}
