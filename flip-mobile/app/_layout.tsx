import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import Superwall from '@superwall/react-native-superwall';
import Purchases from 'react-native-purchases'; // You'll need to npx expo install react-native-purchases

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    Purchases.configure({ apiKey: "test_IPhSWnJdocxYfRLAOkXlWdFXZZv" });

   Superwall.configure({apiKey: "sk_8cc80a74f5e19313708d81a78da7b50e5d49c9851f0f4f6d4074400931126abc"})
    
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

    // 2. Logic: If no session and not on Auth page, go to Auth.
    // If session and on Auth page, go to Tabs.
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && inTabsGroup) {
      router.replace('/'); // Redirect to Auth
    } else if (session && !inTabsGroup) {
      router.replace('/(tabs)'); // Redirect to Dashboard
    }
  }, [session, initialized, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" /> 
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}