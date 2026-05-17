import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import Purchases from 'react-native-purchases'; 
import { SuperwallProvider } from 'expo-superwall'; // ✅ Only import the Provider

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Purchases.configure({ apiKey: "test_IPhSWnJdocxYfRLAOkXlWdFXZZv" });
    }
    
    // ❌ REMOVED Superwall.configure() from here!

    // 1. Listen for auth state changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && inTabsGroup) {
      router.replace('/'); 
    } else if (session && !inTabsGroup) {
      router.replace('/(tabs)'); 
    }
  }, [session, initialized, segments]);

  // ✅ WRAP YOUR STACK IN THE PROVIDER
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SuperwallProvider apiKeys={{ ios: "sk_8cc80a74f5e19313708d81a78da7b50e5d49c9851f0f4f6d4074400931126abc" }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" /> 
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SuperwallProvider>
    </GestureHandlerRootView>
  );
}