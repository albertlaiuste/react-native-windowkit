import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type GestureHandle = {
  key: string;
  position: ViewStyle;
  gesture: ReturnType<typeof Gesture.Pan>;
};

type BorderHandle = {
  key: string;
  style: ViewStyle;
  gesture: ReturnType<typeof Gesture.Pan>;
};

type ResizeHandlesOverlayProps = {
  isUnlocked: boolean;
  borderGestures: BorderHandle[];
  handleGestures: GestureHandle[];
  handleOpacity: number;
  handleBackgroundColor: string;
  handleBorderColor: string;
  handleSize: number;
};

function ResizeHandlesOverlay({
  isUnlocked,
  borderGestures,
  handleGestures,
  handleOpacity,
  handleBackgroundColor,
  handleBorderColor,
  handleSize,
}: ResizeHandlesOverlayProps) {
  return (
    <View
      pointerEvents={isUnlocked ? 'box-none' : 'none'}
      style={styles.handleLayer}>
      {borderGestures.map((hitArea) => (
        <GestureDetector
          key={`border-${hitArea.key}`}
          gesture={hitArea.gesture}>
          <View
            pointerEvents="box-only"
            style={[styles.borderHit, hitArea.style]}
          />
        </GestureDetector>
      ))}
      {handleGestures.map((handle) => (
        <GestureDetector key={handle.key} gesture={handle.gesture}>
          <View
            pointerEvents="box-only"
            style={[
              styles.handle,
              handle.position,
              {
                opacity: handleOpacity,
                backgroundColor: handleBackgroundColor,
                borderColor: handleBorderColor,
                width: handleSize,
                height: handleSize,
                borderRadius: handleSize ? handleSize / 2 : 0,
              },
            ]}
          />
        </GestureDetector>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  handleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  borderHit: {
    position: 'absolute',
  },
  handle: {
    opacity: 0.25,
    position: 'absolute',
    width: 0,
    height: 0,
    borderRadius: 0,
    borderWidth: 1,
  },
});

export default ResizeHandlesOverlay;
