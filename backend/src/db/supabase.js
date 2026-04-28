import { createClient } from '@supabase/supabase-js';

let _client = null;

function sanitizeUrl(raw) {
  if (!raw) return null;
  // Quitar espacios, comillas, retornos
  let url = String(raw).trim().replace(/^["']|["']$/g, '');
  // Quitar barras finales
  url = url.replace(/\/+$/, '');
  // Si pegaron /rest/v1 u otra ruta, quedarse solo con el origin
  try {
    const u = new URL(url);
    url = `${u.protocol}//${u.host}`;
  } catch {
    return url; // dejará que la validación posterior falle con mensaje claro
  }
  return url;
}

function ensureEnv() {
  // Fallback a VITE_SUPABASE_URL para que con setear solo la variable VITE_
  // en Vercel, el backend también pueda leer el URL.
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const url = sanitizeUrl(rawUrl);

  if (!url || !key) {
    const where = process.env.VERCEL ? 'Vercel → Settings → Environment Variables' : 'backend/.env';
    const missing = [
      !url && '(SUPABASE_URL o VITE_SUPABASE_URL)',
      !key && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean).join(' y ');
    throw new Error(`Backend mal configurado: falta ${missing}. Configúralo en ${where} y redeploya.`);
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|com|net|in)$/i.test(url)) {
    throw new Error(
      `SUPABASE_URL no tiene el formato esperado. Recibí: "${url}". ` +
      `Debe ser exactamente https://xxxxx.supabase.co (sin barra final ni rutas).`
    );
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
