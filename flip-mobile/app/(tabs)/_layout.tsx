import { Tabs } from 'expo-router';
import React from 'react';
import EliteDock from '@/components/EliteDock';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
  <Tabs
  tabBar={(props) => <EliteDock {...props} />}
  screenOptions={{ headerShown: false }}
>
      
    </Tabs>
  );
}