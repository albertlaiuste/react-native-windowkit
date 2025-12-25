import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, type SharedValue } from 'react-native-reanimated';
import {
  clampWindowToBounds,
  resolveMaxHeight,
  resolveMaxWidth,
  resolveMinHeight,
  resolveMinWidth,
  type CanvasSize,
  type SnapCandidate,
} from '@/utils/geometry';
import {
  type ResizeDirection,
  type WindowData,
  type WindowInteraction,
} from '@/types/windows';
import { type StackingContextValue } from '@/components/layouts/stacking/context';

type ResizeGestureParams<T extends WindowData> = {
  windowId: string;
  resolvedWindow: WindowData;
  canvasSize: CanvasSize | null;
  stackingContext: StackingContextValue | null;
  isUnlocked: boolean;
  xSv: SharedValue<number>;
  ySv: SharedValue<number>;
  widthSv: SharedValue<number>;
  heightSv: SharedValue<number>;
  startXSv: SharedValue<number>;
  startYSv: SharedValue<number>;
  startWidthSv: SharedValue<number>;
  startHeightSv: SharedValue<number>;
  onResize: (
    windowData: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>,
  ) => void;
  onRelease: (
    id: string,
    type: NonNullable<WindowInteraction<T>>['type'],
    snapTarget?: Pick<SnapCandidate, 'activeId' | 'window'> | null,
    hintTarget?: Pick<SnapCandidate, 'activeId' | 'window'> | null,
  ) => void;
  startInteraction: (interaction: WindowInteraction<T>) => void;
  updateInteraction: (interaction: WindowInteraction<T>) => void;
  updateSharedWindow: (
    id: string,
    next: Pick<WindowData, 'x' | 'y' | 'width' | 'height'>,
  ) => void;
  updateWorkletTargets: (
    activeWindow: WindowData,
    type: NonNullable<WindowInteraction<T>>['type'],
    direction?: ResizeDirection,
  ) => void;
  findWindowById: (windows: WindowData[], id: string) => WindowData | null;
};

export function createResizeGesture<T extends WindowData>(
  direction: ResizeDirection,
  {
    windowId,
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
  }: ResizeGestureParams<T>,
) {
  return Gesture.Pan()
    .enabled(isUnlocked)
    .onBegin(() => {
      startXSv.value = xSv.value;
      startYSv.value = ySv.value;
      startWidthSv.value = widthSv.value;
      startHeightSv.value = heightSv.value;
      runOnJS(startInteraction)({
        type: 'resize',
        id: windowId,
        direction,
      });
    })
    .onUpdate((event) => {
      const baseWindow =
        findWindowById(stackingContext?.windows.value ?? [], windowId) ??
        resolvedWindow;
      const canvas = stackingContext?.canvasSize.value ?? canvasSize;
      let next: WindowData = {
        ...baseWindow,
        x: startXSv.value,
        y: startYSv.value,
        width: startWidthSv.value,
        height: startHeightSv.value,
      };
      const minWidth = resolveMinWidth(baseWindow);
      const minHeight = resolveMinHeight(baseWindow);
      const maxWidth = resolveMaxWidth(baseWindow, canvas ?? undefined);
      const maxHeight = resolveMaxHeight(baseWindow, canvas ?? undefined);

      if (direction.includes('e')) {
        next.width = startWidthSv.value + event.translationX;
      }
      if (direction.includes('s')) {
        next.height = startHeightSv.value + event.translationY;
      }
      if (direction.includes('w')) {
        next.width = startWidthSv.value - event.translationX;
        next.x = startXSv.value + event.translationX;
      }
      if (direction.includes('n')) {
        next.height = startHeightSv.value - event.translationY;
        next.y = startYSv.value + event.translationY;
      }

      if (direction.includes('w')) {
        if (next.width < minWidth) {
          const delta = minWidth - next.width;
          next.width = minWidth;
          next.x -= delta;
        } else if (next.width > maxWidth) {
          const delta = next.width - maxWidth;
          next.width = maxWidth;
          next.x += delta;
        }
      } else if (direction.includes('e')) {
        if (next.width < minWidth) {
          next.width = minWidth;
        } else if (next.width > maxWidth) {
          next.width = maxWidth;
        }
      }

      if (direction.includes('n')) {
        if (next.height < minHeight) {
          const delta = minHeight - next.height;
          next.height = minHeight;
          next.y -= delta;
        } else if (next.height > maxHeight) {
          const delta = next.height - maxHeight;
          next.height = maxHeight;
          next.y += delta;
        }
      } else if (direction.includes('s')) {
        if (next.height < minHeight) {
          next.height = minHeight;
        } else if (next.height > maxHeight) {
          next.height = maxHeight;
        }
      }

      next = clampWindowToBounds(next, canvas ?? undefined);
      xSv.value = next.x;
      ySv.value = next.y;
      widthSv.value = next.width;
      heightSv.value = next.height;
      updateSharedWindow(windowId, {
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
      });
      updateWorkletTargets(next, 'resize', direction);
    })
    .onFinalize(() => {
      const snapTarget = stackingContext?.snapTarget.value ?? null;
      const hintTarget = stackingContext?.hintTarget.value ?? null;
      const finalTarget =
        snapTarget?.activeId === windowId
          ? snapTarget
          : hintTarget?.activeId === windowId
            ? hintTarget
            : null;
      if (finalTarget) {
        xSv.value = finalTarget.window.x;
        ySv.value = finalTarget.window.y;
        widthSv.value = finalTarget.window.width;
        heightSv.value = finalTarget.window.height;
        updateSharedWindow(windowId, {
          x: finalTarget.window.x,
          y: finalTarget.window.y,
          width: finalTarget.window.width,
          height: finalTarget.window.height,
        });
      }
      runOnJS(updateInteraction)(null);
      runOnJS(onResize)({
        x: finalTarget?.window.x ?? xSv.value,
        y: finalTarget?.window.y ?? ySv.value,
        width: finalTarget?.window.width ?? widthSv.value,
        height: finalTarget?.window.height ?? heightSv.value,
      });
      runOnJS(onRelease)(
        windowId,
        'resize',
        snapTarget
          ? { activeId: snapTarget.activeId, window: snapTarget.window }
          : null,
        hintTarget
          ? { activeId: hintTarget.activeId, window: hintTarget.window }
          : null,
      );
    });
}
