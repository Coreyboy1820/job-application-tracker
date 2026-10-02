import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey)

// The publishable key is intended for browser apps. Database access is protected
// by the SQL migration's grants and Row Level Security policies, not by hiding this key.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, publishableKey)
  : null
