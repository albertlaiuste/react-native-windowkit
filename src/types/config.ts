export type SnapConfig = {
  distance: number;
  overlap: number;
};

export type WindowKitConfig = {
  snap?: Partial<SnapConfig>;
  lockedShadow?: boolean;
  unlockedShadow?: boolean;
  headerEnabled?: boolean;
};
