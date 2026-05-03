import { supabase } from '../db/supabase.js';
import { chatJson } from './llm.js';

const DEPTH_PROMPTS = {
  R: `Evalúa esta respuesta a la pregunta "¿Qué quieres lograr?" del Rapid Planning Method de Tony Robbins.

Una respuesta SUFICIENTEMENTE PROFUNDA debe incluir:
1. Resultado específico (no abstracto como "ganar dinero" o "ser exitoso")
2. Cantidad concreta (cifra de ingresos, número de clientes, etc.)
3. Plazo (fecha o timeframe)
4. Criterio de éxito medible
5. Tipo de negocio o vehículo (saas, agencia, ecommerce, contenido, servicio, etc.)
6. Compromiso (full-time vs side project) y horas/semana

Devuelve SOLO un JSON con esta forma:
{
  "is_deep_enough": boolean,
  "score": número 0-100,
  "missing": ["aspecto faltante 1", "aspecto faltante 2"],
  "follow_ups": ["pregunta específica 1", "pregunta específica 2"],
  "feedback": "1-2 frases con tono de coach Robbins, directo pero no condescendiente"
}`,

  P: `Evalúa esta respuesta a la pregunta "¿Por qué lo quieres?" del Rapid Planning Method de Tony Robbins.

Sin un Purpose fuerte, las acciones no se sostienen. Una respuesta SUFICIENTEMENTE PROFUNDA debe ir más allá de lo superficial e incluir alguno de estos:
1. Driver emocional concreto
2. Beneficiarios además del usuario
3. Consecuencias de NO lograrlo
4. Cambio identitario

Devuelve SOLO un JSON:
{
  "is_deep_enough": boolean,
  "score": número 0-100,
  "missing": ["aspecto faltante 1"],
  "follow_ups": ["pregunta para ahondar 1"],
  "feedback": "1-2 frases que empujen a profundizar"
}`,

  M: `Evalúa esta respuesta a la pregunta "¿Qué acciones masivas tomarás?" del Rapid Planning Method de Tony Robbins.

Una respuesta SUFICIENTEMENTE PROFUNDA debe incluir:
1. Brainstorm amplio (mínimo 8-10 acciones distintas)
2. Acciones concretas y ejecutables
3. Recursos disponibles
4. Restricciones reales
5. Disposición a sacrificar algo

Devuelve SOLO un JSON:
{
  "is_deep_enough": boolean,
  "score": número 0-100,
  "missing": ["aspecto faltante 1"],
  "follow_ups": ["pregunta 1"],
  "feedback": "1-2 frases"
}`,
};

export async function depthCheck(step, answer) {
  if (!['R', 'P', 'M'].includes(step)) throw new Error('paso inválido');
  if (!answer || answer.trim().length < 5) {
    return {
      is_deep_enough: false, score: 0, missing: ['respuesta vacía o demasiado corta'],
      follow_ups: ['Escribe al menos un párrafo'],
      feedback: 'Tu respuesta necesita más sustancia.',
    };
  }
  try { return await chatJson({ system: DEPTH_PROMPTS[step], user: answer, maxTokens: 800 }); }
  catch (e) { return { is_deep_enough: false, score: 50, missing: [], follow_ups: [], feedback: e.message.slice(0, 300) }; }
}

const SUGGEST_ACTIONS_PROMPT = `Eres un coach de emprendimiento que ayuda a un solopreneur LATAM a definir su Massive Action Plan (M del RPM de Tony Robbins).

Recibes:
1. El RESULTADO (R) y PROPÓSITO (P) del usuario
2. Una lista de pain points reales del mercado LATAM, CADA UNO con sus videos fuente (negocios reales del canal Starter Story que abordan ese problema), incluyendo las estrategias que cada video usó

Tu tarea: generar 8-12 acciones MASIVAS, CONCRETAS y EJECUTABLES que ESTE usuario podría tomar. CADA acción debe estar EXPLÍCITAMENTE ANCLADA a:
  - un pain_point_id específico
  - un video_id específico de los que abordan ese pain point
  - una estrategia citada de las que usó ese video

Las acciones deben:
- Ser específicas al perfil del usuario (su R y P)
- Ser inspiradas en estrategias REALES de los videos del catálogo
- Ser realistas para un solopreneur LATAM con recursos limitados
- Cubrir distintos frentes: validación, construcción, distribución, monetización, hábitos

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "suggested_actions": [
    {
      "action": "acción concreta en una frase",
      "category": "validacion | construccion | distribucion | monetizacion | habito | otro",
      "leverage": "alto | medio | bajo",
      "pain_point_id": número (id real),
      "video_id": número (id real del video que inspira),
      "inspired_by_strategy": "estrategia específica del video citada o parafraseada",
      "rationale": "1 frase de por qué esta acción es relevante para el usuario, conectando R/P con el pain point"
    }
  ],
  "first_24h_priority": "1-2 frases sobre las 2-3 acciones más importantes para las próximas 24 horas"
}

Reglas estrictas:
- Mínimo 8, máximo 12 acciones
- TODAS deben tener pain_point_id Y video_id válidos (de la lista que te paso)
- Cada inspired_by_strategy debe venir de las estrategias del video citado, no inventada
- No incluyas markdown ni texto fuera del JSON`;

export async function suggestActions(profileId) {
  const { data: p } = await supabase
    .from('rpm_profiles').select('*').eq('id', profileId).maybeSingle();
  if (!p) throw new Error('perfil no encontrado');
  if (!p.results_raw?.trim() || !p.purpose_raw?.trim()) {
    throw new Error('Necesitas completar Results y Purpose antes de pedir sugerencias para Massive Action.');
  }

  // Cargar pain points + clasificaciones (videos fuente con sus estrategias)
  const { data: painPoints } = await supabase
    .from('pain_points')
    .select('id, title, category, description, severity')
    .order('severity', { ascending: false })
    .limit(15);

  if (!painPoints || painPoints.length === 0) {
    throw new Error('No hay pain points. Extrae pain points desde los videos primero.');
  }

  const ppIds = painPoints.map((pp) => pp.id);
  const { data: classifications } = await supabase
    .from('video_pain_point_classifications')
    .select('pain_point_id, video_id, videos(id, title, url, video_analyses(business_name, key_strategies, tools_used))')
    .in('pain_point_id', ppIds)
    .order('relevance_score', { ascending: false });

  // Top 2 videos por pain point
  const videosByPain = {};
  for (const c of classifications || []) {
    if (!videosByPain[c.pain_point_id]) videosByPain[c.pain_point_id] = [];
    if (videosByPain[c.pain_point_id].length < 2 && c.videos) {
      videosByPain[c.pain_point_id].push(c.videos);
    }
  }

  const ppContext = painPoints
    .filter((pp) => videosByPain[pp.id]?.length > 0)
    .map((pp) => {
      const videos = videosByPain[pp.id].map((v) => {
        const a = v.video_analyses?.[0] || {};
        const strats = (a.key_strategies || []).slice(0, 4).map((s) => `      • ${s}`).join('\n');
        return `   video_id=${v.id} | "${a.business_name || v.title?.slice(0, 50)}"\n     Estrategias:\n${strats || '      (sin estrategias listadas)'}`;
      }).join('\n');
      return `pain_point_id=${pp.id} | [${pp.category}] ${pp.title} (severidad ${pp.severity}/10)\n  Descripción: ${pp.description}\n  Videos fuente:\n${videos}`;
    })
    .join('\n\n');

  if (!ppContext) {
    throw new Error('No hay pain points con videos clasificados. Extrae pain points (que crea las clasificaciones automáticamente) o ejecuta "Clasificar pendientes" en /pain-points.');
  }

  const userMsg = `RESULTS DEL USUARIO:
${p.results_raw}

PURPOSE DEL USUARIO:
${p.purpose_raw}

PAIN POINTS LATAM CON SUS VIDEOS FUENTE Y ESTRATEGIAS:

${ppContext}`;

  const result = await chatJson({
    system: SUGGEST_ACTIONS_PROMPT,
    user: userMsg,
    maxTokens: 3000,
  });

  // Adjuntar metadata de pain points y videos al response para que el frontend
  // pueda renderizar nombres reales sin tener que pedirlos por separado
  const ppMeta = Object.fromEntries(painPoints.map((pp) => [pp.id, pp]));
  const videoMeta = {};
  for (const list of Object.values(videosByPain)) {
    for (const v of list) {
      videoMeta[v.id] = {
        id: v.id,
        title: v.title,
        url: v.url,
        business_name: v.video_analyses?.[0]?.business_name,
      };
    }
  }

  return {
    ...result,
    pain_points_used: ppMeta,
    videos_used: videoMeta,
  };
}

const PROCESS_PROMPT = `Eres un consultor de negocios que recibe un perfil RPM (Rapid Planning Method de Tony Robbins) de un emprendedor LATAM.

Tu trabajo es procesar las respuestas crudas y extraer una representación estructurada que un motor de generación de soluciones pueda usar después para proponer ideas de negocio personalizadas.

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "results_summary": "1-2 frases resumiendo el resultado deseado",
  "purpose_summary": "1-2 frases resumiendo el porqué",
  "ambition_level": "baja | media | alta",
  "time_horizon_months": número (en cuántos meses quiere lograrlo),
  "monthly_revenue_target_usd": número o null,
  "weekly_hours_available": número o null,
  "capital_available_usd": número o null,
  "capital_band": "muy_bajo | bajo | medio | alto",
  "skills": ["habilidad 1"],
  "resources": ["recurso 1"],
  "constraints": ["restricción 1"],
  "business_type_preference": "saas | marketplace | ecommerce | agencia | contenido | servicio | fisico | otro",
  "preferred_industries": ["industria 1"],
  "willing_to_sacrifice": ["lo que sacrifica"],
  "emotional_drivers": ["driver 1"],
  "location": "país o ciudad",
  "fulltime_or_side": "fulltime | side | ambos | no_especificado",
  "risk_tolerance": "baja | media | alta",
  "interests_categories": ["fintech", "edtech", "etc."]
}

Si un campo no se puede inferir, usa null o array vacío. Para capital_band: muy_bajo (<$1K), bajo ($1K-$10K), medio ($10K-$50K), alto (>$50K).`;

export async function processProfile(profileId) {
  const { data: p, error } = await supabase
    .from('rpm_profiles').select('*').eq('id', profileId).maybeSingle();
  if (error) throw error;
  if (!p) throw new Error('perfil no encontrado');

  const content = `RESULTS:
${p.results_raw || '(vacío)'}

PURPOSE:
${p.purpose_raw || '(vacío)'}

MASSIVE ACTION PLAN:
${p.massive_action_raw || '(vacío)'}`;

  const parsed = await chatJson({
    system: PROCESS_PROMPT,
    user: content,
    maxTokens: 2000,
  });

  await supabase.from('rpm_profiles').update({
    ai_interpretation: parsed,
    is_complete: true,
    updated_at: new Date().toISOString(),
  }).eq('id', profileId);

  return parsed;
}
