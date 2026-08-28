import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key || url.includes('your-resource') || url.trim() === '' || key.trim() === '') {
    return null;
  }

  try {
    _client = createClient(url, key, {
      auth: { persistSession: false }
    });
    console.log('[Supabase] ✅ Client initialisé →', url);
    return _client;
  } catch (e: any) {
    console.error('[Supabase] ❌ Erreur init client:', e?.message);
    return null;
  }
}
