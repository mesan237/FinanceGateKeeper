import { DrawerActions } from '@react-navigation/native';
import { Tabs, useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { useTheme } from '@/theme';

// Compact header: the title bar's content area below the status bar. Trimmed
// from the platform default (~56 on Android) so the header sits tighter now
// that the screen title lives only here and not duplicated in the page body.
const HEADER_CONTENT_HEIGHT = 40;

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

function DeletedProjectsLink() {
  const router = useRouter();
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Recently deleted projects"
      onPress={() => router.push('/projects/deleted')}
      hitSlop={12}
      style={{ marginRight: 16 }}
    >
      <Icon name="delete" size={ICON_SIZE.md} color={c.TEXT_PRIMARY} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => <MenuIcon />,
        headerTitleAlign: 'center',
        // Total header height includes the status-bar inset (the title sits in
        // the remaining HEADER_CONTENT_HEIGHT below it).
        headerStyle: {
          backgroundColor: c.SURFACE,
          height: insets.top + HEADER_CONTENT_HEIGHT,
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
          tabBarIcon: ({ color, focused }) => tabIcon('budget', focused, color),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => tabIcon('projects', focused, color),
          headerRight: () => <DeletedProjectsLink />,
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
