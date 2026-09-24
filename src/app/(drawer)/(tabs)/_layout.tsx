import { DrawerActions } from '@react-navigation/native';
import { Tabs, useNavigation } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { useTheme } from '@/theme';

// Compact header: the title bar's content area. Trimmed from the platform
// default (~56 on Android) so the header sits tighter now that the screen title
// lives only here and not duplicated in the page body. This is the *whole*
// header — the root `ThemedShell` already insets everything past the status bar
// (see src/app/_layout.tsx), so the header must not reserve that inset again.
const HEADER_CONTENT_HEIGHT = 40;

// Tab bar: the strip's own content area, excluding the bottom safe-area inset
// the bar adds underneath for the Android nav bar / iOS home indicator. React
// Navigation's default is 49 (the UIKit figure), which leaves the icon+label
// pair crowded against the system nav buttons. 64 buys the pair real margin on
// both sides.
const TAB_BAR_CONTENT_HEIGHT = 64;

// The icon+label pair measures 44 inside the item (5 of built-in padding, the
// 20 icon, the 14 label line, 5 again), so splitting the remaining 20 evenly
// centres the pair in the taller strip.
const TAB_ITEM_VERTICAL_PADDING = (TAB_BAR_CONTENT_HEIGHT - 44) / 2;

// Pinned so the pair's height stays the 44 the padding above assumes, instead
// of drifting with whatever line height the platform derives from the font.
const TAB_BAR_LABEL_LINE_HEIGHT = 14;

// Lucide ships no outline/filled pair, so the focused tab reads as a heavier
// stroke plus the active tint rather than a different glyph.
function tabIcon(name: IconName, focused: boolean, color: string) {
  return <Icon name={name} size={ICON_SIZE.md} color={color} strokeWidth={focused ? 2.5 : 2} />;
}

function MenuIcon() {
  const navigation = useNavigation();
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      hitSlop={12}
      style={{ marginLeft: 16 }}
    >
      <Icon name="menu" size={ICON_SIZE.md} color={c.TEXT_PRIMARY} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const c = useTheme();
  // The bar pads itself by this inset; the explicit height below is the content
  // area only, so it has to be added back or the inset eats into the content.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => <MenuIcon />,
        headerTitleAlign: 'center',
        // The parent SafeAreaView already clears the status bar, so zero out
        // React Navigation's own status-bar spacer. Left in, it padded the top
        // of the header by a second inset and pushed the title/hamburger to the
        // bottom edge, leaving the header visibly lopsided.
        headerStatusBarHeight: 0,
        headerStyle: {
          backgroundColor: c.SURFACE,
          height: HEADER_CONTENT_HEIGHT,
        },
        headerTintColor: c.TEXT_PRIMARY,
        // Match the app's heading face — the native default is the system
        // font, which visibly clashes with Space Grotesk everywhere else.
        headerTitleStyle: {
          fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
          fontSize: 17,
          color: c.TEXT_PRIMARY,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: c.PRIMARY_GREEN,
        tabBarInactiveTintColor: c.TEXT_MUTED,
        tabBarStyle: {
          backgroundColor: c.SURFACE,
          borderTopColor: c.BORDER,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
        },
        tabBarItemStyle: {
          paddingTop: TAB_ITEM_VERTICAL_PADDING,
          paddingBottom: TAB_ITEM_VERTICAL_PADDING,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: TAB_BAR_LABEL_LINE_HEIGHT,
          fontFamily: FONT_FAMILY.WORK_SANS_MEDIUM,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => tabIcon('home', focused, color),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, focused }) => tabIcon('transactions', focused, color),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, focused }) => tabIcon('budget', focused, color),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => tabIcon('reports', focused, color),
        }}
      />
    </Tabs>
  );
}
