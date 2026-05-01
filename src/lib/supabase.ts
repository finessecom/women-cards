import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are defined to avoid the fetch error during SSR or initialization
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Local storage mode will be used.');
}

const isPlaceholder = (url: string) => !url || url.includes('your-project.supabase.co');

if (supabaseUrl && !isPlaceholder(supabaseUrl)) {
  console.log('Supabase client check: URL present');
}

export const supabase = (supabaseUrl && supabaseAnonKey && !isPlaceholder(supabaseUrl)) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
