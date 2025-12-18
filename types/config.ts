import { type WindowsMode } from './windows';

export type SnapConfig = {
  distance: number;
  overlap: number;
  visualPreview: boolean;
};

export type HintSnapConfig = {
  enabled?: boolean;
  distance?: number;
  visualPreview?: boolean;
};

export type HintConfig = {
  enabled: boolean;
  distance?: number;
  snap?: HintSnapConfig;
};

export type WindowKitConfig = {
  snap?: Partial<SnapConfig>;
  hint?: Partial<HintConfig>;
  shadow?: boolean | WindowsMode;
  header?: {
    enabled?: boolean;
    closeButton?: boolean | WindowsMode;
  };
};
