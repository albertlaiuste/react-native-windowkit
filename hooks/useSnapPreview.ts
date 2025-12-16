import { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { type SnapCandidate } from '../utils/geometry';

type UseSnapPreviewParams = {
  snapTarget: SnapCandidate | null;
  snapSpringConfig: Omit<Animated.SpringAnimationConfig, 'toValue'>;
  snapOffset: number;
};

const offsetForEdge = (
  edge: SnapCandidate['edges'][number] | undefined,
  offset: number,
) => {
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
}: UseSnapPreviewParams) {
  const snapAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(snapAnim, {
      ...snapSpringConfig,
      toValue: snapTarget ? 1 : 0,
    }).start();
  }, [snapSpringConfig, snapTarget, snapAnim]);

  const primaryEdge = snapTarget?.edges[0];
  const horizontalEdge = snapTarget?.edges.find(
    (edge) => edge === 'left' || edge === 'right',
  );
  const verticalEdge = snapTarget?.edges.find(
    (edge) => edge === 'top' || edge === 'bottom',
  );

  const previewTransform = useMemo(() => {
    if (horizontalEdge && verticalEdge) {
      return [
        {
          translateX: snapAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [offsetForEdge(horizontalEdge, snapOffset), 0],
          }),
        },
        {
          translateY: snapAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [offsetForEdge(verticalEdge, snapOffset), 0],
          }),
        },
      ];
    }

    if (primaryEdge === 'left' || primaryEdge === 'right') {
      return [
        {
          translateX: snapAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [offsetForEdge(primaryEdge, snapOffset), 0],
          }),
        },
      ];
    }

    return [
      {
        translateY: snapAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [offsetForEdge(primaryEdge, snapOffset), 0],
        }),
      },
    ];
  }, [horizontalEdge, primaryEdge, snapAnim, snapOffset, verticalEdge]);

  return { snapAnim, previewTransform };
}

export default useSnapPreview;
