import Anthropic from '@anthropic-ai/sdk';
import { supabase, getSetting } from '../db/supabase.js';

async function getClient() {
  const key = (await getSetting('anthropic_api_key')) || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurado.');
  return new Anthropic({ apiKey: key });
}

const MODEL = 'claude-sonnet-4-6';

const EXTRACT_PROMPT = `Eres un consultor que analiza emprendimientos documentados en el canal de YouTube "Starter Story" para extraer los problemas REALES de mercado que esos negocios resuelven, y luego evaluar si esos problemas son relevantes para el mercado LATAM (América Latina).

Vas a recibir una lista de N emprendimientos con: id (interno), nombre del negocio, industria, modelo, monetización y resumen de su historia.

Tu tarea tiene DOS PASOS:

PASO 1 — EXTRACCIÓN Y CLUSTERIZACIÓN
Para cada emprendimiento, identifica EL pain point principal que resuelve. Luego CLUSTERIZA pain points similares de distintos emprendimientos en grupos. El resultado es una lista deduplicada de pain points distintos. Cada uno con:
- title: corto, claro, en español
- category: una de [fintech, logistica, edtech, healthtech, agtech, govtech, proptech, cleantech, saas-pyme, edtech-talent, ecommerce, contenido, productividad, otro]
- description: el PROBLEMA que aborda (no la solución), 2-3 frases en español
- source_video_ids: array de los ids INTERNOS de los emprendimientos que lo resuelven

PASO 2 — INVESTIGACIÓN DE APLICABILIDAD LATAM
Para cada pain point del PASO 1, evalúa si aplica al mercado LATAM y por qué. Devuelve:
- applies_to_latam: boolean
- severity_latam: 1-10 (qué tan grave es el problema en LATAM)
- latam_reasoning: 3-4 frases explicando por qué aplica (o no) a LATAM, basándote en tu conocimiento del mercado
- evidence_hypothesis: array de {source_org, claim} con organizaciones reales (BID, CEPAL, Banco Mundial, FAO, OECD, OMS, ONU-Hábitat, IICA, Statista, Holon IQ, etc.) y un dato plausible. NO inventes URLs.
- adjustments_for_latam: array de aspectos que cambian al adaptar la solución a LATAM (medios de pago, conectividad, regulación, idioma, hábitos, etc.)

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "pain_points": [
    {
      "title": "string",
      "category": "string",
      "description": "string",
      "source_video_ids": [1, 2],
      "applies_to_latam": true,
      "severity_latam": 7,
      "latam_reasoning": "string",
      "evidence_hypothesis": [{"source_org": "BID", "claim": "string"}],
      "adjustments_for_latam": ["string"]
    }
  ]
}

Reglas estrictas:
- Mínimo 6, máximo 12 pain points distintos en la lista final
- Solo incluye pain points donde applies_to_latam = true (filtra los que no aplican)
- NO inventes URLs en evidence_hypothesis (solo nombre de organización + claim)
- NO incluyas markdown ni explicaciones fuera del JSON`;

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

export async function extractPainPointsFromVideos({ replaceExtracted = false } = {}) {
  // Cargar análisis de videos (con título del video y transcripción si existe)
  const { data: analyses, error } = await supabase
    .from('video_analyses')
    .select('video_id, business_name, industry, business_model, monetization, summary, origin_story, videos(title)');
  if (error) throw error;
  if (!analyses || analyses.length === 0) {
    throw new Error('No hay videos analizados. Ejecuta el análisis IA primero.');
  }

  // Construir input compacto para Claude
  const businesses = analyses.map((a) => ({
    id: a.video_id,
    title: a.videos?.title || '',
    name: a.business_name || a.videos?.title || `Video ${a.video_id}`,
    industry: a.industry,
    model: a.business_model,
    monetization: a.monetization,
    summary: a.summary,
  }));

  const userMsg = `Lista de emprendimientos:\n\n${
    businesses.map((b) =>
      `id=${b.id} | ${b.name} | industria: ${b.industry || '?'} | modelo: ${b.model || '?'}\n` +
      `Monetización: ${b.monetization || ''}\n` +
      `Resumen: ${b.summary || ''}`
    ).join('\n\n')
  }`;

  const client = await getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = resp.content?.[0]?.text || '{}';
  let parsed;
  try { parsed = JSON.parse(extractJson(text)); }
  catch (e) { throw new Error('La IA no devolvió JSON válido. Respuesta cruda: ' + text.slice(0, 300)); }

  const list = (parsed.pain_points || []).filter((p) => p.applies_to_latam);
  if (list.length === 0) throw new Error('La IA no extrajo ningún pain point aplicable a LATAM.');

  // Si replaceExtracted: borrar extracted previos (no toca los manuales)
  if (replaceExtracted) {
    await supabase.from('pain_points').delete().eq('source', 'extracted');
  }

  // Insertar pain points + clasificaciones de videos fuente
  const validVideoIds = new Set(analyses.map((a) => a.video_id));
  const inserted = [];
  for (const pp of list) {
    // Evitar duplicados por título exacto
    const { data: existing } = await supabase
      .from('pain_points')
      .select('id')
      .eq('title', pp.title)
      .maybeSingle();

    let painPointId;
    if (existing) {
      painPointId = existing.id;
      // Refresca campos extraídos
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
      const { data: ins, error: insErr } = await supabase
        .from('pain_points')
        .insert({
          title: pp.title,
          category: pp.category || 'otro',
          description: pp.description,
          severity: pp.severity_latam || 5,
          evidence: pp.evidence_hypothesis || [],
          latam_reasoning: pp.latam_reasoning,
          adjustments_for_latam: pp.adjustments_for_latam || [],
          source: 'extracted',
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      painPointId = ins.id;
    }
    inserted.push({ pain_point_id: painPointId, title: pp.title });

    // Crea clasificaciones para los videos fuente (relevance alta = 0.9 pues vienen del propio video)
    const ids = (pp.source_video_ids || []).filter((id) => validVideoIds.has(id));
    if (ids.length > 0) {
      // Borrar clasificaciones previas de esos videos contra este PP para evitar duplicados
      await supabase
        .from('video_pain_point_classifications')
        .delete()
        .eq('pain_point_id', painPointId)
        .in('video_id', ids);

      const rows = ids.map((vid) => ({
        video_id: vid,
        pain_point_id: painPointId,
        relevance_score: 0.95,
        reasoning: `Pain point extraído directamente desde el análisis de este video.`,
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
