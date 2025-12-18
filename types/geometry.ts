import { type WindowData } from './windows';

export type CanvasSize = {
  width: number;
  height: number;
};

export type SnapEdge =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'centerX'
  | 'centerY';

export type SnapCandidate = {
  activeId: WindowData['id'];
  targetIds: WindowData['id'][];
  edges: SnapEdge[];
  window: WindowData;
  distance: number;
};

export type HintGuide = {
  activeId: WindowData['id'];
  targetIds: WindowData['id'][];
  orientation: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  edge: SnapEdge;
};
