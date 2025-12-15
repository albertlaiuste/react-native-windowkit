export type SnapConfig = {
  distance: number;
  overlap: number;
};

export type WindowKitConfig = {
  snap?: Partial<SnapConfig>;
  lockedShadow?: boolean;
  unlockedShadow?: boolean;
  header?: {
    enabled?: boolean;
    closeButton?: boolean;
  };
};
