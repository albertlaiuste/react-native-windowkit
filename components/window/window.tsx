import { memo, type ComponentType, type ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

type WindowStyle = {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  backgroundColor?: string;
};

type WindowData = {
  id: string;
};

type WindowProps<T extends WindowData, H = unknown> = {
  window: T;
  handlers?: H;
  className?: string;
  style?: ViewStyle;
  windowStyle?: WindowStyle;
  contentStyle?: ViewStyle;
  renderContent?: (window: T, handlers: H) => ReactNode;
  renderHeader?: (window: T) => ReactNode;
  renderFooter?: (window: T) => ReactNode;
};

const WindowRoot = View as unknown as ComponentType<
  ViewProps & { className: string | undefined }
>;

function Window<T extends WindowData, H = unknown>(props: WindowProps<T, H>) {
  const {
    window,
    handlers,
    className,
    style,
    windowStyle,
    contentStyle,
    renderContent,
    renderHeader,
    renderFooter,
  } = props;

  const content = renderContent?.(window, handlers ?? ({} as H));
  const header = renderHeader?.(window);
  const footer = renderFooter?.(window);

  return (
    <WindowRoot className={className} style={[style, windowStyle]}>
      {header}
      <View style={contentStyle}>{content}</View>
      {footer}
    </WindowRoot>
  );
}

const MemoWindow = memo(
  Window,
  (prev, next) =>
    prev.window.id === next.window.id &&
    prev.handlers === next.handlers &&
    prev.className === next.className &&
    prev.style === next.style &&
    prev.windowStyle === next.windowStyle &&
    prev.contentStyle === next.contentStyle &&
    prev.renderContent === next.renderContent &&
    prev.renderHeader === next.renderHeader &&
    prev.renderFooter === next.renderFooter,
) as typeof Window;

export default MemoWindow;
