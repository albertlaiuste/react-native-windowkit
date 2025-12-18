import {
  SNAP_BEHAVIOR_DEFAULTS,
  WINDOW_STYLE_DEFAULTS,
  HINT_BEHAVIOR_DEFAULTS,
} from '../constants/windows';
import {
  type HintConfig,
  type HintSnapConfig,
  type SnapConfig,
} from '../types/config';
import {
  type CanvasSize,
  type SnapEdge,
  type SnapCandidate,
  type HintGuide,
} from '../types/geometry';
import { type ResizeDirection, type WindowData } from '../types/windows';

type Edges = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const defaultSnapConfig: SnapConfig = {
  distance: SNAP_BEHAVIOR_DEFAULTS.distance,
  overlap: SNAP_BEHAVIOR_DEFAULTS.overlap,
  visualPreview: SNAP_BEHAVIOR_DEFAULTS.visualPreview,
};

const defaultHintSnapConfig: Required<HintSnapConfig> = {
  enabled: HINT_BEHAVIOR_DEFAULTS.snap.enabled,
  distance: HINT_BEHAVIOR_DEFAULTS.snap.distance,
  visualPreview: HINT_BEHAVIOR_DEFAULTS.snap.visualPreview,
};

const windowStyleFor = (window: WindowData) => ({
  ...WINDOW_STYLE_DEFAULTS,
  ...(window.windowStyle ?? {}),
});

export const resolveMinWidth = (window: WindowData) =>
  windowStyleFor(window).minWidth;

export const resolveMinHeight = (window: WindowData) =>
  windowStyleFor(window).minHeight;

export const resolveMaxWidth = (window: WindowData, canvas?: CanvasSize) => {
  const canvasLimit = canvas ? canvas.width : Number.POSITIVE_INFINITY;
  const custom = windowStyleFor(window).maxWidth ?? Number.POSITIVE_INFINITY;
  return Math.min(custom, canvasLimit);
};

export const resolveMaxHeight = (window: WindowData, canvas?: CanvasSize) => {
  const canvasLimit = canvas ? canvas.height : Number.POSITIVE_INFINITY;
  const custom = windowStyleFor(window).maxHeight ?? Number.POSITIVE_INFINITY;
  return Math.min(custom, canvasLimit);
};

const mergeSnapConfig = (config: SnapConfig = defaultSnapConfig) => ({
  distance: config.distance ?? defaultSnapConfig.distance,
  overlap: config.overlap ?? defaultSnapConfig.overlap,
  visualPreview: config.visualPreview ?? defaultSnapConfig.visualPreview,
});

export const mergeHintConfig = (
  hint: HintConfig = { enabled: HINT_BEHAVIOR_DEFAULTS.enabled },
  snap: SnapConfig = defaultSnapConfig,
) => ({
  enabled: hint.enabled ?? HINT_BEHAVIOR_DEFAULTS.enabled,
  distance: hint.distance ?? snap.distance ?? HINT_BEHAVIOR_DEFAULTS.distance,
  snap: {
    enabled: hint.snap?.enabled ?? defaultHintSnapConfig.enabled ?? true,
    distance:
      hint.snap?.distance ?? snap.distance ?? defaultHintSnapConfig.distance,
    visualPreview:
      hint.snap?.visualPreview ??
      snap.visualPreview ??
      defaultHintSnapConfig.visualPreview,
  },
});

const pickBestSnap = (candidates: SnapCandidate[]) =>
  candidates.reduce<SnapCandidate | null>((closest, next) => {
    if (!closest || next.distance < closest.distance) {
      return next;
    }
    return closest;
  }, null);

const mergeTargets = (
  horizontal: SnapCandidate | null,
  vertical: SnapCandidate | null,
  combineWindows: (
    horizontal: SnapCandidate,
    vertical: SnapCandidate,
  ) => WindowData,
): SnapCandidate | null => {
  if (!horizontal || !vertical) {
    return null;
  }

  const edges = Array.from(new Set([...horizontal.edges, ...vertical.edges]));
  const targetIds = Array.from(
    new Set([...horizontal.targetIds, ...vertical.targetIds]),
  );

  return {
    activeId: horizontal.activeId,
    targetIds,
    edges,
    window: combineWindows(horizontal, vertical),
    distance: horizontal.distance + vertical.distance,
  };
};

const buildSnapCandidate = (
  active: WindowData,
  edge: SnapEdge,
  window: WindowData,
  targetId: string,
  distance: number,
  canvas?: CanvasSize,
): SnapCandidate => ({
  activeId: active.id,
  targetIds: [targetId],
  edges: [edge],
  window: clampWindowToBounds(window, canvas),
  distance,
});

const windowEdges = (window: WindowData): Edges => ({
  left: window.x,
  right: window.x + window.width,
  top: window.y,
  bottom: window.y + window.height,
});

const canvasToWindow = (canvas?: CanvasSize | null): WindowData | null =>
  canvas
    ? {
        id: '__canvas__',
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
        zIndex: 0,
      }
    : null;

type AxisCandidate = {
  window: WindowData;
  guide: HintGuide;
  edge: SnapEdge;
  distance: number;
  targetIds: string[];
};

const buildGuide = (
  activeId: string,
  targetId: string,
  orientation: HintGuide['orientation'],
  position: number,
  activeEdges: Edges,
  targetEdges: Edges,
  edge: SnapEdge,
): HintGuide => {
  const isVertical = orientation === 'vertical';
  return {
    activeId,
    targetIds: [targetId],
    orientation,
    position,
    start: isVertical
      ? Math.min(activeEdges.top, targetEdges.top)
      : Math.min(activeEdges.left, targetEdges.left),
    end: isVertical
      ? Math.max(activeEdges.bottom, targetEdges.bottom)
      : Math.max(activeEdges.right, targetEdges.right),
    edge,
  };
};

const computeOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) => Math.min(endA, endB) - Math.max(startA, startB);

const computeGap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) => Math.max(startB - endA, startA - endB, 0);

const pickBestAxisCandidate = (
  current: AxisCandidate | null,
  next: AxisCandidate,
) => {
  if (!current || next.distance < current.distance) {
    return next;
  }
  return current;
};

const withinSnapThreshold = (
  overlap: number,
  gap: number,
  snapOverlap: number,
  snapDistance: number,
) => overlap > snapOverlap || gap <= snapDistance;

const selectBestTarget = (
  horizontalCandidates: SnapCandidate[],
  verticalCandidates: SnapCandidate[],
  combineWindows: (
    horizontal: SnapCandidate,
    vertical: SnapCandidate,
  ) => WindowData,
  canvas?: CanvasSize,
) => {
  const closestHorizontal = pickBestSnap(horizontalCandidates);
  const closestVertical = pickBestSnap(verticalCandidates);
  const combined = mergeTargets(
    closestHorizontal,
    closestVertical,
    (horizontal, vertical) =>
      clampWindowToBounds(combineWindows(horizontal, vertical), canvas),
  );
  const closestSingle = pickBestSnap([
    ...horizontalCandidates,
    ...verticalCandidates,
  ]);

  return combined ?? closestSingle;
};

const combineHintTargets = (
  active: WindowData,
  horizontal: AxisCandidate | null,
  vertical: AxisCandidate | null,
  canvas?: CanvasSize,
): SnapCandidate | null => {
  if (!horizontal && !vertical) {
    return null;
  }

  const targetIds = Array.from(
    new Set([...(horizontal?.targetIds ?? []), ...(vertical?.targetIds ?? [])]),
  );
  const window = clampWindowToBounds(
    {
      ...active,
      ...(horizontal
        ? { x: horizontal.window.x, width: horizontal.window.width }
        : {}),
      ...(vertical
        ? { y: vertical.window.y, height: vertical.window.height }
        : {}),
    },
    canvas,
  );
  const distance = (horizontal?.distance ?? 0) + (vertical?.distance ?? 0);

  return {
    activeId: active.id,
    targetIds,
    edges: [
      ...(horizontal ? [horizontal.edge] : []),
      ...(vertical ? [vertical.edge] : []),
    ],
    window,
    distance: distance || horizontal?.distance || vertical?.distance || 0,
  };
};

export const clampWindowToBounds = (
  window: WindowData,
  canvas?: CanvasSize,
): WindowData => {
  const minWidth = resolveMinWidth(window);
  const minHeight = resolveMinHeight(window);
  const maxWidth = resolveMaxWidth(window, canvas);
  const maxHeight = resolveMaxHeight(window, canvas);

  let width = Math.min(Math.max(minWidth, window.width), maxWidth);
  let height = Math.min(Math.max(minHeight, window.height), maxHeight);

  if (canvas) {
    width = Math.min(width, canvas.width);
    height = Math.min(height, canvas.height);
  }

  let maxX: number | undefined;
  let maxY: number | undefined;

  if (canvas) {
    maxX = Math.max(canvas.width - width, 0);
    maxY = Math.max(canvas.height - height, 0);
  }

  const x = Math.min(Math.max(0, window.x), maxX ?? window.x);
  const y = Math.min(Math.max(0, window.y), maxY ?? window.y);

  if (canvas) {
    width = Math.min(width, canvas.width - x, maxWidth);
    height = Math.min(height, canvas.height - y, maxHeight);
  }

  return {
    ...window,
    x,
    y,
    width: Math.max(width, 0),
    height: Math.max(height, 0),
  };
};

const buildHintAxisCandidates = (
  active: WindowData,
  target: WindowData,
  canvas: CanvasSize | null | undefined,
  limitDistance: number,
): {
  horizontal: AxisCandidate | null;
  vertical: AxisCandidate | null;
} => {
  const activeEdges = windowEdges(active);
  const targetEdges = windowEdges(target);
  const activeCenterX = (activeEdges.left + activeEdges.right) / 2;
  const targetCenterX = (targetEdges.left + targetEdges.right) / 2;
  const activeCenterY = (activeEdges.top + activeEdges.bottom) / 2;
  const targetCenterY = (targetEdges.top + targetEdges.bottom) / 2;

  let horizontal: AxisCandidate | null = null;
  let vertical: AxisCandidate | null = null;

  const considerHorizontal = (
    edge: Extract<SnapEdge, 'left' | 'right' | 'centerX'>,
    targetEdge: number,
  ) => {
    const activePosition =
      edge === 'left'
        ? activeEdges.left
        : edge === 'right'
          ? activeEdges.right
          : activeCenterX;
    const distance = Math.abs(activePosition - targetEdge);
    if (distance > limitDistance) {
      return;
    }

    let x = active.x;
    if (edge === 'left') {
      x = targetEdge;
    } else if (edge === 'right') {
      x = targetEdge - active.width;
    } else {
      x = targetEdge - active.width / 2;
    }

    const candidate: AxisCandidate = {
      window: clampWindowToBounds({ ...active, x }, canvas ?? undefined),
      guide: buildGuide(
        active.id,
        target.id,
        'vertical',
        targetEdge,
        activeEdges,
        targetEdges,
        edge,
      ),
      edge,
      targetIds: [target.id],
      distance,
    };

    horizontal = pickBestAxisCandidate(horizontal, candidate);
  };

  const considerVertical = (
    edge: Extract<SnapEdge, 'top' | 'bottom' | 'centerY'>,
    targetEdge: number,
  ) => {
    const activePosition =
      edge === 'top'
        ? activeEdges.top
        : edge === 'bottom'
          ? activeEdges.bottom
          : activeCenterY;
    const distance = Math.abs(activePosition - targetEdge);
    if (distance > limitDistance) {
      return;
    }

    let y = active.y;
    if (edge === 'top') {
      y = targetEdge;
    } else if (edge === 'bottom') {
      y = targetEdge - active.height;
    } else {
      y = targetEdge - active.height / 2;
    }

    const candidate: AxisCandidate = {
      window: clampWindowToBounds({ ...active, y }, canvas ?? undefined),
      guide: buildGuide(
        active.id,
        target.id,
        'horizontal',
        targetEdge,
        activeEdges,
        targetEdges,
        edge,
      ),
      edge,
      targetIds: [target.id],
      distance,
    };

    vertical = pickBestAxisCandidate(vertical, candidate);
  };

  considerHorizontal('left', targetEdges.left);
  considerHorizontal('left', targetEdges.right);
  considerHorizontal('right', targetEdges.left);
  considerHorizontal('right', targetEdges.right);
  considerHorizontal('centerX', targetCenterX);

  considerVertical('top', targetEdges.top);
  considerVertical('top', targetEdges.bottom);
  considerVertical('bottom', targetEdges.top);
  considerVertical('bottom', targetEdges.bottom);
  considerVertical('centerY', targetCenterY);

  return { horizontal, vertical };
};

export const computeDragHintTarget = (
  active: WindowData,
  others: WindowData[],
  canvas: CanvasSize | null | undefined,
  hintConfig: ReturnType<typeof mergeHintConfig>,
): { target: SnapCandidate | null; guides: HintGuide[] } => {
  const hintDistance = hintConfig.distance;
  const snapDistance = hintConfig.snap.distance ?? hintDistance;
  const canvasWindow = canvasToWindow(canvas);
  const targets = canvasWindow ? [...others, canvasWindow] : others;

  let guideHorizontal: AxisCandidate | null = null;
  let guideVertical: AxisCandidate | null = null;
  let snapHorizontal: AxisCandidate | null = null;
  let snapVertical: AxisCandidate | null = null;

  targets.forEach((target) => {
    if (target.id === active.id) {
      return;
    }

    const guideCandidates = buildHintAxisCandidates(
      active,
      target,
      canvas,
      hintDistance,
    );
    const snapCandidates = buildHintAxisCandidates(
      active,
      target,
      canvas,
      snapDistance,
    );
    if (guideCandidates.horizontal) {
      guideHorizontal = pickBestAxisCandidate(
        guideHorizontal,
        guideCandidates.horizontal,
      );
    }
    if (guideCandidates.vertical) {
      guideVertical = pickBestAxisCandidate(
        guideVertical,
        guideCandidates.vertical,
      );
    }
    if (snapCandidates.horizontal) {
      snapHorizontal = pickBestAxisCandidate(
        snapHorizontal,
        snapCandidates.horizontal,
      );
    }
    if (snapCandidates.vertical) {
      snapVertical = pickBestAxisCandidate(
        snapVertical,
        snapCandidates.vertical,
      );
    }
  });

  const guides: HintGuide[] = [];
  const horizontalGuide = (guideHorizontal as AxisCandidate | null)?.guide;
  if (horizontalGuide) {
    guides.push(horizontalGuide);
  }
  const verticalGuide = (guideVertical as AxisCandidate | null)?.guide;
  if (verticalGuide) {
    guides.push(verticalGuide);
  }

  return {
    target: combineHintTargets(
      active,
      snapHorizontal,
      snapVertical,
      canvas ?? undefined,
    ),
    guides,
  };
};

export const computeDragSnapTarget = (
  active: WindowData,
  others: WindowData[],
  canvas?: CanvasSize,
  stickyTo?: SnapCandidate | null,
  config: SnapConfig = defaultSnapConfig,
): SnapCandidate | null => {
  const { distance: snapDistance, overlap: snapOverlap } =
    mergeSnapConfig(config);
  const activeEdges = windowEdges(active);

  const horizontalCandidates: SnapCandidate[] = [];
  const verticalCandidates: SnapCandidate[] = [];

  const consider = (
    edge: SnapEdge,
    distance: number,
    window: WindowData,
    targetId: string,
  ) => {
    const target = buildSnapCandidate(
      active,
      edge,
      window,
      targetId,
      distance,
      canvas,
    );
    const destination =
      edge === 'left' || edge === 'right'
        ? horizontalCandidates
        : verticalCandidates;
    destination.push(target);
  };

  others.forEach((other) => {
    if (other.id === active.id) {
      return;
    }

    const otherEdges = windowEdges(other);

    const verticalOverlap = computeOverlap(
      activeEdges.top,
      activeEdges.bottom,
      otherEdges.top,
      otherEdges.bottom,
    );
    const verticalGap = computeGap(
      activeEdges.top,
      activeEdges.bottom,
      otherEdges.top,
      otherEdges.bottom,
    );
    const horizontalOverlap = computeOverlap(
      activeEdges.left,
      activeEdges.right,
      otherEdges.left,
      otherEdges.right,
    );
    const horizontalGap = computeGap(
      activeEdges.left,
      activeEdges.right,
      otherEdges.left,
      otherEdges.right,
    );

    const verticallyAligned = withinSnapThreshold(
      verticalOverlap,
      verticalGap,
      snapOverlap,
      snapDistance,
    );
    const horizontallyAligned = withinSnapThreshold(
      horizontalOverlap,
      horizontalGap,
      snapOverlap,
      snapDistance,
    );

    if (verticallyAligned) {
      const distanceToRight = Math.abs(otherEdges.left - activeEdges.right);
      const distanceToSameRight = Math.abs(
        otherEdges.right - activeEdges.right,
      );
      if (distanceToRight <= snapDistance) {
        consider(
          'right',
          distanceToRight,
          {
            ...active,
            x: otherEdges.left - active.width,
            y: active.y,
          },
          other.id,
        );
      }

      if (distanceToSameRight <= snapDistance) {
        consider(
          'right',
          distanceToSameRight,
          {
            ...active,
            x: otherEdges.right - active.width,
            y: active.y,
          },
          other.id,
        );
      }

      const distanceToLeft = Math.abs(activeEdges.left - otherEdges.right);
      const distanceToSameLeft = Math.abs(activeEdges.left - otherEdges.left);
      if (distanceToLeft <= snapDistance) {
        consider(
          'left',
          distanceToLeft,
          {
            ...active,
            x: otherEdges.right,
            y: active.y,
          },
          other.id,
        );
      }

      if (distanceToSameLeft <= snapDistance) {
        consider(
          'left',
          distanceToSameLeft,
          {
            ...active,
            x: otherEdges.left,
            y: active.y,
          },
          other.id,
        );
      }
    }

    if (horizontallyAligned) {
      const distanceToBottom = Math.abs(activeEdges.top - otherEdges.bottom);
      const distanceToSameBottom = Math.abs(
        activeEdges.bottom - otherEdges.bottom,
      );
      if (distanceToBottom <= snapDistance) {
        consider(
          'top',
          distanceToBottom,
          {
            ...active,
            y: otherEdges.bottom,
            x: active.x,
          },
          other.id,
        );
      }

      const distanceToTop = Math.abs(otherEdges.top - activeEdges.bottom);
      const distanceToSameTop = Math.abs(activeEdges.top - otherEdges.top);
      if (distanceToTop <= snapDistance) {
        consider(
          'bottom',
          distanceToTop,
          {
            ...active,
            y: otherEdges.top - active.height,
            x: active.x,
          },
          other.id,
        );
      }

      if (distanceToSameBottom <= snapDistance) {
        consider(
          'bottom',
          distanceToSameBottom,
          {
            ...active,
            y: otherEdges.bottom - active.height,
            x: active.x,
          },
          other.id,
        );
      }

      if (distanceToSameTop <= snapDistance) {
        consider(
          'top',
          distanceToSameTop,
          {
            ...active,
            y: otherEdges.top,
            x: active.x,
          },
          other.id,
        );
      }
    }
  });

  const candidate = selectBestTarget(
    horizontalCandidates,
    verticalCandidates,
    (horizontal, vertical) => ({
      ...active,
      x: horizontal.window.x,
      y: vertical.window.y,
      width: horizontal.window.width,
      height: vertical.window.height,
      id: active.id,
      zIndex: active.zIndex,
    }),
    canvas,
  );

  if (!candidate && stickyTo && stickyTo.activeId === active.id) {
    const stickyEdges = windowEdges(stickyTo.window);
    const withinSticky = stickyTo.edges.every(
      (edge) =>
        (edge === 'left' &&
          Math.abs(activeEdges.left - stickyEdges.left) <= snapDistance) ||
        (edge === 'right' &&
          Math.abs(activeEdges.right - stickyEdges.right) <= snapDistance) ||
        (edge === 'top' &&
          Math.abs(activeEdges.top - stickyEdges.top) <= snapDistance) ||
        (edge === 'bottom' &&
          Math.abs(activeEdges.bottom - stickyEdges.bottom) <= snapDistance),
    );

    if (withinSticky) {
      return stickyTo;
    }
  }

  return candidate;
};

export const computeResizeSnapTarget = (
  active: WindowData,
  others: WindowData[],
  direction: ResizeDirection,
  canvas?: CanvasSize,
  config: SnapConfig = defaultSnapConfig,
): SnapCandidate | null => {
  const { distance: snapDistance, overlap: snapOverlap } =
    mergeSnapConfig(config);
  const activeEdges = windowEdges(active);

  const movesTop =
    direction === 'n' || direction === 'ne' || direction === 'nw';
  const movesBottom =
    direction === 's' || direction === 'se' || direction === 'sw';
  const movesRight =
    direction === 'e' || direction === 'ne' || direction === 'se';
  const movesLeft =
    direction === 'w' || direction === 'nw' || direction === 'sw';

  const horizontalCandidates: SnapCandidate[] = [];
  const verticalCandidates: SnapCandidate[] = [];

  const addHorizontal = (
    edge: Extract<SnapEdge, 'left' | 'right'>,
    targetEdge: number,
    distance: number,
    targetId: string,
  ) => {
    let nextWindow: WindowData;
    if (edge === 'right') {
      nextWindow = clampWindowToBounds(
        { ...active, width: targetEdge - active.x },
        canvas,
      );
    } else {
      nextWindow = clampWindowToBounds(
        {
          ...active,
          x: targetEdge,
          width: activeEdges.right - targetEdge,
        },
        canvas,
      );
    }

    horizontalCandidates.push({
      activeId: active.id,
      targetIds: [targetId],
      edges: [edge],
      window: nextWindow,
      distance,
    });
  };

  const addVertical = (
    edge: Extract<SnapEdge, 'top' | 'bottom'>,
    targetEdge: number,
    distance: number,
    targetId: string,
  ) => {
    let nextWindow: WindowData;
    if (edge === 'bottom') {
      nextWindow = clampWindowToBounds(
        { ...active, height: targetEdge - active.y },
        canvas,
      );
    } else {
      nextWindow = clampWindowToBounds(
        {
          ...active,
          y: targetEdge,
          height: activeEdges.bottom - targetEdge,
        },
        canvas,
      );
    }

    verticalCandidates.push({
      activeId: active.id,
      targetIds: [targetId],
      edges: [edge],
      window: nextWindow,
      distance,
    });
  };

  others.forEach((other) => {
    if (other.id === active.id) {
      return;
    }

    const otherEdges = windowEdges(other);

    const verticalOverlap = computeOverlap(
      activeEdges.top,
      activeEdges.bottom,
      otherEdges.top,
      otherEdges.bottom,
    );
    const verticalGap = computeGap(
      activeEdges.top,
      activeEdges.bottom,
      otherEdges.top,
      otherEdges.bottom,
    );
    const horizontalOverlap = computeOverlap(
      activeEdges.left,
      activeEdges.right,
      otherEdges.left,
      otherEdges.right,
    );
    const horizontalGap = computeGap(
      activeEdges.left,
      activeEdges.right,
      otherEdges.left,
      otherEdges.right,
    );

    const verticallyAligned = withinSnapThreshold(
      verticalOverlap,
      verticalGap,
      snapOverlap,
      snapDistance,
    );
    const horizontallyAligned = withinSnapThreshold(
      horizontalOverlap,
      horizontalGap,
      snapOverlap,
      snapDistance,
    );

    if ((movesRight || movesLeft) && verticallyAligned) {
      const distanceToLeft = Math.abs(otherEdges.left - activeEdges.right);
      const distanceToRight = Math.abs(otherEdges.right - activeEdges.right);
      const distanceFromLeft = Math.abs(activeEdges.left - otherEdges.left);
      const distanceFromRight = Math.abs(activeEdges.left - otherEdges.right);

      if (movesRight && movesLeft) {
        if (distanceToLeft <= snapDistance) {
          addHorizontal('right', otherEdges.left, distanceToLeft, other.id);
        }
        if (distanceToRight <= snapDistance) {
          addHorizontal('right', otherEdges.right, distanceToRight, other.id);
        }
        if (distanceFromLeft <= snapDistance) {
          addHorizontal('left', otherEdges.left, distanceFromLeft, other.id);
        }
        if (distanceFromRight <= snapDistance) {
          addHorizontal('left', otherEdges.right, distanceFromRight, other.id);
        }
      } else if (movesRight) {
        if (distanceToLeft <= snapDistance) {
          addHorizontal('right', otherEdges.left, distanceToLeft, other.id);
        }
        if (distanceToRight <= snapDistance) {
          addHorizontal('right', otherEdges.right, distanceToRight, other.id);
        }
      } else if (movesLeft) {
        if (distanceFromLeft <= snapDistance) {
          addHorizontal('left', otherEdges.left, distanceFromLeft, other.id);
        }
        if (distanceFromRight <= snapDistance) {
          addHorizontal('left', otherEdges.right, distanceFromRight, other.id);
        }
      }
    }

    if ((movesTop || movesBottom) && horizontallyAligned) {
      const distanceToTop = Math.abs(otherEdges.top - activeEdges.bottom);
      const distanceToBottom = Math.abs(otherEdges.bottom - activeEdges.bottom);
      const distanceFromTop = Math.abs(activeEdges.top - otherEdges.top);
      const distanceFromBottom = Math.abs(activeEdges.top - otherEdges.bottom);

      if (movesTop && movesBottom) {
        if (distanceToTop <= snapDistance) {
          addVertical('bottom', otherEdges.top, distanceToTop, other.id);
        }
        if (distanceToBottom <= snapDistance) {
          addVertical('bottom', otherEdges.bottom, distanceToBottom, other.id);
        }
        if (distanceFromTop <= snapDistance) {
          addVertical('top', otherEdges.top, distanceFromTop, other.id);
        }
        if (distanceFromBottom <= snapDistance) {
          addVertical('top', otherEdges.bottom, distanceFromBottom, other.id);
        }
      } else if (movesBottom) {
        if (distanceToTop <= snapDistance) {
          addVertical('bottom', otherEdges.top, distanceToTop, other.id);
        }
        if (distanceToBottom <= snapDistance) {
          addVertical('bottom', otherEdges.bottom, distanceToBottom, other.id);
        }
      } else if (movesTop) {
        if (distanceFromTop <= snapDistance) {
          addVertical('top', otherEdges.top, distanceFromTop, other.id);
        }
        if (distanceFromBottom <= snapDistance) {
          addVertical('top', otherEdges.bottom, distanceFromBottom, other.id);
        }
      }
    }
  });

  return selectBestTarget(
    horizontalCandidates,
    verticalCandidates,
    (horizontal, vertical) => ({
      ...active,
      x: horizontal.window.x,
      y: vertical.window.y,
      width: horizontal.window.width,
      height: vertical.window.height,
      id: active.id,
      zIndex: active.zIndex,
    }),
    canvas,
  );
};

export const computeResizeHintTarget = (
  active: WindowData,
  others: WindowData[],
  direction: ResizeDirection,
  canvas: CanvasSize | null | undefined,
  hintConfig: ReturnType<typeof mergeHintConfig>,
): { target: SnapCandidate | null; guides: HintGuide[] } => {
  const hintDistance = hintConfig.distance;
  const snapDistance = hintConfig.snap.distance ?? hintDistance;
  const activeEdges = windowEdges(active);
  const canvasWindow = canvasToWindow(canvas);
  const targets = canvasWindow ? [...others, canvasWindow] : others;

  let guideHorizontal: AxisCandidate | null = null;
  let guideVertical: AxisCandidate | null = null;
  let snapHorizontal: AxisCandidate | null = null;
  let snapVertical: AxisCandidate | null = null;

  const movesTop =
    direction === 'n' || direction === 'ne' || direction === 'nw';
  const movesBottom =
    direction === 's' || direction === 'se' || direction === 'sw';
  const movesRight =
    direction === 'e' || direction === 'ne' || direction === 'se';
  const movesLeft =
    direction === 'w' || direction === 'nw' || direction === 'sw';

  const considerHorizontal = (
    edge: Extract<SnapEdge, 'left' | 'right'>,
    targetEdge: number,
    target: WindowData,
  ) => {
    if ((edge === 'left' && !movesLeft) || (edge === 'right' && !movesRight)) {
      return;
    }

    const distance =
      edge === 'left'
        ? Math.abs(activeEdges.left - targetEdge)
        : Math.abs(activeEdges.right - targetEdge);
    if (distance > hintDistance && distance > snapDistance) {
      return;
    }

    let next: WindowData;
    if (edge === 'right') {
      next = clampWindowToBounds(
        { ...active, width: targetEdge - active.x },
        canvas ?? undefined,
      );
    } else {
      next = clampWindowToBounds(
        {
          ...active,
          x: targetEdge,
          width: activeEdges.right - targetEdge,
        },
        canvas ?? undefined,
      );
    }

    const targetEdges = windowEdges(target);
    const candidate: AxisCandidate = {
      window: next,
      edge,
      targetIds: [target.id],
      distance,
      guide: buildGuide(
        active.id,
        target.id,
        'vertical',
        targetEdge,
        activeEdges,
        targetEdges,
        edge,
      ),
    };

    if (distance <= hintDistance) {
      guideHorizontal = pickBestAxisCandidate(guideHorizontal, candidate);
    }
    if (distance <= snapDistance) {
      snapHorizontal = pickBestAxisCandidate(snapHorizontal, candidate);
    }
  };

  const considerVertical = (
    edge: Extract<SnapEdge, 'top' | 'bottom'>,
    targetEdge: number,
    target: WindowData,
  ) => {
    if ((edge === 'top' && !movesTop) || (edge === 'bottom' && !movesBottom)) {
      return;
    }

    const distance =
      edge === 'top'
        ? Math.abs(activeEdges.top - targetEdge)
        : Math.abs(activeEdges.bottom - targetEdge);
    if (distance > hintDistance && distance > snapDistance) {
      return;
    }

    let next: WindowData;
    if (edge === 'bottom') {
      next = clampWindowToBounds(
        { ...active, height: targetEdge - active.y },
        canvas ?? undefined,
      );
    } else {
      next = clampWindowToBounds(
        {
          ...active,
          y: targetEdge,
          height: activeEdges.bottom - targetEdge,
        },
        canvas ?? undefined,
      );
    }

    const targetEdges = windowEdges(target);
    const candidate: AxisCandidate = {
      window: next,
      edge,
      targetIds: [target.id],
      distance,
      guide: buildGuide(
        active.id,
        target.id,
        'horizontal',
        targetEdge,
        activeEdges,
        targetEdges,
        edge,
      ),
    };

    if (distance <= hintDistance) {
      guideVertical = pickBestAxisCandidate(guideVertical, candidate);
    }
    if (distance <= snapDistance) {
      snapVertical = pickBestAxisCandidate(snapVertical, candidate);
    }
  };

  targets.forEach((target) => {
    if (target.id === active.id) {
      return;
    }

    const targetEdges = windowEdges(target);
    considerHorizontal('left', targetEdges.left, target);
    considerHorizontal('left', targetEdges.right, target);
    considerHorizontal('right', targetEdges.left, target);
    considerHorizontal('right', targetEdges.right, target);

    considerVertical('top', targetEdges.top, target);
    considerVertical('top', targetEdges.bottom, target);
    considerVertical('bottom', targetEdges.top, target);
    considerVertical('bottom', targetEdges.bottom, target);
  });

  const guides: HintGuide[] = [];
  const horizontalGuide = (guideHorizontal as AxisCandidate | null)?.guide;
  if (horizontalGuide) {
    guides.push(horizontalGuide);
  }
  const verticalGuide = (guideVertical as AxisCandidate | null)?.guide;
  if (verticalGuide) {
    guides.push(verticalGuide);
  }

  return {
    target: combineHintTargets(
      active,
      snapHorizontal,
      snapVertical,
      canvas ?? undefined,
    ),
    guides,
  };
};

export {
  type CanvasSize,
  type SnapEdge,
  type SnapCandidate,
  type HintGuide,
} from '../types/geometry';
