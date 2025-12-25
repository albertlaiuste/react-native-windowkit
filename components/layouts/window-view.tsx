import StackingView, {
  type StackingViewProps,
  type StackingWindowData,
} from './stacking/view';

export type WindowViewMode = 'stacking';

export type WindowViewProps<T extends StackingWindowData> =
  StackingViewProps<T> & {
    mode?: WindowViewMode;
  };

function WindowView<T extends StackingWindowData>({
  mode = 'stacking',
  ...props
}: WindowViewProps<T>) {
  if (mode === 'stacking') {
    return <StackingView {...props} />;
  }

  return null;
}

export default WindowView;
