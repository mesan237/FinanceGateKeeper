import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/components/Icon';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { useTheme } from '@/theme';
import { useAppMode } from '@/features/finance/auth/AppModeProvider';

// Lucide ships no outline/filled pair, so the focused tab reads as a heavier
// stroke plus the active tint rather than a different glyph.
function tabIcon(name: IconName, focused: boolean, color: string) {
  return <Icon name={name} size={ICON_SIZE.md} color={color} strokeWidth={focused ? 2.5 : 2} />;
}

function GearIcon() {
  const router = useRouter();
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push('/settings')}
      hitSlop={12}
      style={{ marginRight: 16 }}
    >
      <Icon name="settings" size={ICON_SIZE.md} color={c.TEXT_PRIMARY} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const appMode = useAppMode();
  const showBudget = appMode === 'control';
  const c = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <GearIcon />,
        headerStyle: { backgroundColor: c.SURFACE },
        headerTintColor: c.TEXT_PRIMARY,
        // Match the app's heading face — the native default is the system
        // font, which visibly clashes with Poppins everywhere else.
        headerTitleStyle: {
          fontFamily: FONT_FAMILY.POPPINS_SEMIBOLD,
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
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
          href: showBudget ? undefined : null,
          tabBarIcon: ({ color, focused }) => tabIcon('budget', focused, color),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => tabIcon('projects', focused, color),
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
