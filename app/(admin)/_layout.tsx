import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Colors } from '@/constants/Colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(filled: IconName, outline: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: -0.1,
        },
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '總覽',
          tabBarIcon: tabIcon('grid', 'grid-outline'),
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: '廣播',
          tabBarIcon: tabIcon('megaphone', 'megaphone-outline'),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: '事件',
          tabBarIcon: tabIcon('flash', 'flash-outline'),
        }}
      />
      <Tabs.Screen
        name="overrides"
        options={{
          title: '覆寫',
          tabBarIcon: tabIcon('construct', 'construct-outline'),
        }}
      />
    </Tabs>
  );
}
