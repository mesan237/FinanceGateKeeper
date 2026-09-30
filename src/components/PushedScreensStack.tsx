import { Stack } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The route group that holds the tab screens; its tab bar handles the bottom inset itself. */
const TABS_ROUTE = '(drawer)';

/**
 * The app's root navigator. Since Expo 54 Android draws edge-to-edge, so a
 * screen's content runs underneath the system navigation bar; the root layout
 * already insets the top, and this insets the bottom of every pushed screen so a
 * button pinned to its bottom edge (Add item, Save, ...) is never hidden.
 *
 * The tab screens are exempt: their tab bar already adds the inset, and padding
 * them too would leave a gap above it.
 */
export function PushedScreensStack() {
  const insets = useSafeAreaInsets();

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        contentStyle: route.name === TABS_ROUTE ? undefined : { paddingBottom: insets.bottom },
      })}
    />
  );
}
