import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    // 2. Auth State Listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (initializing) return;

    // Check if the user is currently in the "(tabs)" group
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && inTabsGroup) {
      // If not logged in and trying to access tabs, kick them to the login (index)
      router.replace('/');
    } else if (session && !inTabsGroup) {
      // If logged in and on the login screen, push them to the scanner or dashboard
      // Assuming you want them to go to the scanner immediately:
      router.replace('/scanner' as any);
    }
  }, [session, initializing, segments]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        {/* Tactical Loading State */}
        <Text style={{ color: '#e8ff47', fontFamily: 'monospace', marginBottom: 10 }}>› INITIALIZING_SYSTEM...</Text>
        <ActivityIndicator color="#e8ff47" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

// Simple Text component import if you want the text label above
import { Text } from 'react-native';