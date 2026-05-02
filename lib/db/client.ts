import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let _admin: SupabaseClient<Database> | null = null;

export function getAdminClient(): SupabaseClient<Database> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars');
  _admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
