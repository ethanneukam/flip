import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import EliteDock from '../../components/EliteDock';
import { IconSymbol } from '../../components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <EliteDock {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00FF87',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="house.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="camera.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="result"
        options={{
          title: 'Result',
          href: null,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="chart.pie.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Rank',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="trophy.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="person.fill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
