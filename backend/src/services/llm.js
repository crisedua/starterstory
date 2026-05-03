import OpenAI from 'openai';
import { getSetting } from '../db/supabase.js';

// Capa única para llamadas a la IA. Cambiar de proveedor o de modelo
// se hace acá sin tocar los 5 servicios que la usan.

async function getClient() {
  const key = (await getSetting('openai_api_key')) || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY no configurado. Configúralo en Ajustes o como variable de entorno.');
  return new OpenAI({ apiKey: key });
}

// Modelo configurable por env var (sin redeploy si lo cambias en Vercel)
export const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

/**
 * Llama al modelo y parsea la respuesta como JSON.
 * El system prompt DEBE mencionar la palabra "JSON" para que OpenAI
 * acepte response_format: json_object.
 */
export async function chatJson({ system, user, maxTokens = 2000 }) {
  const client = await getClient();
  const resp = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const text = resp.choices[0]?.message?.content || '{}';
  try { return JSON.parse(text); }
  catch (e) {
    throw new Error('La IA no devolvió JSON válido. Respuesta: ' + text.slice(0, 300));
  }
}

/** Llama al modelo y devuelve texto plano. */
export async function chatText({ system, user, maxTokens = 2000 }) {
  const client = await getClient();
  const resp = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return resp.choices[0]?.message?.content || '';
}
