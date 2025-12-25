import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Window, {
  type WindowData,
  type WindowStyle,
} from '@/components/window/window';

type StackingWindowData = WindowData & {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  windowStyle?: WindowStyle;
};

export type StackingWindowHandlers<T extends StackingWindowData> = {
  onFocus?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (
    windowData: Partial<Pick<T, 'x' | 'y' | 'width' | 'height'>>,
  ) => void;
  onClose?: () => void;
};

type StackingViewProps<T extends StackingWindowData> = {
  windows: T[];
  style?: ViewStyle;
  renderWindowContent?: (
    window: T,
    handlers: StackingWindowHandlers<T>,
  ) => ReactNode;
};

function StackingView<T extends StackingWindowData>({
  windows,
  style,
  renderWindowContent,
}: StackingViewProps<T>) {
  const handlers = {};

  return (
    <View style={[styles.container, style]}>
      {windows.map((window) => {
        return (
          <Window
            key={window.id}
            window={window}
            handlers={handlers}
            windowStyle={window.windowStyle ? window.windowStyle : {}}
            renderContent={renderWindowContent}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  window: {
    position: 'absolute',
  },
});

export default StackingView;
