import {
  computeDragHintTarget,
  computeDragSnapTarget,
  computeResizeHintTarget,
  computeResizeSnapTarget,
} from './geometry';
import { type SnapConfig } from '../types/config';
import {
  type CanvasSize,
  type SnapCandidate,
  type HintGuide,
} from './geometry';
import {
  type WindowData,
  type ResizeDirection,
  type WindowInteraction,
} from '../types/windows';
import { type mergeHintConfig } from './geometry';

export type WorkletTargets = {
  snapTarget: SnapCandidate | null;
  hintTarget: SnapCandidate | null;
  hintGuides: HintGuide[];
};

export const computeWorkletTargets = (
  activeWindow: WindowData,
  type: NonNullable<WindowInteraction>['type'],
  direction: ResizeDirection | undefined,
  windows: WindowData[],
  canvas: CanvasSize | undefined,
  snapConfig: SnapConfig,
  hintConfig: ReturnType<typeof mergeHintConfig>,
  stickyTo: SnapCandidate | null,
): WorkletTargets => {
  'worklet';
  const others = windows.filter((win) => win.id !== activeWindow.id);
  let snapTarget: SnapCandidate | null = null;
  let hintTarget: SnapCandidate | null = null;
  let hintGuides: HintGuide[] = [];

  if (snapConfig.enabled) {
    if (type === 'drag') {
      snapTarget = computeDragSnapTarget(
        activeWindow,
        others,
        canvas,
        stickyTo,
        snapConfig,
      );
    } else if (direction) {
      snapTarget = computeResizeSnapTarget(
        activeWindow,
        others,
        direction,
        canvas,
        snapConfig,
      );
    }
  }

  const hintSnapEnabled = hintConfig.snap.enabled && snapConfig.enabled;
  if (hintConfig.enabled) {
    if (type === 'drag') {
      const result = computeDragHintTarget(
        activeWindow,
        others,
        canvas ?? null,
        hintConfig,
      );
      hintTarget = hintSnapEnabled ? result.target : null;
      hintGuides = result.guides;
    } else if (direction) {
      const result = computeResizeHintTarget(
        activeWindow,
        others,
        direction,
        canvas ?? null,
        hintConfig,
      );
      hintTarget = hintSnapEnabled ? result.target : null;
      hintGuides = result.guides;
    }
  }

  return { snapTarget, hintTarget, hintGuides };
};
