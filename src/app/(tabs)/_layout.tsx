import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

import { BORDER, PRIMARY_GREEN, SURFACE, TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';
import { useAppMode } from '@/features/finance/auth/AppModeProvider';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName, focused: boolean, color: string) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IoniconName)} size={22} color={color} />;
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
      <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
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
          tabBarIcon: ({ color, focused }) => tabIcon('swap-horizontal', focused, color),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          href: showBudget ? undefined : null,
          tabBarIcon: ({ color, focused }) => tabIcon('wallet', focused, color),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => tabIcon('briefcase', focused, color),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => tabIcon('bar-chart', focused, color),
        }}
      />
    </Tabs>
  );
}
