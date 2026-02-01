// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// This check prevents the crash during build if keys are temporarily missing
if (!supabaseUrl) {
  console.warn("Supabase URL is missing. Build may fail if static generation is required.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
