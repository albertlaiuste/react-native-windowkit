# react-native-windowkit

Lightweight window management primitives for React Native. Drag, resize, snap, and manage focus/z-index with your own window data.

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

Minimal canvas with controls for lock/unlock and snapping:

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
    id: 'one',
    x: 40,
    y: 40,
    width: 360,
    height: 240,
    zIndex: 1,
    windowStyle: {
      minWidth: 280,
      minHeight: 200,
      backgroundColor: '#d1a33f',
    },
  },
  {
    id: 'two',
    x: 260,
    y: 180,
    width: 400,
    height: 320,
    zIndex: 2,
    windowStyle: {
      maxWidth: 520,
      maxHeight: 420,
      backgroundColor: '#4ba2fa',
    },
  },
];

export default function App() {
  return (
    <WindowKitProvider windows={initialWindows}>
      <WindowView style={{ backgroundColor: '#171717' }}
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
    actions: { setWindows, toggleMode, toggleSnap },
    state: { windows, mode, snapEnabled },
  } = useWindowKit();

  const addWindow = () => {
    const nextIndex = windows.length + 1;
    setWindows([
      ...windows,
      {
        id: `extra-${nextIndex}`,
        x: 60 * nextIndex,
        y: 40 * nextIndex,
        width: 320,
        height: 240,
        zIndex: windows.length + 1,
      },
    ]);
  };

  return (
    <View style={{ padding: 16, gap: 8 }}>
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
    </View>
  );
}
```

Each window can optionally set `minWidth` / `minHeight` (defaults to the library minima) and `maxWidth` / `maxHeight` (defaults to unbounded; if omitted, the canvas size is the cap).

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
  style={{ backgroundColor: '#171717' }}
  renderWindowContent={renderWindowContent}
  renderHeader={renderHeader}
/>;
```

Tip: dashed hint lines generate segments; use small dash counts or set `dashWidth`/`dashGap` to `0` for a solid, more performant line.

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

## Animations (override defaults)

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

## Configuration

Pass `config` to `WindowView` to tweak behavior (all optional):

| Property | Type | Description | Default |
| --- | --- | --- | --- |
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

## Optional properties

- `renderHeader`: `(props) => ReactNode` — render a custom header component. Receives `{ window, isActive, closeButtonEnabled, onClose }`.

## Styling API

You can theme windows via the `windowStyles` prop on `WindowView` (all fields optional and falling back to exported defaults from `constants/windows`):

```tsx
<WindowView
  windowStyles={{
    window: {
      minWidth: 320,
      minHeight: 240,
      borderRadius: 8,
      borderWidth: 2,
      borderColorActive: '#ffd966',
      backgroundColor: '#222',
    },
    handle: {
      size: 24,
      activeOpacity: 0.25,
      backgroundActive: '#ffd966',
      backgroundInactive: '#666',
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
      borderRadius: 8,
      offset: 10,
      borderColor: '#ffd966',
      backgroundColor: 'rgba(255, 217, 102, 0.18)',
    },
    header: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      textColor: '#fff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      closeButton: {
        size: 26,
        opacity: 0.9,
        color: '#fff',
        style: {
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 14,
        },
        // icon: <MyCloseIcon />, // optional custom icon
      },
    },
  }}
/>
```

Defaults are exported as `WINDOW_STYLE_DEFAULTS`, `HANDLE_STYLE_DEFAULTS`, `SHADOW_STYLE_DEFAULTS`, `SNAP_STYLE_DEFAULTS`, `HINT_STYLE_DEFAULTS`, `HEADER_STYLE_DEFAULTS`, and behavior defaults as `SNAP_BEHAVIOR_DEFAULTS` / `HINT_BEHAVIOR_DEFAULTS`.
