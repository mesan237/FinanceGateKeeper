import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { PRIMARY_GREEN, TEXT_MUTED } from '@/constants/colors';
import { useAuth } from '@/features/finance/auth/auth.hooks';

export default function TabsLayout() {
  const { isReady, hasPin, isLocked } = useAuth();
  if (!isReady) return null;
  if (!hasPin || isLocked) return <Redirect href="/(auth)/pin" />;

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
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
    </Tabs>
  );
}
