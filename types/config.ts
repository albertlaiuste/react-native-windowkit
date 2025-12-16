import { type WindowsMode } from './windows';

export type SnapConfig = {
  distance: number;
  overlap: number;
  visualPreview: boolean;
};

export type WindowKitConfig = {
  snap?: Partial<SnapConfig>;
  lockedShadow?: boolean;
  unlockedShadow?: boolean;
  header?: {
    enabled?: boolean;
    closeButton?: boolean | WindowsMode;
  };
};
