import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://eugjprzdksgattiigvnk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Z2pwcnpka3NnYXR0aWlndm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjQxMDIsImV4cCI6MjA3MDUwMDEwMn0.X72FMF_h_9cm1G1uGmMwxsq4XpPx3MpOHCiaGhxZ4LU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Only use AsyncStorage if we are NOT in a web-ssr environment
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
  },
});