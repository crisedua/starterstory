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
1. Driver emocional concreto (independencia, demostrar algo, dejar un trabajo, ayudar a alguien)
2. Beneficiarios además del usuario (familia, comunidad, clientes)
3. Consecuencias de NO lograrlo (qué pierdes, qué dolor evitas)
4. Cambio identitario (en quién te conviertes al lograrlo)

Devuelve SOLO un JSON:
{
  "is_deep_enough": boolean,
  "score": número 0-100,
  "missing": ["aspecto faltante 1"],
  "follow_ups": ["pregunta para ahondar 1", "pregunta para ahondar 2"],
  "feedback": "1-2 frases que empujen a profundizar"
}`,

  M: `Evalúa esta respuesta a la pregunta "¿Qué acciones masivas tomarás?" del Rapid Planning Method de Tony Robbins.

Una respuesta SUFICIENTEMENTE PROFUNDA debe incluir:
1. Brainstorm amplio (mínimo 8-10 acciones distintas, no 2-3)
2. Acciones concretas y ejecutables (no genéricas como "estudiar más")
3. Recursos disponibles (tiempo, dinero, habilidades, contactos)
4. Restricciones reales
5. Disposición a sacrificar algo

Devuelve SOLO un JSON:
{
  "is_deep_enough": boolean,
  "score": número 0-100,
  "missing": ["aspecto faltante 1"],
  "follow_ups": ["pregunta 1", "pregunta 2"],
  "feedback": "1-2 frases"
}`,
};

export async function depthCheck(step, answer) {
  if (!['R', 'P', 'M'].includes(step)) throw new Error('paso inválido');
  if (!answer || answer.trim().length < 5) {
    return {
      is_deep_enough: false,
      score: 0,
      missing: ['respuesta vacía o demasiado corta'],
      follow_ups: ['Escribe al menos un párrafo con tu respuesta'],
      feedback: 'Tu respuesta necesita más sustancia. No avances sin una respuesta real.',
    };
  }

  try {
    return await chatJson({
      system: DEPTH_PROMPTS[step],
      user: answer,
      maxTokens: 800,
    });
  } catch (e) {
    return {
      is_deep_enough: false,
      score: 50,
      missing: [],
      follow_ups: [],
      feedback: e.message.slice(0, 300),
    };
  }
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
  "skills": ["habilidad 1", "habilidad 2"],
  "resources": ["recurso disponible 1"],
  "constraints": ["restricción 1", "restricción 2"],
  "business_type_preference": "saas | marketplace | ecommerce | agencia | contenido | servicio | fisico | otro",
  "preferred_industries": ["industria 1", "industria 2"],
  "willing_to_sacrifice": ["lo que está dispuesto a sacrificar"],
  "emotional_drivers": ["driver 1", "driver 2"],
  "location": "país o ciudad si se menciona",
  "fulltime_or_side": "fulltime | side | ambos | no_especificado",
  "risk_tolerance": "baja | media | alta",
  "interests_categories": ["fintech", "edtech", "logistica", "salud", "agro", "gobierno", "etc."]
}

Si un campo no se puede inferir, usa null o array vacío. Para capital_band: muy_bajo (<$1K), bajo ($1K-$10K), medio ($10K-$50K), alto (>$50K).`;

// Sugiere acciones masivas personalizadas para el step M.
// Toma R + P actuales del usuario + pain points + estrategias reales
// del catálogo, y la IA produce acciones concretas alineadas a SU caso.
const SUGGEST_ACTIONS_PROMPT = `Eres un coach de emprendimiento que ayuda a un solopreneur LATAM a definir su Massive Action Plan (M del RPM de Tony Robbins).

Recibes:
1. El RESULTADO que el usuario quiere lograr (R)
2. Su PROPÓSITO (P) - por qué lo quiere
3. Una lista de pain points reales del mercado LATAM que el usuario podría atacar
4. Estrategias y herramientas que negocios reales (Starter Story) usaron para resolver problemas equivalentes

Tu tarea: generar 8-12 acciones MASIVAS, CONCRETAS y EJECUTABLES que ESTE usuario específico podría tomar para llegar a su resultado. Las acciones deben:
- Ser específicas al perfil del usuario (su R y P)
- Drawing inspiration from real strategies del catálogo (no inventar genéricas)
- Ser realistas para un solopreneur LATAM con recursos limitados
- Cubrir distintos frentes: validación, construcción, distribución, monetización, hábitos

Devuelve SOLO un JSON válido con esta forma exacta:
{
  "suggested_actions": [
    {
      "action": "acción concreta en una frase",
      "category": "validacion | construccion | distribucion | monetizacion | habito | otro",
      "leverage": "alto | medio | bajo",
      "rationale": "1 frase corta de por qué esta acción es relevante PARA ESTE USUARIO"
    }
  ],
  "first_24h_priority": "1-2 frases sobre las 2-3 acciones más importantes a tomar en las próximas 24 horas, dado el R y P del usuario"
}

Reglas:
- Mínimo 8, máximo 12 acciones
- Cada acción debe ser ejecutable mañana, no abstracta
- Si el usuario menciona horas/semana o capital, respétalos`;

export async function suggestActions(profileId) {
  const { data: p } = await supabase
    .from('rpm_profiles').select('*').eq('id', profileId).maybeSingle();
  if (!p) throw new Error('perfil no encontrado');
  if (!p.results_raw?.trim() || !p.purpose_raw?.trim()) {
    throw new Error('Necesitas completar Results y Purpose antes de pedir sugerencias para Massive Action.');
  }

  const [{ data: painPoints }, { data: analyses }] = await Promise.all([
    supabase.from('pain_points').select('id, title, category, description, severity').order('severity', { ascending: false }).limit(20),
    supabase.from('video_analyses').select('business_name, business_model, key_strategies, tools_used'),
  ]);

  // Agregamos estrategias y tools (top más frecuentes)
  const stratFreq = {};
  const toolFreq = {};
  for (const a of analyses || []) {
    for (const s of (a.key_strategies || [])) {
      const k = String(s).trim();
      if (k) stratFreq[k] = (stratFreq[k] || 0) + 1;
    }
    for (const t of (a.tools_used || [])) {
      const k = String(t).trim();
      if (k) toolFreq[k] = (toolFreq[k] || 0) + 1;
    }
  }
  const topStrats = Object.entries(stratFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([s]) => s);
  const topTools = Object.entries(toolFreq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([s]) => s);

  const userMsg = `RESULTS DEL USUARIO:
${p.results_raw}

PURPOSE DEL USUARIO:
${p.purpose_raw}

PAIN POINTS LATAM DISPONIBLES:
${(painPoints || []).map((pp) => `- [${pp.category}] ${pp.title} (severidad ${pp.severity}/10): ${pp.description}`).join('\n')}

ESTRATEGIAS REALES USADAS POR NEGOCIOS DEL CATÁLOGO:
${topStrats.map((s) => `- ${s}`).join('\n')}

HERRAMIENTAS COMUNES:
${topTools.join(', ')}`;

  return chatJson({
    system: SUGGEST_ACTIONS_PROMPT,
    user: userMsg,
    maxTokens: 2500,
  });
}

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
