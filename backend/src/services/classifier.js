import Anthropic from '@anthropic-ai/sdk';
import { supabase, getSetting } from '../db/supabase.js';

async function getClient() {
  const key = (await getSetting('anthropic_api_key')) || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurado.');
  return new Anthropic({ apiKey: key });
}

const MODEL = 'claude-haiku-4-5-20251001';

const CLASSIFY_SYSTEM = `Eres un consultor que evalúa si un negocio documentado en un video de YouTube (de un emprendedor, generalmente en EE.UU. o Europa) puede inspirar soluciones para problemas reales del mercado latinoamericano.

Vas a recibir:
- Un negocio: nombre, modelo, monetización y resumen.
- Una lista de "pain points" del mercado LATAM con id, título y categoría.

Tu tarea es identificar para cada pain point qué tan relevante es ese negocio como INSPIRACIÓN para resolver el problema en LATAM. No se trata de copiar el negocio, sino de transferir su modelo, estrategia o enfoque a la realidad regional.

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "matches": [
    {
      "pain_point_id": número,
      "relevance_score": 0.0..1.0,
      "reasoning": "1-2 frases concretas explicando POR QUÉ este negocio puede inspirar una solución a ese pain point en LATAM"
    }
  ]
}

Reglas estrictas:
- Solo incluye matches con relevance_score >= 0.3 (filtra ruido)
- Sé conservador: si la conexión no es clara y específica, NO la incluyas
- Considera transferibilidad: ¿el modelo funciona con la infraestructura LATAM (medios de pago, conectividad, regulación)?
- NO incluyas markdown ni explicaciones fuera del JSON.`;

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

async function fetchPainPoints() {
  const { data, error } = await supabase
    .from('pain_points')
    .select('id, title, category, description');
  if (error) throw error;
  return data || [];
}

export async function classifyVideo(videoId, { force = false } = {}) {
  // 1. Carga video + análisis + transcripción
  const { data: v, error } = await supabase
    .from('videos').select('*').eq('id', videoId).maybeSingle();
  if (error) throw error;
  if (!v) throw new Error('video no encontrado');

  const { data: a } = await supabase
    .from('video_analyses').select('*').eq('video_id', videoId).maybeSingle();
  const { data: t } = await supabase
    .from('video_transcripts').select('transcript').eq('video_id', videoId).maybeSingle();

  if (!a) throw new Error('video sin análisis IA todavía. Ejecuta análisis primero.');

  // 2. ¿Ya clasificado? Saltar si no se fuerza
  if (!force) {
    const { count } = await supabase
      .from('video_pain_point_classifications')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);
    if ((count || 0) > 0) return { skipped: true };
  } else {
    await supabase.from('video_pain_point_classifications').delete().eq('video_id', videoId);
  }

  // 3. Construye contexto
  const painPoints = await fetchPainPoints();
  if (painPoints.length === 0) throw new Error('No hay pain points definidos.');

  const businessContext = [
    `NEGOCIO: ${a.business_name || '(sin nombre)'} | Industria: ${a.industry || '?'} | Modelo: ${a.business_model || '?'}`,
    `MONETIZACIÓN: ${a.monetization || '(no especificada)'}`,
    `RESUMEN: ${a.summary || ''}`,
    t?.transcript ? `TRANSCRIPCIÓN (recorte): ${t.transcript.slice(0, 4000)}` : '',
  ].filter(Boolean).join('\n\n');

  const ppList = painPoints.map((p) =>
    `- id=${p.id} [${p.category}] ${p.title} — ${p.description}`
  ).join('\n');

  const userMsg = `${businessContext}\n\nPAIN POINTS LATAM:\n${ppList}`;

  // 4. Llamada IA
  const client = await getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });
  const text = resp.content?.[0]?.text || '{}';

  let parsed;
  try { parsed = JSON.parse(extractJson(text)); }
  catch { parsed = { matches: [] }; }

  // 5. Persistir clasificaciones (solo válidas)
  const validIds = new Set(painPoints.map((p) => p.id));
  const matches = (parsed.matches || []).filter(
    (m) => validIds.has(m.pain_point_id) && m.relevance_score >= 0.3
  );

  if (matches.length > 0) {
    const rows = matches.map((m) => ({
      video_id: videoId,
      pain_point_id: m.pain_point_id,
      relevance_score: m.relevance_score,
      reasoning: m.reasoning || null,
    }));
    const { error: insErr } = await supabase
      .from('video_pain_point_classifications')
      .insert(rows);
    if (insErr) throw insErr;
  }

  return { matches: matches.length };
}

export async function classifyAll({ force = false, limit = null } = {}) {
  // Solo videos con análisis IA disponible
  const { data: analyses } = await supabase.from('video_analyses').select('video_id');
  let ids = (analyses || []).map((a) => a.video_id);

  // Si no se fuerza, saltar los ya clasificados (a nivel de batch top-level)
  if (!force) {
    const { data: classified } = await supabase
      .from('video_pain_point_classifications').select('video_id');
    const set = new Set((classified || []).map((c) => c.video_id));
    ids = ids.filter((id) => !set.has(id));
  }

  const remainingTotal = ids.length;
  if (limit) ids = ids.slice(0, limit);

  const results = [];
  for (const id of ids) {
    try {
      const r = await classifyVideo(id, { force });
      results.push({ id, ok: true, ...r });
    } catch (e) {
      results.push({ id, ok: false, error: e.message });
    }
  }
  return {
    processed: results.length,
    remaining: Math.max(0, remainingTotal - results.length),
    results,
  };
}

// Borra todas las clasificaciones existentes. Se llama UNA vez,
// luego el frontend itera classifyAll() hasta que remaining = 0.
export async function resetClassifications() {
  const { error } = await supabase
    .from('video_pain_point_classifications').delete().neq('id', 0);
  if (error) throw error;
  return { ok: true };
}
