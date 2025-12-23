# react-native-windowkit

Lightweight window management primitives for React Native. Drag, resize, snap, and manage focus/z-index with your own window data.

## Table of contents

- [Installation](#installation)
  - [Peer dependencies](#peer-dependencies)
- [Quick start](#quick-start)
  - [Rendering performance](#rendering-performance)
- [Working with `Windows`](#working-with-windows)
- [Custom layout with `Window`](#custom-layout-with-window)
- [Properties](#properties)
  - [`WindowView`](#windowview)
  - [`Window`](#window)
  - [`WindowKitProvider`](#windowkitprovider)
- [`useWindowKit` hook](#usewindowkit-hook)
- [Configuration](#configuration)
- [Styling](#styling)
  - [Animations](#animations)
  - [`windowStyle` (per-window overrides)](#windowstyle-per-window-overrides)

## Installation

This package assumes you already have React Native, Reanimated, and Gesture Handler set up in your app.

```bash
yarn add react-native-windowkit
```

### Peer dependencies

- `react` >= 18
- `react-native` >= 0.72
- `react-native-gesture-handler` >= 2.0.0
- `react-native-reanimated` >= 3.0.0

Ensure your Babel config includes the Reanimated plugin and that Gesture Handler is properly installed/initialized as in the upstream docs.

## Quick start

Minimal canvas with controls for lock/unlock and snapping.

```tsx
import React from 'react';
import { Button, Text, View } from 'react-native';
import {
  WindowView,
  WindowKitProvider,
  useWindowKit,
  type WindowData,
} from 'react-native-windowkit';

const initialWindows: WindowData[] = [
  {
    id: 'First',
    x: 8,
    y: 8,
    width: 320,
    height: 240,
    zIndex: 1,
    windowStyle: {
      backgroundColor: '#EFB810',
    },
  },
  {
    id: 'Second',
    x: 8,
    y: 256,
    width: 320,
    height: 240,
    zIndex: 2,
    windowStyle: {
      backgroundColor: '#1047EF',
    },
  },
  {
    id: 'Third',
    x: 8,
    y: 504,
    width: 320,
    height: 240,
    zIndex: 3,
    windowStyle: {
      backgroundColor: '#B810EF',
    },
  },
];

export default function App() {
  return (
    <WindowKitProvider windows={initialWindows}>
      <WindowView
        style={{ backgroundColor: '#171717' }}
        renderWindowContent={(win) => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff' }}>{win.id} window content</Text>
          </View>
        )}
      />
      <Controls />
    </WindowKitProvider>
  );
}

function Controls() {
  const {
    actions: { setWindows, toggleMode, toggleSnap, toggleHints },
    state: { windows, mode, snapEnabled, hintEnabled },
  } = useWindowKit();

  const addWindow = () => {
    const nextIndex = windows.length + 1;
    setWindows([
      ...windows,
      {
        id: `extra-${nextIndex}`,
        x: 8,
        y: 40 * nextIndex,
        width: 320,
        height: 240,
        zIndex: windows.length + 1,
      },
    ]);
  };

  return (
    <View style={{ position: 'relative', width: '100%', padding: 8, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', gap: 8 }}>
      <Button title="Reset layout" onPress={() => setWindows(initialWindows)} />
      <Button title="Add window" onPress={addWindow} />
      <Button
        title={mode === 'unlocked' ? 'Lock' : 'Unlock'}
        onPress={toggleMode}
      />
      <Button
        title={snapEnabled ? 'Disable snap' : 'Enable snap'}
        onPress={toggleSnap}
      />
      <Button
        title={hintEnabled ? 'Disable hints' : 'Enable hints'}
        onPress={toggleHints}
      />
    </View>
  );
}
```

### Rendering performance

`renderWindowContent` and `renderHeader` are treated as render props. If their identity changes every render (e.g., inline functions), every window re-renders. Keep them stable with `useCallback` (or a memoized component) to avoid unnecessary work:

```tsx
const renderWindowContent = useCallback(
  (win: WindowData) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff' }}>{win.id} window content</Text>
    </View>
  ),
  [],
);

const renderHeader = useCallback(
  () => (
    <View style={{ width: '100%', height: 40, position: 'absolute', backgroundColor: '#000', opacity: 0.4, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Custom header</Text>
    </View>
  ),
  [],
);

<WindowView
  renderWindowContent={renderWindowContent}
  renderHeader={renderHeader}
/>;
```

Tip: dashed hint lines generate segments; use small dash counts or set `dashWidth`/`dashGap` to `0` for a solid, more performant line.

## Working with `Windows`

`WindowData` holds the position, size, z-index, and optional per-window styling for each window. Provide an initial list to `WindowKitProvider`, then use the hook actions to keep it in sync as the user interacts:

- Add/update/remove windows: `setWindows([...])`

Each `WindowData` requires a unique `id`, `x`, `y`, `width`, `height`, and `zIndex`. You can optionally supply `windowStyle` to override visual bounds per window (see Styling).

## Custom layout with `Window`

Build your own layout (grid, split view, etc.) but reuse the gestures/handles:

```tsx
import { Window, useWindowKit } from 'react-native-windowkit';

function CustomLayout() {
  const {
    state: { windows, activeId },
    actions: { focusWindow, moveWindow, resizeWindow },
  } = useWindowKit();

  return (
    <>
      {windows.map((win) => (
        <Window
          key={win.id}
          window={win}
          isActive={activeId === win.id}
          isUnlocked={true}
          onFocus={() => focusWindow(win.id)}
          onMove={(x, y) => moveWindow(win.id, x, y)}
          onResize={(rect) => resizeWindow(win.id, rect)}
          onRelease={() => {}}
          onInteractionChange={() => {}}
          renderContent={(window) => <YourWindowContent window={window} />}
        />
      ))}
    </>
  );
}
```

## Properties

### `WindowKitProvider`

| Property | Type | Description |
| --- | --- | --- |
| `children` | `ReactNode` | **Required.** Content that uses the window kit. |
| `windows` | `WindowData[]` | Initial windows. |
| `mode` | `'locked' \| 'unlocked'` | Starting mode. |
| `onWindowsChange` | `(windows: WindowData[]) => void` | Called when window list changes. |
| `onActiveChange` | `(activeId: string \| null) => void` | Called when active window changes. |
| `onModeChange` | `(mode: 'locked' \| 'unlocked') => void` | Called when mode toggles. |
| `onSnapChange` | `(enabled: boolean) => void` | Called when snap enabled state changes. |
| `onHintChange` | `(enabled: boolean) => void` | Called when hint enabled state changes. |

### `WindowView`

| Property | Type | Description |
| --- | --- | --- |
| `renderWindowContent` | `(window) => ReactNode` | **Required.** Renders window content. |
| `renderWindowContentPlaceholder` | `ReactNode \| () => ReactNode` | Optional UI when there are no windows. |
| `renderHeader` | `(props) => ReactNode` | Custom header renderer. Receives `{ window, isActive, closeButtonEnabled, onClose }`. |
| `style` | `ViewStyle` | Container style for the `WindowView` wrapper. |
| `canvasStyle` | `ViewStyle` | Style for the inner canvas area. |
| `animations` | `{ entering?, exiting?, snap? }` | Animation overrides for window enter/exit and snap preview. |
| `config` | `WindowKitConfig` | Behavior overrides (see Configuration table). |
| `windowStyles` | `WindowStylesInput` | Visual overrides (see Styling table). |
| `onCloseWindow` | `(id: string) => void` | Override the default close behavior. |

### `Window`

| Property | Type | Description |
| --- | --- | --- |
| `window` | `WindowData` | Window state (id/rect/zIndex/style). |
| `canvasSize` | `CanvasSize \| null` | Canvas bounds for clamping. |
| `isActive` | `boolean` | Whether the window is active/focused. |
| `isUnlocked` | `boolean` | Whether the window is in unlocked mode. |
| `onFocus` | `() => void` | Focus handler. |
| `onMove` | `(x: number, y: number) => void` | Move handler. |
| `onResize` | `(rect) => void` | Resize handler. Receives partial `{ x, y, width, height }`. |
| `onRelease` | `(id, type) => void` | Called when drag/resize ends. |
| `onInteractionChange` | `(interaction) => void` | Tracks active interaction. |
| `renderContent` | `(window) => ReactNode` | Renderer for window contents. |
| `renderContentVersion` | `number` | Increment to recompute renderContent memo. |
| `renderHeader` | `(props) => ReactNode` | Custom header renderer. |
| `renderHeaderVersion` | `number` | Increment to recompute renderHeader memo. |
| `animations` | `{ entering?, exiting? }` | Animation overrides for this window. |
| `styleConfig` | `ResolvedWindowStyles` | Resolved visual styles to apply. |
| `shadowEnabled` | `boolean` | Whether shadows render. |
| `headerEnabled` | `boolean` | Whether the header renders. |
| `closeButtonEnabled` | `boolean` | Whether the close button renders. |
| `onClose` | `(id: string) => void` | Close handler. |

## `useWindowKit` hook

Returns `{ state, actions }` from the nearest `WindowKitProvider`.

### `state`

| Field | Type | Description |
| --- | --- | --- |
| `windows` | `WindowData[]` | Current windows array. |
| `activeId` | `string \| null` | Currently focused window id. |
| `mode` | `'locked' \| 'unlocked'` | Current mode. |
| `snapEnabled` | `boolean` | Whether snap is enabled. |
| `hintEnabled` | `boolean` | Whether hints are enabled. |
| `zCounter` | `number` | Current z-index counter. |

### `actions`

| Action | Signature | Description |
| --- | --- | --- |
| `setWindows` | `(windows: WindowData[]) => void` | Replace windows array. |
| `focusWindow` | `(id: string) => void` | Focus and bring window to front. |
| `moveWindow` | `(id: string, x: number, y: number) => void` | Move a window. |
| `resizeWindow` | `(id: string, rect) => void` | Resize a window. |
| `setMode` | `(mode: 'locked' \| 'unlocked') => void` | Set mode. |
| `toggleMode` | `() => void` | Toggle mode. |
| `setSnapEnabled` | `(enabled: boolean) => void` | Enable/disable snapping. |
| `toggleSnap` | `() => void` | Toggle snapping. |
| `setHintEnabled` | `(enabled: boolean) => void` | Enable/disable hints. |
| `toggleHints` | `() => void` | Toggle hints. |

## Configuration

Pass `config` to `WindowView` to tweak behavior (all optional):

| Property | Type | Description | Default |
| --- | --- | --- | --- |
| `snap.enabled` | `boolean` | Whether snap behavior starts enabled | `true` |
| `snap.distance` | `number` | Snap detection range in px | `32` |
| `snap.overlap` | `number` | Area overlap required to trigger snap | `64` |
| `snap.visualPreview` | `boolean` | Show snap highlight preview | `true` |
| `hint.enabled` | `boolean` | Render alignment hint lines | `true` |
| `hint.distance` | `number` | Distance from edge to show hints (falls back to snap distance) | `6` |
| `hint.snap.enabled` | `boolean` | Enable snap-to-hint behavior | `true` |
| `hint.snap.distance` | `number` | Snap distance for hint targets | `6` |
| `hint.snap.visualPreview` | `boolean` | Show snap preview when snapping to hints | `true` |
| `shadow` | `boolean \| 'locked' \| 'unlocked'` | `false` to disable, `true` for all modes, or limit to a mode | `'unlocked'` |
| `header.enabled` | `boolean` | Render the header/ID bar | `true` |
| `header.closeButton` | `boolean \| 'locked' \| 'unlocked'` | `true`/`false`, or `'locked'`/`'unlocked'` to restrict modes | `true` |

```ts
// Full config with defaults
const config = {
  snap: {
    enabled: true,
    distance: 32,
    overlap: 64,
    visualPreview: true,
  },
  hint: {
    enabled: true,
    distance: 6,
    snap: {
      enabled: true,
      distance: 6,
      visualPreview: true,
    },
  },
  shadow: 'unlocked', // set false to disable or true to enable in both modes
  header: {
    enabled: true,
    closeButton: true, // use 'locked' or 'unlocked' to limit visibility
  },
};
```

## Styling

You can theme windows via the `windowStyles` prop on `WindowView` (all fields optional) 

| Property | Type | Description | Default |
| --- | --- | --- | --- |
| `window.minWidth` | `number` | Minimum window width | `320` |
| `window.minHeight` | `number` | Minimum window height | `240` |
| `window.maxWidth` | `number` | Maximum window width | `undefined` |
| `window.maxHeight` | `number` | Maximum window height | `undefined` |
| `window.gaps` | `number` | Default gap between windows when snapping | `0` |
| `window.borderRadius` | `number` | Window border radius | `0` |
| `window.borderWidth` | `number` | Window border width | `3` |
| `window.borderColorActive` | `string` | Border color when active | `'rgba(247,226,166,1.0)'` |
| `window.borderColorInactive` | `string` | Border color when inactive | `'rgba(255,255,255,1.0)'` |
| `window.backgroundColor` | `string` | Window background color | `'rgba(67,67,67,1)'` |
| `snap.borderWidth` | `number` | Snap preview border width | `2` |
| `snap.borderRadius` | `number` | Snap preview border radius | `0` |
| `snap.borderColor` | `string` | Snap preview border color | `'rgba(247,226,166,1.0)'` |
| `snap.backgroundColor` | `string` | Snap preview background color | `'rgba(247,226,166,0.18)'` |
| `snap.offset` | `number` | Snap preview inset/offset in px | `6` |
| `hint.thickness` | `number` | Hint line thickness | `2` |
| `hint.color` | `string` | Hint line color | `'rgba(255,255,255,0.55)'` |
| `hint.padding` | `number` | Padding around hint lines | `0` |
| `hint.dashWidth` | `number` | Dash width (0 for solid) | `0` |
| `hint.dashGap` | `number` | Dash gap (0 for solid) | `0` |
| `handle.size` | `number` | Handle square size | `24` |
| `handle.borderHitThickness` | `number` | Hit area thickness along edges | `12` |
| `handle.cornerHitSize` | `number` | Hit area size at corners | `24` |
| `handle.activeOpacity` | `number` | Handle overlay opacity when active | `0.25` |
| `handle.inactiveOpacity` | `number` | Handle overlay opacity when inactive | `0` |
| `handle.backgroundActive` | `string` | Handle background color when active | `'rgba(247,226,166,0.45)'` |
| `handle.backgroundInactive` | `string` | Handle background color when inactive | `'rgba(255,255,255,0.25)'` |
| `handle.borderActive` | `string` | Handle border color when active | `'rgba(247,226,166,1.0)'` |
| `handle.borderInactive` | `string` | Handle border color when inactive | `'rgba(255,255,255,1.0)'` |
| `header.backgroundColor` | `string` | Header background color | `'rgba(0, 0, 0, 0.25)'` |
| `header.textColor` | `string` | Header text color | `'#ffffff'` |
| `header.paddingHorizontal` | `number` | Header horizontal padding | `10` |
| `header.paddingVertical` | `number` | Header vertical padding | `6` |
| `header.closeButton.size` | `number` | Close button size | `20` |
| `header.closeButton.opacity` | `number` | Close button opacity | `0.9` |
| `header.closeButton.color` | `string` | Close button color | `'#ffffff'` |
| `header.closeButton.style` | `Record<string, unknown>` | Close button style object | `{ backgroundColor: 'rgba(0,0,0,0.3)' }` |
| `header.closeButton.icon` | `ReactNode \| null` | Custom close icon node | `null` |
| `shadow.boxShadow` | `string` | Web box-shadow | `'0px 8px 12px rgba(0, 0, 0, 0.3)'` |
| `shadow.shadowOpacity` | `number` | Native shadow opacity | `0.3` |
| `shadow.shadowRadius` | `number` | Native shadow radius | `12` |
| `shadow.shadowOffset` | `{ width: number; height: number }` | Native shadow offset | `{ width: 0, height: 8 }` |
| `shadow.shadowColor` | `string` | Native shadow color | `'#000'` |

```tsx
<WindowView
  windowStyles={{
    window: {
      minWidth: 320,
      minHeight: 240,
      maxWidth: undefined,
      maxHeight: undefined,
      gaps: 0,
      borderRadius: 0,
      borderWidth: 3,
      borderColorActive: 'rgba(247,226,166,1.0)',
      borderColorInactive: 'rgba(255,255,255,1.0)',
      backgroundColor: 'rgba(67,67,67,1)',
    },
    handle: {
      size: 24,
      borderHitThickness: 12,
      cornerHitSize: 24,
      activeOpacity: 0.25,
      inactiveOpacity: 0,
      backgroundActive: 'rgba(247,226,166,0.45)',
      backgroundInactive: 'rgba(255,255,255,0.25)',
      borderActive: 'rgba(247,226,166,1.0)',
      borderInactive: 'rgba(255,255,255,1.0)',
    },
    shadow: {
      boxShadow: '0px 8px 12px rgba(0, 0, 0, 0.3)', // web
      shadowOpacity: 0.3, // native
      shadowRadius: 12,   // native
      shadowOffset: { width: 0, height: 8 }, // native
      shadowColor: '#000', // native
    },
    hint: {
      thickness: 2,
      padding: 0,
      color: 'rgba(255,255,255,0.55)',
      dashWidth: 0,
      dashGap: 0,
    },
    snap: {
      borderWidth: 2,
      borderRadius: 0,
      offset: 6,
      borderColor: 'rgba(247,226,166,1.0)',
      backgroundColor: 'rgba(247,226,166,0.18)',
    },
    header: {
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      textColor: '#ffffff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      closeButton: {
        size: 20,
        opacity: 0.9,
        color: '#ffffff',
        style: {
          backgroundColor: 'rgba(0,0,0,0.3)',
        },
        icon: null,
      },
    },
  }}
/>
```

Defaults are exported as `WINDOW_STYLE_DEFAULTS`, `HANDLE_STYLE_DEFAULTS`, `SHADOW_STYLE_DEFAULTS`, `SNAP_STYLE_DEFAULTS`, `HINT_STYLE_DEFAULTS`, `HEADER_STYLE_DEFAULTS`, and behavior defaults as `SNAP_BEHAVIOR_DEFAULTS` / `HINT_BEHAVIOR_DEFAULTS`.

### Animations

`Window` and snap preview animations are exported so you can override them:

```tsx
import {
  windowEnteringAnimation,
  windowExitingAnimation,
  snapSpringConfig,
} from 'react-native-windowkit';
```

- `windowEnteringAnimation` / `windowExitingAnimation`: Reanimated animations used by the `Window` component for mount/unmount. Swap them by passing your own via `animations` on `WindowView` (applies to all windows) or directly on `Window` (`animations={{ entering: MyAnim }}`).
- `snapSpringConfig`: Base spring config used by `WindowView` for the snap preview highlight. Pass overrides through the `animations` prop on `WindowView`:

```tsx
<WindowView
  animations={{
    snap: { ...snapSpringConfig, damping: 24 },
    entering: windowEnteringAnimation, // optional override
    exiting: windowExitingAnimation,   // optional override
  }}
  renderWindowContent={...}
/>
```

Defaults are JS-driven on web (no native driver) and use cubic easing/spring on native.

### `windowStyle` (per-window overrides)

Set `windowStyle` on individual `WindowData` objects to override the defaults above for that window only. Supported fields:

| Property | Type | Description |
| --- | --- | --- |
| `minWidth` / `minHeight` | `number` | Minimum size for the window. |
| `maxWidth` / `maxHeight` | `number` | Maximum size for the window. |
| `gaps` | `number` | Gap between this window and others when snapping. |
| `borderRadius` | `number` | Corner radius. |
| `borderWidth` | `number` | Border width. |
| `borderColorActive` / `borderColorInactive` | `string` | Border colors per active state. |
| `backgroundColor` | `string` | Window background color. |
