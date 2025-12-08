import { type WindowData } from './windows';

export type CanvasSize = {
  width: number;
  height: number;
};

export type SnapEdge = 'left' | 'right' | 'top' | 'bottom';

export type SnapCandidate = {
  activeId: WindowData['id'];
  targetIds: WindowData['id'][];
  edges: SnapEdge[];
  window: WindowData;
  distance: number;
};
