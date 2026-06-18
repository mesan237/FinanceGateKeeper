import { Drawer } from 'expo-router/drawer';
import React from 'react';

import { AppDrawerContent } from '@/components/AppDrawerContent';
import { useTheme } from '@/theme';

/**
 * Left navigation drawer wrapping the bottom-tab group. Holds the app's
 * settings/management/meta links (rendered by `AppDrawerContent`); the tabs
 * remain the primary day-to-day navigation. The drawer header is hidden because
 * each tab screen renders its own header with the hamburger trigger.
 */
export default function DrawerLayout() {
  const c = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: c.SURFACE },
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="(tabs)" />
    </Drawer>
  );
}
