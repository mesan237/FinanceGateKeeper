import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/features/finance/auth/auth.hooks';

export default function AuthGroupLayout() {
  const { isReady, hasPin, isLocked } = useAuth();
  if (!isReady) return null;
  if (hasPin && !isLocked) return <Redirect href="/(tabs)/dashboard" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
