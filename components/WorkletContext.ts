import { createContext } from 'react';
import { type SharedValue } from 'react-native-reanimated';
import { type SnapConfig } from '../types/config';
import {
  type CanvasSize,
  type HintGuide,
  type SnapCandidate,
} from '../types/geometry';
import { type WindowData } from '../types/windows';
import { mergeHintConfig } from '../utils/geometry';

export type WorkletContextValue = {
  windows: SharedValue<WindowData[]>;
  canvasSize: SharedValue<CanvasSize | null>;
  snapConfig: SharedValue<SnapConfig>;
  hintConfig: SharedValue<ReturnType<typeof mergeHintConfig>>;
  snapTarget: SharedValue<SnapCandidate | null>;
  hintTarget: SharedValue<SnapCandidate | null>;
  hintGuides: SharedValue<HintGuide[]>;
};

const WorkletContext = createContext<WorkletContextValue | null>(null);

export default WorkletContext;
