import Anthropic from '@anthropic-ai/sdk';
import { supabase, getSetting } from '../db/supabase.js';

async function getClient() {
  const key = (await getSetting('anthropic_api_key')) || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurado.');
  return new Anthropic({ apiKey: key });
}

const MODEL = 'claude-haiku-4-5-20251001';

const ANALYSIS_PROMPT = `Eres un analista de negocios. Vas a recibir el título, descripción y (si existe) transcripción de un video del canal "Starter Story" donde un emprendedor cuenta su historia. Tu tarea es extraer datos estructurados.

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "business_name": "string o null",
  "founder_name": "string o null",
  "business_model": "saas | marketplace | ecommerce | agency | content | physical | service | otro",
  "industry": "string corta",
  "monetization": "explicación 1-2 frases de cómo gana dinero",
  "revenue_estimate": "string como '$2M/year' o null si no se menciona",
  "origin_story": "2-4 frases sobre cómo empezó",
  "key_strategies": ["estrategia 1", "estrategia 2"],
  "tools_used": ["herramienta 1"],
  "summary": "resumen narrativo de 3-5 frases"
}

Si no hay suficiente información para un campo, usa null o un array vacío. NO incluyas markdown, NO incluyas \`\`\`json, solo el objeto.`;

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

export async function analyzeVideo(videoId, { force = false } = {}) {
  const { data: v, error: vErr } = await supabase
    .from('videos').select('*').eq('id', videoId).maybeSingle();
  if (vErr) throw vErr;
  if (!v) throw new Error('video no encontrado');

  const { data: existing } = await supabase
    .from('video_analyses').select('id').eq('video_id', videoId).maybeSingle();
  if (existing && !force) return;
  if (existing && force) {
    await supabase.from('video_analyses').delete().eq('video_id', videoId);
  }

  const { data: t } = await supabase
    .from('video_transcripts').select('*').eq('video_id', videoId).maybeSingle();

  const content = [
    `TÍTULO: ${v.title || ''}`,
    `DESCRIPCIÓN: ${v.description || ''}`,
    t?.transcript ? `TRANSCRIPCIÓN:\n${t.transcript.slice(0, 12000)}` : '(sin transcripción)',
  ].join('\n\n');

  const client = await getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: ANALYSIS_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const text = resp.content?.[0]?.text || '{}';
  let parsed = {};
  try { parsed = JSON.parse(extractJson(text)); }
  catch { parsed = { summary: text.slice(0, 500) }; }

  await supabase.from('video_analyses').insert({
    video_id: videoId,
    business_name: parsed.business_name || null,
    founder_name: parsed.founder_name || null,
    business_model: parsed.business_model || null,
    industry: parsed.industry || null,
    monetization: parsed.monetization || null,
    revenue_estimate: parsed.revenue_estimate || null,
    origin_story: parsed.origin_story || null,
    key_strategies: parsed.key_strategies || [],
    tools_used: parsed.tools_used || [],
    summary: parsed.summary || null,
  });
}

export async function analyzeAllUnanalyzed() {
  // Trae videos sin análisis (left join no existe en supabase-js, usamos two-step)
  const { data: analyzed } = await supabase.from('video_analyses').select('video_id');
  const analyzedIds = new Set((analyzed || []).map((a) => a.video_id));

  const { data: videos } = await supabase
    .from('videos').select('id').limit(200);

  const pending = (videos || []).filter((v) => !analyzedIds.has(v.id)).slice(0, 50);

  const results = [];
  for (const r of pending) {
    try { await analyzeVideo(r.id); results.push({ id: r.id, ok: true }); }
    catch (e) { results.push({ id: r.id, ok: false, error: e.message }); }
  }
  return results;
}
