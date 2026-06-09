import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { BORDER, PRIMARY_GREEN, SURFACE, TEXT_MUTED } from '@/constants/colors';
import { useAppMode } from '@/features/finance/auth/AppModeProvider';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName, focused: boolean, color: string) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IoniconName)} size={22} color={color} />;
}

export default function TabsLayout() {
  const appMode = useAppMode();
  const showBudget = appMode === 'control';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
