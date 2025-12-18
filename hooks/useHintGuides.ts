import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeDragHintTarget,
  computeResizeHintTarget,
  mergeHintConfig,
  type CanvasSize,
  type HintGuide,
  type SnapCandidate,
} from '../utils/geometry';
import { type WindowInteraction, type WindowData } from '../types/windows';

type UseHintGuidesParams<T extends WindowData> = {
  interaction: WindowInteraction<T>;
  windows: T[];
  canvasSize?: CanvasSize | null;
  hintConfig: ReturnType<typeof mergeHintConfig>;
};

type UseHintGuidesResult = {
  hintTarget: SnapCandidate | null;
  guides: HintGuide[];
  latestHintTarget: () => SnapCandidate | null;
  clearHintTarget: () => void;
};

function useHintGuides<T extends WindowData>({
  interaction,
  windows,
  canvasSize,
  hintConfig,
}: UseHintGuidesParams<T>): UseHintGuidesResult {
  const [hintTarget, setHintTarget] = useState<SnapCandidate | null>(null);
  const [guides, setGuides] = useState<HintGuide[]>([]);
  const latestHintTargetRef = useRef<SnapCandidate | null>(null);

  const clearHintTarget = useCallback(() => {
    setHintTarget(null);
    setGuides([]);
    latestHintTargetRef.current = null;
  }, []);

  useEffect(() => {
    if (!interaction || !hintConfig.enabled) {
      clearHintTarget();
      return;
    }

    const currentWindow = windows.find((win) => win.id === interaction.id);
    if (!currentWindow) {
      clearHintTarget();
      return;
    }

    const others = windows.filter((win) => win.id !== currentWindow.id);
    const canvasBounds = canvasSize
      ? { width: canvasSize.width, height: canvasSize.height }
      : null;

    const result =
      interaction.type === 'drag'
        ? computeDragHintTarget(currentWindow, others, canvasBounds, hintConfig)
        : computeResizeHintTarget(
            currentWindow,
            others,
            interaction.direction,
            canvasBounds,
            hintConfig,
          );

    setHintTarget(result.target);
    latestHintTargetRef.current = result.target;
    setGuides((prev) => {
      const nextGuides = result.guides.length > 0 ? result.guides : [];
      if (
        prev.length === nextGuides.length &&
        prev.every((guide, index) => guide === nextGuides[index])
      ) {
        return prev;
      }
      return nextGuides;
    });
  }, [canvasSize, clearHintTarget, hintConfig, interaction, windows]);

  const latestHintTarget = useCallback(() => latestHintTargetRef.current, []);

  return {
    hintTarget,
    guides,
    latestHintTarget,
    clearHintTarget,
  };
}

export default useHintGuides;
