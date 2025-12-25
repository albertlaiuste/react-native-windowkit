import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { StyleSheet, type ViewStyle } from 'react-native';

type StackingOverlayProps = {
  hintEnabled: boolean;
  hintGuideBaseStyle: ViewStyle;
  horizontalHintStyle: AnimatedStyle<ViewStyle>;
  verticalHintStyle: AnimatedStyle<ViewStyle>;
  snapPreviewEnabled: boolean;
  snapPreviewAnimatedStyle: AnimatedStyle<ViewStyle>;
  snapStyle: {
    borderRadius: number;
    borderWidth: number;
    borderColor?: string;
    backgroundColor?: string;
  };
};

function StackingOverlay({
  hintEnabled,
  hintGuideBaseStyle,
  horizontalHintStyle,
  verticalHintStyle,
  snapPreviewEnabled,
  snapPreviewAnimatedStyle,
  snapStyle,
}: StackingOverlayProps) {
  return (
    <>
      {hintEnabled && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.hintGuide, hintGuideBaseStyle, horizontalHintStyle]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.hintGuide, hintGuideBaseStyle, verticalHintStyle]}
          />
        </>
      )}
      {snapPreviewEnabled && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.snapPreview,
            snapPreviewAnimatedStyle,
            {
              borderRadius: snapStyle.borderRadius,
              borderWidth: snapStyle.borderWidth,
              borderColor: snapStyle.borderColor,
              backgroundColor: snapStyle.backgroundColor,
            },
          ]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  snapPreview: {
    position: 'absolute',
    borderStyle: 'dashed',
  },
  hintGuide: {
    position: 'absolute',
    opacity: 0.9,
  },
});

export default StackingOverlay;
