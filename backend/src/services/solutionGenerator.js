import { supabase } from '../db/supabase.js';
import { chatJson } from './llm.js';

const SYSTEM_PROMPT = `Eres un consultor que ayuda a un emprendedor LATAM a identificar soluciones de negocio viables, cruzando tres fuentes de información:

1. Su perfil RPM (Rapid Planning Method de Tony Robbins): Results, Purpose, Massive Action Plan, restricciones reales (capital, horas, habilidades).
2. Pain points reales del mercado LATAM con evidencia y razonamiento de aplicabilidad.
3. Para cada pain point, 1-2 negocios de Starter Story (en EE.UU./Europa) que abordan problemas equivalentes.

Tu tarea: generar EXACTAMENTE 4 propuestas de solución que cumplan TODAS estas condiciones:

A. Resuelven un pain point LATAM específico (referencia explícita por id).
B. Inspiradas (NO copiadas) en 1-2 negocios reales del catálogo (referencia por video_id).
C. Adaptadas al contexto LATAM: medios de pago locales (transferencias, billeteras, cash), conectividad, regulación, idioma, hábitos culturales, nivel de digitalización.
D. Alineadas con TU RPM: el motor sabe tu capital, horas/semana, habilidades, drivers emocionales y meta de ingresos. NO propongas algo imposible.
E. Con dificultad calificada (baja, media o alta) basada en capital, habilidades y complejidad técnica.
F. Con un fit_score 0-100 que combine: severidad del pain point + alineación RPM + viabilidad de implementación.

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "solutions": [
    {
      "title": "string corto y claro",
      "description": "2-4 frases: qué es la solución y cómo entrega valor",
      "pain_point_id": número (id real),
      "latam_adaptation": "2-3 frases sobre los ajustes específicos para LATAM",
      "rpm_alignment": "2-3 frases explicando por qué esta solución calza con el perfil RPM específico del usuario",
      "difficulty": "baja | media | alta",
      "difficulty_reasoning": "1-2 frases sobre capital, habilidades y complejidad",
      "fit_score": número 0-100,
      "fit_score_breakdown": {
        "pain_severity": número 0-40,
        "rpm_fit": número 0-40,
        "viability": número 0-20
      },
      "source_video_ids": [array de ids reales],
      "source_inspiration": "1 frase explicando QUÉ tomas de cada video y cómo lo adaptas",
      "first_steps": ["paso accionable 1", "paso 2", "paso 3"],
      "monetization_model": "saas | servicio | comisión | suscripción | producto | otro",
      "monthly_revenue_potential_usd": número estimado o null
    }
  ]
}

Reglas estrictas:
- EXACTAMENTE 4 soluciones distintas
- Cada una debe ser ejecutable POR EL USUARIO con sus recursos reales
- source_video_ids deben ser ids reales que aparecen en la lista de videos
- pain_point_id debe ser id real de la lista de pain points
- fit_score debe ser la suma de pain_severity + rpm_fit + viability`;

export async function generateSolutions({ replaceExisting = true } = {}) {
  const { data: profile } = await supabase
    .from('rpm_profiles')
    .select('*')
    .eq('user_label', 'default')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile || !profile.is_complete) {
    throw new Error('Debes completar y procesar tu perfil RPM antes de generar soluciones.');
  }

  const { data: painPoints } = await supabase
    .from('pain_points')
    .select('*')
    .order('severity', { ascending: false });

  if (!painPoints || painPoints.length === 0) {
    throw new Error('No hay pain points. Extrae pain points desde los videos primero.');
  }

  const { data: classifications } = await supabase
    .from('video_pain_point_classifications')
    .select('*, videos(id, title, url, video_analyses(business_name, industry, business_model, monetization, summary))')
    .order('relevance_score', { ascending: false });

  if (!classifications || classifications.length === 0) {
    throw new Error('No hay clasificaciones video↔pain-point. Clasifica los videos primero.');
  }

  const topByPain = {};
  for (const c of classifications) {
    if (!topByPain[c.pain_point_id]) topByPain[c.pain_point_id] = [];
    if (topByPain[c.pain_point_id].length < 2) topByPain[c.pain_point_id].push(c);
  }

  const rpm = profile.ai_interpretation || {};

  const ppContext = painPoints
    .filter((p) => topByPain[p.id]?.length > 0)
    .map((p) => {
      const videos = topByPain[p.id].map((c) => {
        const a = c.videos?.video_analyses?.[0] || {};
        return `    - video_id=${c.videos?.id} | ${a.business_name || c.videos?.title || ''} | ${a.business_model || ''} | ${a.industry || ''} | ${(a.summary || '').slice(0, 200)}`;
      }).join('\n');
      return `pain_point_id=${p.id} | [${p.category}] ${p.title}\n  Descripción: ${p.description}\n  LATAM: ${p.latam_reasoning || '(sin razonamiento)'}\n  Videos relacionados:\n${videos}`;
    }).join('\n\n');

  if (!ppContext) {
    throw new Error('No hay combinaciones pain-point + video. Asegúrate de tener clasificaciones.');
  }

  const userMsg = `PERFIL RPM DEL USUARIO:
${JSON.stringify(rpm, null, 2)}

PAIN POINTS LATAM CON VIDEOS DE INSPIRACIÓN:

${ppContext}`;

  const parsed = await chatJson({
    system: SYSTEM_PROMPT,
    user: userMsg,
    maxTokens: 4000,
  });

  const solutions = parsed.solutions || [];
  if (solutions.length === 0) throw new Error('La IA no generó ninguna solución.');

  if (replaceExisting) {
    await supabase.from('solutions').delete().eq('rpm_profile_id', profile.id);
  }

  const validVideoIds = new Set(classifications.map((c) => c.videos?.id).filter(Boolean));
  const validPainIds = new Set(painPoints.map((p) => p.id));
  const inserted = [];

  for (const s of solutions) {
    if (!validPainIds.has(s.pain_point_id)) continue;

    const { data: ins, error: insErr } = await supabase.from('solutions').insert({
      rpm_profile_id: profile.id,
      pain_point_id: s.pain_point_id,
      title: s.title,
      description: s.description,
      latam_adaptation: s.latam_adaptation,
      rpm_alignment: s.rpm_alignment,
      difficulty: s.difficulty,
      difficulty_reasoning: s.difficulty_reasoning || null,
      fit_score: s.fit_score,
      fit_score_breakdown: s.fit_score_breakdown || null,
      first_steps: s.first_steps || [],
      monetization_model: s.monetization_model || null,
      monthly_revenue_potential_usd: s.monthly_revenue_potential_usd || null,
    }).select('id').single();

    if (insErr) { console.error('insert solution', insErr.message); continue; }
    const solutionId = ins.id;

    const ids = (s.source_video_ids || []).filter((id) => validVideoIds.has(id));
    if (ids.length > 0) {
      const rows = ids.map((vid) => ({
        solution_id: solutionId,
        video_id: vid,
        inspiration_note: s.source_inspiration || null,
      }));
      await supabase.from('solution_video_sources').insert(rows);
    }

    inserted.push({ solution_id: solutionId, title: s.title, pain_point_id: s.pain_point_id, fit_score: s.fit_score });
  }

  return {
    generated: inserted.length,
    rpm_profile_id: profile.id,
    solutions: inserted,
  };
}
