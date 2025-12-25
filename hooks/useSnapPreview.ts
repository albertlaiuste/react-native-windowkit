import {
  type SharedValue,
  type ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { type SnapCandidate } from '../utils/geometry';

export type SnapSpringConfig = {
  damping?: number;
  mass?: number;
  stiffness?: number;
  duration?: number;
  dampingRatio?: number;
  clamp?: {
    min?: number;
    max?: number;
  };
  velocity?: number;
  overshootClamping?: boolean;
  energyThreshold?: number;
  reduceMotion?: ReduceMotion;
  useNativeDriver?: boolean;
};

type UseSnapPreviewParams = {
  snapTarget: SharedValue<SnapCandidate | null>;
  snapSpringConfig: SharedValue<SnapSpringConfig>;
  snapOffset: number;
  snapBorderWidth: number;
};

const offsetForEdge = (
  edge: SnapCandidate['edges'][number] | undefined,
  offset: number,
) => {
  'worklet';
  if (edge === 'left' || edge === 'top') {
    return -offset;
  }
  if (edge === 'right' || edge === 'bottom') {
    return offset;
  }
  return 0;
};

function useSnapPreview({
  snapTarget,
  snapSpringConfig,
  snapOffset,
  snapBorderWidth,
}: UseSnapPreviewParams) {
  const snapProgress = useDerivedValue(() => {
    const toValue = snapTarget.value ? 1 : 0;
    const config = snapSpringConfig.value;
    const springConfig: Parameters<typeof withSpring>[1] = {};
    if (config.damping !== undefined) {
      springConfig.damping = config.damping;
    }
    if (config.mass !== undefined) {
      springConfig.mass = config.mass;
    }
    if (config.stiffness !== undefined) {
      springConfig.stiffness = config.stiffness;
    }
    if (config.duration !== undefined) {
      springConfig.duration = config.duration;
    }
    if (config.dampingRatio !== undefined) {
      springConfig.dampingRatio = config.dampingRatio;
    }
    if (config.clamp !== undefined) {
      springConfig.clamp = config.clamp;
    }
    if (config.velocity !== undefined) {
      springConfig.velocity = config.velocity;
    }
    if (config.overshootClamping !== undefined) {
      springConfig.overshootClamping = config.overshootClamping;
    }
    if (config.energyThreshold !== undefined) {
      springConfig.energyThreshold = config.energyThreshold;
    }
    if (config.reduceMotion !== undefined) {
      springConfig.reduceMotion = config.reduceMotion;
    }

    return withSpring(toValue, springConfig);
  }, [snapSpringConfig, snapTarget]);

  const animatedStyle = useAnimatedStyle(() => {
    const target = snapTarget.value;
    const horizontalEdge =
      target?.edges.find((edge) => edge === 'left' || edge === 'right') ??
      (target?.edges.includes('centerX') ? 'centerX' : undefined);
    const verticalEdge =
      target?.edges.find((edge) => edge === 'top' || edge === 'bottom') ??
      (target?.edges.includes('centerY') ? 'centerY' : undefined);
    let translateX = 0;
    let translateY = 0;

    if (horizontalEdge) {
      translateX =
        offsetForEdge(horizontalEdge, snapOffset) * (1 - snapProgress.value);
    }
    if (verticalEdge) {
      translateY =
        offsetForEdge(verticalEdge, snapOffset) * (1 - snapProgress.value);
    }

    return {
      opacity: snapProgress.value,
      transform: [{ translateX }, { translateY }],
      left: target?.window.x ?? 0,
      top: target?.window.y ?? 0,
      width: target?.window.width ?? 0,
      height: target?.window.height ?? 0,
      borderWidth: target ? snapBorderWidth : 0,
    };
  }, [snapBorderWidth, snapOffset]);

  return { animatedStyle };
}

export default useSnapPreview;
