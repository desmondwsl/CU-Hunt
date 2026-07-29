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

export default function PlayerLayout() {
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
        name="map"
        options={{
          title: '地圖',
          tabBarIcon: tabIcon('map', 'map-outline'),
        }}
      />
      <Tabs.Screen
        name="scores"
        options={{
          title: '分數',
          tabBarIcon: tabIcon('trophy', 'trophy-outline'),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: '我的',
          tabBarIcon: tabIcon('people', 'people-outline'),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: '廣播',
          tabBarIcon: tabIcon('megaphone', 'megaphone-outline'),
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: '規則',
          tabBarIcon: tabIcon('book', 'book-outline'),
        }}
      />
    </Tabs>
  );
}
