import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

const DECOMMISSIONED_SUPABASE_HOSTS = [
  'uibaudggdyerfamvmobw.supabase.co',
  'gupkydkavvszqawvqukw.supabase.co',
];

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseUrl.includes('your-project')
  ) {
    return false;
  }

  // Skip legacy decommissioned domains so client uploads don't stall on dead DNS
  if (DECOMMISSIONED_SUPABASE_HOSTS.some((h) => supabaseUrl.includes(h))) {
    return false;
  }

  return true;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}
