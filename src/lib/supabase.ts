import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are defined to avoid the fetch error during SSR or initialization
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Local storage mode will be used.');
}

const isPlaceholder = (url: string) => !url || url.includes('your-project.supabase.co');

if (supabaseUrl && !isPlaceholder(supabaseUrl)) {
  console.log('Supabase initialized with URL:', supabaseUrl);
  
  // Test connection to health endpoint or just the URL
  if (typeof window !== 'undefined') {
    fetch(`${supabaseUrl}/auth/v1/health`)
      .then(res => console.log('Supabase Auth Health Check:', res.status === 200 ? 'OK' : res.status))
      .catch(err => console.error('Supabase Connectivity Test Failed:', err));
  }
}

export const supabase = (supabaseUrl && supabaseAnonKey && !isPlaceholder(supabaseUrl)) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        // Use the native window.fetch to avoid any Proxy-induced "Illegal invocation"
        fetch: (...args) => window.fetch(...args),
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;
