import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeDragSnapTarget,
  computeResizeSnapTarget,
  type CanvasSize,
  type SnapCandidate,
} from '../utils/geometry';
import { type SnapConfig } from '../types/config';
import { type WindowInteraction, type WindowData } from '../types/windows';

type UseSnapTargetParams<T extends WindowData> = {
  interaction: WindowInteraction<T>;
  windows: T[];
  canvasSize?: CanvasSize | null;
  snapEnabled: boolean;
  snapConfig: SnapConfig;
};

type UseSnapTargetResult = {
  snapTarget: SnapCandidate | null;
  latestSnapTarget: () => SnapCandidate | null;
  clearSnapTarget: () => void;
};

function useSnapTarget<T extends WindowData>({
  interaction,
  windows,
  canvasSize,
  snapEnabled,
  snapConfig,
}: UseSnapTargetParams<T>): UseSnapTargetResult {
  const [snapTarget, setSnapTarget] = useState<SnapCandidate | null>(null);
  const latestSnapTargetRef = useRef<SnapCandidate | null>(null);

  const canvasBounds = useMemo(
    () =>
      canvasSize
        ? { width: canvasSize.width, height: canvasSize.height }
        : undefined,
    [canvasSize?.height, canvasSize?.width],
  );

  const clearSnapTarget = useCallback(() => {
    setSnapTarget(null);
    latestSnapTargetRef.current = null;
  }, []);

  useEffect(() => {
    if (!interaction || !snapEnabled) {
      clearSnapTarget();
      return;
    }

    const currentWindow = windows.find((win) => win.id === interaction.id);
    if (!currentWindow) {
      clearSnapTarget();
      return;
    }

    const others = windows.filter((win) => win.id !== currentWindow.id);

    let candidate: SnapCandidate | null;

    if (interaction.type === 'drag') {
      candidate = computeDragSnapTarget(
        currentWindow,
        others,
        canvasBounds,
        latestSnapTargetRef.current,
        snapConfig,
      );
    } else {
      candidate = computeResizeSnapTarget(
        currentWindow,
        others,
        interaction.direction,
        canvasBounds,
        snapConfig,
      );
    }

    setSnapTarget(candidate);
    latestSnapTargetRef.current = candidate;
  }, [
    interaction,
    windows,
    canvasBounds,
    snapEnabled,
    snapConfig,
    clearSnapTarget,
  ]);

  const latestSnapTarget = useCallback(() => latestSnapTargetRef.current, []);

  return {
    snapTarget,
    latestSnapTarget,
    clearSnapTarget,
  };
}

export default useSnapTarget;
