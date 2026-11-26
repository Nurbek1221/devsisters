import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdminUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ''
  );
}

export function isSupabaseAdminConfigured(): boolean {
  const url = getSupabaseAdminUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  return Boolean(url && key && !url.includes('uibaudggdyerfamvmobw'));
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  if (!cachedAdmin) {
    cachedAdmin = createClient(
      getSupabaseAdminUrl(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return cachedAdmin;
}

export function parseSupabasePublicObjectUrl(
  url?: string
): { bucket: string; path: string } | null {
  if (!url) return null;
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length);
  const slashIdx = rest.indexOf('/');
  if (slashIdx === -1) return null;
  const bucket = decodeURIComponent(rest.slice(0, slashIdx));
  const objectPath = decodeURIComponent(rest.slice(slashIdx + 1).split('?')[0]);
  if (!bucket || !objectPath) return null;
  return { bucket, path: objectPath };
}
