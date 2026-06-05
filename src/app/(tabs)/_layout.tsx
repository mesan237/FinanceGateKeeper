import { Tabs } from 'expo-router';
import React from 'react';

import { PRIMARY_GREEN, TEXT_MUTED } from '@/constants/colors';
import { useAppMode } from '@/features/finance/auth/AppModeProvider';

export default function TabsLayout() {
  const appMode = useAppMode();
  const showBudget = appMode === 'control';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY_GREEN,
        tabBarInactiveTintColor: TEXT_MUTED,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      {/* Learning mode hides budgeting; `href: null` removes it from the bar
          while keeping the route registered. */}
      <Tabs.Screen
        name="budget"
        options={{ title: 'Budget', href: showBudget ? undefined : null }}
      />
      <Tabs.Screen name="projects" options={{ title: 'Projects' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
    </Tabs>
  );
}
