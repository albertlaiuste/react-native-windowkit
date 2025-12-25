import { Platform } from 'react-native';
import { Easing, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { type SnapSpringConfig } from '../hooks/useSnapPreview';

export const windowEnteringAnimation =
  Platform.OS === 'web'
    ? ZoomIn.duration(600)
    : ZoomIn.duration(600).easing(Easing.out(Easing.cubic));

export const windowExitingAnimation =
  Platform.OS === 'web'
    ? ZoomOut.duration(300)
    : ZoomOut.duration(300).easing(Easing.in(Easing.cubic));

export const snapSpringConfig: SnapSpringConfig = {
  damping: 16,
  stiffness: 180,
  mass: 0.7,
  useNativeDriver: Platform.OS !== 'web',
};
