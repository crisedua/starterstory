import Anthropic from '@anthropic-ai/sdk';
import { supabase, getSetting } from '../db/supabase.js';

async function getClient() {
  const key = (await getSetting('anthropic_api_key')) || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurado.');
  return new Anthropic({ apiKey: key });
}

const MODEL = 'claude-sonnet-4-6';

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

// =========================================================
// Depth check: empuja al usuario a profundizar si la respuesta
// es vaga. Una respuesta como "quiero ganar dinero" debe ser
// rechazada con preguntas específicas.
// =========================================================

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

  const client = await getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: DEPTH_PROMPTS[step],
    messages: [{ role: 'user', content: answer }],
  });

  const text = resp.content?.[0]?.text || '{}';
  try { return JSON.parse(extractJson(text)); }
  catch { return { is_deep_enough: false, score: 50, missing: [], follow_ups: [], feedback: text.slice(0, 300) }; }
}

// =========================================================
// Procesamiento final: extrae estructura del perfil completo.
// =========================================================

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
  "capital_available_usd": número o null (capital inicial disponible),
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

Si un campo no se puede inferir, usa null o array vacío. Para capital_band usa: muy_bajo (<$1K), bajo ($1K-$10K), medio ($10K-$50K), alto (>$50K). NO incluyas markdown ni explicaciones, solo el JSON.`;

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

  const client = await getClient();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: PROCESS_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const text = resp.content?.[0]?.text || '{}';
  let parsed;
  try { parsed = JSON.parse(extractJson(text)); }
  catch (e) {
    throw new Error('La IA no devolvió un JSON válido. Intenta de nuevo. Respuesta: ' + text.slice(0, 200));
  }

  await supabase.from('rpm_profiles').update({
    ai_interpretation: parsed,
    is_complete: true,
    updated_at: new Date().toISOString(),
  }).eq('id', profileId);

  return parsed;
}
