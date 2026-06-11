import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/components/Icon';
import { BORDER, PRIMARY_GREEN, SURFACE, TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { useAppMode } from '@/features/finance/auth/AppModeProvider';

// Lucide ships no outline/filled pair, so the focused tab reads as a heavier
// stroke plus the active tint rather than a different glyph.
function tabIcon(name: IconName, focused: boolean, color: string) {
  return <Icon name={name} size={ICON_SIZE.md} color={color} strokeWidth={focused ? 2.5 : 2} />;
}

function GearIcon() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push('/settings')}
      style={{ marginRight: 16 }}
    >
      <Icon name="settings" size={ICON_SIZE.md} color={TEXT_PRIMARY} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const appMode = useAppMode();
  const showBudget = appMode === 'control';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <GearIcon />,
        headerStyle: { backgroundColor: SURFACE },
        headerShadowVisible: false,
        tabBarActiveTintColor: PRIMARY_GREEN,
        tabBarInactiveTintColor: TEXT_MUTED,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
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
