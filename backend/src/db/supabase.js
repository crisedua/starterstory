import { createClient } from '@supabase/supabase-js';

let _client = null;

function ensureEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const where = process.env.VERCEL ? 'Vercel → Settings → Environment Variables' : 'backend/.env';
    throw new Error(
      `Backend mal configurado: SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY ` +
      `no están definidas. Configúralas en ${where} y redeploya.`
    );
  }
  if (!url.startsWith('https://')) {
    throw new Error(`SUPABASE_URL inválida (${url}). Debe ser https://xxx.supabase.co`);
  }
  return { url, key };
}

function buildClient() {
  const { url, key } = ensureEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Proxy lazy: cualquier acceso crea el cliente. Si las env vars
// faltan, lanza un error claro en vez de "fetch failed" críptico.
export const supabase = new Proxy({}, {
  get(_, prop) {
    if (!_client) _client = buildClient();
    const v = _client[prop];
    return typeof v === 'function' ? v.bind(_client) : v;
  },
});

export async function getSetting(key) {
  const { data, error } = await supabase
    .from('app_settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
