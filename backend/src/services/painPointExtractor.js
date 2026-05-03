import Anthropic from '@anthropic-ai/sdk';
import { supabase, getSetting } from '../db/supabase.js';

async function getClient() {
  const key = (await getSetting('anthropic_api_key')) || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurado.');
  return new Anthropic({ apiKey: key });
}

// Haiku 4.5 es ~5x más rápido que Sonnet y suficiente para clusterización.
// Necesario para caber en los 60s de Vercel.
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `Eres un consultor que analiza emprendimientos de Starter Story para extraer pain points reales que esos negocios resuelven, y evaluar si aplican a LATAM.

Recibes una lista de N emprendimientos (id, nombre, industria, modelo, monetización, resumen).

PASO 1 — EXTRACCIÓN Y CLUSTERIZACIÓN
Para cada emprendimiento, identifica el pain point principal. CLUSTERIZA pain points similares en grupos. Lista deduplicada con:
- title: corto, claro, en español
- category: [fintech, logistica, edtech, healthtech, agtech, govtech, proptech, cleantech, saas-pyme, edtech-talent, ecommerce, contenido, productividad, otro]
- description: el PROBLEMA (no la solución), 2 frases en español
- source_video_ids: array de ids que lo resuelven

PASO 2 — APLICABILIDAD LATAM
Para cada pain point evalúa:
- applies_to_latam: boolean
- severity_latam: 1-10
- latam_reasoning: 2-3 frases sobre por qué aplica a LATAM
- evidence_hypothesis: array de {source_org, claim} con orgs reales (BID, CEPAL, Banco Mundial, FAO, OECD, OMS, Statista). NO inventes URLs.
- adjustments_for_latam: array de ajustes (medios de pago, conectividad, regulación, idioma)

Devuelve SOLO JSON:
{"pain_points":[{"title":"","category":"","description":"","source_video_ids":[],"applies_to_latam":true,"severity_latam":7,"latam_reasoning":"","evidence_hypothesis":[{"source_org":"","claim":""}],"adjustments_for_latam":[""]}]}

Reglas: mínimo 6, máximo 12. Solo applies_to_latam=true. NO markdown.`;

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n).trim() + '…' : s;
}

export async function extractPainPointsFromVideos({ replaceExtracted = false } = {}) {
  const { data: analyses, error } = await supabase
    .from('video_analyses')
    .select('video_id, business_name, industry, business_model, monetization, summary, videos(title)');
  if (error) throw error;
  if (!analyses || analyses.length === 0) {
    throw new Error('No hay videos analizados. Ve a /videos y pulsa "Analizar pendientes" primero.');
  }

  // Resumen compacto: limitamos cada campo para que el prompt quepa
  // y la IA procese en menos tiempo (60s budget de Vercel).
  const businesses = analyses.map((a) => ({
    id: a.video_id,
    name: a.business_name || a.videos?.title?.slice(0, 50) || `Video ${a.video_id}`,
    industry: a.industry || '?',
    model: a.business_model || '?',
    summary: truncate(a.summary, 180),
  }));

  const userMsg = `Emprendimientos:\n\n${
    businesses.map((b) =>
      `id=${b.id} | ${b.name} | ${b.industry} | ${b.model}\n${b.summary}`
    ).join('\n\n')
  }`;

  const client = await getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 3500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = resp.content?.[0]?.text || '{}';
  let parsed;
  try { parsed = JSON.parse(extractJson(text)); }
  catch { throw new Error('La IA no devolvió JSON válido. Respuesta cruda: ' + text.slice(0, 300)); }

  const list = (parsed.pain_points || []).filter((p) => p.applies_to_latam);
  if (list.length === 0) throw new Error('La IA no extrajo ningún pain point aplicable a LATAM.');

  if (replaceExtracted) {
    await supabase.from('pain_points').delete().eq('source', 'extracted');
  }

  const validVideoIds = new Set(analyses.map((a) => a.video_id));
  const inserted = [];
  for (const pp of list) {
    const { data: existing } = await supabase
      .from('pain_points').select('id').eq('title', pp.title).maybeSingle();

    let painPointId;
    if (existing) {
      painPointId = existing.id;
      await supabase.from('pain_points').update({
        category: pp.category || 'otro',
        description: pp.description,
        severity: pp.severity_latam || 5,
        evidence: pp.evidence_hypothesis || [],
        latam_reasoning: pp.latam_reasoning,
        adjustments_for_latam: pp.adjustments_for_latam || [],
        source: 'extracted',
        updated_at: new Date().toISOString(),
      }).eq('id', painPointId);
    } else {
      const { data: ins, error: insErr } = await supabase.from('pain_points').insert({
        title: pp.title,
        category: pp.category || 'otro',
        description: pp.description,
        severity: pp.severity_latam || 5,
        evidence: pp.evidence_hypothesis || [],
        latam_reasoning: pp.latam_reasoning,
        adjustments_for_latam: pp.adjustments_for_latam || [],
        source: 'extracted',
      }).select('id').single();
      if (insErr) throw insErr;
      painPointId = ins.id;
    }
    inserted.push({ pain_point_id: painPointId, title: pp.title });

    const ids = (pp.source_video_ids || []).filter((id) => validVideoIds.has(id));
    if (ids.length > 0) {
      await supabase.from('video_pain_point_classifications')
        .delete().eq('pain_point_id', painPointId).in('video_id', ids);
      const rows = ids.map((vid) => ({
        video_id: vid,
        pain_point_id: painPointId,
        relevance_score: 0.95,
        reasoning: 'Pain point extraído directamente desde el análisis de este video.',
      }));
      await supabase.from('video_pain_point_classifications').insert(rows);
    }
  }

  return {
    extracted: inserted.length,
    pain_points: inserted,
    total_videos_analyzed: analyses.length,
  };
}
