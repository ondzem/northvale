import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing inside .env.local. Database connection will be inactive until populated.');
}

// Prevent createClient from crashing if keys are not configured yet
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ error: { message: 'Supabase credentials are not configured in .env.local.' } }),
        signUp: async () => ({ error: { message: 'Supabase credentials are not configured in .env.local.' } }),
        signInWithOAuth: async () => ({ error: { message: 'Supabase credentials are not configured in .env.local.' } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: 'Supabase credentials are not configured in .env.local.' } })
          })
        })
      })
    };
