import { mergeHintConfig, resolveSnapConfig } from '../utils/geometry';
import {
  HINT_BEHAVIOR_DEFAULTS,
  SNAP_BEHAVIOR_DEFAULTS,
} from '../constants/windows';

describe('resolveSnapConfig', () => {
  it('falls back to defaults when config is missing', () => {
    const result = resolveSnapConfig(undefined, true);
    expect(result).toEqual({
      enabled: SNAP_BEHAVIOR_DEFAULTS.enabled,
      distance: SNAP_BEHAVIOR_DEFAULTS.distance,
      overlap: SNAP_BEHAVIOR_DEFAULTS.overlap,
      visualPreview: SNAP_BEHAVIOR_DEFAULTS.visualPreview,
    });
  });

  it('disables snapping when snapEnabled is false', () => {
    const result = resolveSnapConfig(
      {
        enabled: true,
        distance: 12,
        overlap: 8,
        visualPreview: true,
      },
      false,
    );
    expect(result).toEqual({
      enabled: false,
      distance: 12,
      overlap: 8,
      visualPreview: true,
    });
  });
});

describe('mergeHintConfig', () => {
  it('inherits snap distances and preview settings from snap config', () => {
    const result = mergeHintConfig(
      { enabled: true },
      {
        enabled: true,
        distance: 48,
        overlap: 16,
        visualPreview: false,
      },
    );

    expect(result).toEqual({
      enabled: true,
      distance: 48,
      snap: {
        enabled: HINT_BEHAVIOR_DEFAULTS.snap.enabled,
        distance: 48,
        visualPreview: false,
      },
    });
  });
});
