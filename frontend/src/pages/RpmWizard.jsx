import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const STEPS = [
  { key: 'intro', label: 'Intro' },
  { key: 'R', label: 'Results' },
  { key: 'P', label: 'Purpose' },
  { key: 'M', label: 'Massive Action' },
  { key: 'summary', label: 'Resumen IA' },
];

export default function RpmWizard() {
  const [profile, setProfile] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ results_raw: '', purpose_raw: '', massive_action_raw: '' });
  const [depth, setDepth] = useState({}); // { R: {...}, P: {...}, M: {...} }
  const [loading, setLoading] = useState({}); // por paso
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const p = await api.getRpmProfile();
      setProfile(p);
      if (p) {
        setForm({
          results_raw: p.results_raw || '',
          purpose_raw: p.purpose_raw || '',
          massive_action_raw: p.massive_action_raw || '',
        });
        if (p.is_complete) setStep(4);
      }
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  async function saveDraft(patch) {
    try { await api.saveRpmProfile(patch); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  async function checkDepth(stepKey, answer) {
    setLoading((l) => ({ ...l, [stepKey]: true }));
    setMsg(null);
    try {
      // Guardamos primero
      const patch = stepKey === 'R' ? { results_raw: answer }
        : stepKey === 'P' ? { purpose_raw: answer }
        : { massive_action_raw: answer };
      await saveDraft(patch);
      const r = await api.rpmDepthCheck(stepKey, answer);
      setDepth((d) => ({ ...d, [stepKey]: r }));
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setLoading((l) => ({ ...l, [stepKey]: false })); }
  }

  async function processWithAI() {
    setProcessing(true); setMsg(null);
    try {
      // Save current draft first
      await saveDraft(form);
      await api.processRpmProfile();
      await load();
      setStep(4);
      setMsg({ type: 'info', text: '¡Perfil RPM procesado! Ahora puedes generar soluciones.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setProcessing(false); }
  }

  async function reset() {
    if (!confirm('¿Borrar tu perfil RPM y empezar de nuevo?')) return;
    await api.resetRpmProfile();
    setForm({ results_raw: '', purpose_raw: '', massive_action_raw: '' });
    setDepth({});
    setProfile(null);
    setStep(0);
  }

  return (
    <div>
      <h1 className="page-title">Wizard RPM</h1>
      <p className="page-subtitle">Rapid Planning Method — Tony Robbins</p>

      <Stepper current={step} onChange={setStep} canJump={!!profile} />

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      {step === 0 && <Intro onStart={() => setStep(1)} hasProfile={!!profile && profile.is_complete} onReset={reset} />}

      {step === 1 && (
        <StepCard
          stepKey="R"
          title="R — Results: ¿Qué quieres realmente?"
          intro="No es 'ganar dinero' o 'ser libre'. Es un resultado específico, medible, con plazo. Si tu Result es vago, todo lo demás colapsa."
          subQuestions={[
            '¿Qué cifra exacta de ingresos mensuales quieres alcanzar (USD)?',
            '¿Para cuándo? (fecha o cantidad de meses)',
            '¿Cómo sabrás que lo lograste? (criterio de éxito)',
            '¿Qué tipo de negocio? (saas, agencia, ecommerce, contenido, servicio…)',
            '¿Desde dónde lo construyes? (país/ciudad)',
            '¿Full-time o side project? Si es side, ¿cuántas horas a la semana?',
          ]}
          example="Ej: 'Generar US$3.000/mes en ingresos recurrentes con un side project de 15 h/semana, basado en Santiago, Chile, que sea un SaaS B2B vertical antes de diciembre 2026. Sé que lo logré cuando cierro el cliente #20 a $150/mes.'"
          value={form.results_raw}
          onChange={(v) => setForm({ ...form, results_raw: v })}
          onCheck={() => checkDepth('R', form.results_raw)}
          loading={loading.R}
          depth={depth.R}
          onNext={() => setStep(2)}
          onPrev={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <StepCard
          stepKey="P"
          title="P — Purpose: ¿Por qué lo quieres?"
          intro="Sin un porqué fuerte las acciones no se sostienen. Esto no es lógica — es emoción. Cava hasta encontrar la razón real."
          subQuestions={[
            '¿Qué te dará lograrlo que hoy no tienes?',
            '¿A quién más beneficia además de ti? (familia, comunidad, clientes)',
            '¿Qué pasa si NO lo logras en 12-24 meses? ¿Qué se rompe?',
            '¿Qué dolor evitas? ¿Qué placer ganas?',
            '¿En quién te conviertes al lograrlo?',
            '¿A quién quieres demostrarle algo (incluido tú mismo)?',
          ]}
          example="Ej: 'Quiero independencia financiera de mi empleo de oficina porque siento que estoy intercambiando mi vida por un sueldo. Si no lo logro, me veo a los 40 atrapado en lo mismo y eso me aterra. Beneficiará a mi pareja porque podríamos elegir dónde vivir. Quiero demostrarme que puedo crear algo que no dependa de un jefe.'"
          value={form.purpose_raw}
          onChange={(v) => setForm({ ...form, purpose_raw: v })}
          onCheck={() => checkDepth('P', form.purpose_raw)}
          loading={loading.P}
          depth={depth.P}
          onNext={() => setStep(3)}
          onPrev={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepCard
          stepKey="M"
          title="M — Massive Action Plan: ¿Qué acciones tomarás?"
          intro="No 1 o 2 ideas — un brainstorm completo. Cantidad antes que calidad. Después se prioriza por leverage (qué da más resultado con menos esfuerzo)."
          subQuestions={[
            'Lista MÍNIMO 8-10 acciones distintas que podrías tomar (no las filtres aún).',
            '¿Cuántas horas a la semana puedes dedicar realmente?',
            '¿Qué habilidades tienes ya? (programación, ventas, diseño, etc.)',
            '¿Qué recursos? (dinero disponible, herramientas, contactos, comunidad)',
            '¿Qué restricciones tienes? (trabajo full-time, hijos, ubicación, idioma)',
            '¿Qué estás dispuesto a sacrificar? (Netflix, fines de semana, hobbies)',
            '¿Cuáles son las primeras 3 acciones que harás en las próximas 24 horas?',
          ]}
          example="Ej: 'Acciones: 1) hacer 10 entrevistas con dueños de pyme; 2) construir una landing en Webflow; 3) escribir 3 posts en LinkedIn por semana; 4) ofrecer servicio manual antes de automatizar; 5) cobrar pre-venta para validar; 6) usar n8n para MVP; 7) lanzar a 100 dueños de salones; 8) cobrar $99/mes; 9) buscar mentor; 10) reservar 2h cada mañana antes del trabajo. Tengo 15h/semana, sé programar y vender. Capital: $500. Restricción: trabajo de 9 a 6. Sacrifico Netflix y futbol los miércoles.'"
          value={form.massive_action_raw}
          onChange={(v) => setForm({ ...form, massive_action_raw: v })}
          onCheck={() => checkDepth('M', form.massive_action_raw)}
          loading={loading.M}
          depth={depth.M}
          onNext={() => setStep(4)}
          onPrev={() => setStep(2)}
          isLast
          onProcess={processWithAI}
          processing={processing}
        />
      )}

      {step === 4 && (
        <Summary profile={profile} onEdit={(s) => setStep(s)} onProcess={processWithAI} processing={processing} onReset={reset} />
      )}
    </div>
  );
}

function Stepper({ current, onChange, canJump }) {
  return (
    <div className="card" style={{ padding: 12, display: 'flex', gap: 8 }}>
      {STEPS.map((s, i) => (
        <button
          key={s.key}
          className={`btn ${i === current ? '' : 'btn-secondary'}`}
          style={{ fontSize: 12, opacity: canJump || i <= current ? 1 : 0.4 }}
          disabled={!canJump && i > current}
          onClick={() => onChange(i)}
        >
          {i + 1}. {s.label}
        </button>
      ))}
    </div>
  );
}

function Intro({ onStart, hasProfile, onReset }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>¿Qué es el RPM?</h3>
      <p>
        El <strong>Rapid Planning Method</strong> de Tony Robbins no es un sistema de gestión del tiempo —
        es un sistema de pensamiento basado en tres preguntas en secuencia:
      </p>
      <ul>
        <li><strong>R — Results:</strong> ¿Qué quiero realmente? Resultados específicos y medibles.</li>
        <li><strong>P — Purpose:</strong> ¿Por qué lo quiero? Razones emocionales profundas.</li>
        <li><strong>M — Massive Action Plan:</strong> ¿Qué acciones masivas estoy dispuesto a tomar?</li>
      </ul>
      <p className="muted">
        En cada paso podrás responder a una pregunta principal con ayuda de sub-preguntas y ejemplos.
        Hay un botón <strong>"Profundizar con IA"</strong> que evalúa si tu respuesta es lo suficientemente
        específica — si dices "quiero ganar dinero", te empuja a precisar cuánto, en cuánto tiempo y con qué tipo de negocio.
      </p>
      <p className="muted">
        Al final, una IA procesará tus respuestas y extraerá un perfil estructurado (capital, horas, habilidades,
        nivel de ambición, intereses) que el motor de soluciones usará para generar propuestas adaptadas a TI.
      </p>
      <div className="flex" style={{ marginTop: 16 }}>
        <button className="btn" onClick={onStart}>{hasProfile ? 'Continuar / editar' : 'Comenzar'}</button>
        {hasProfile && <button className="btn btn-ghost" onClick={onReset}>Borrar y empezar de cero</button>}
      </div>
    </div>
  );
}

function StepCard({
  stepKey, title, intro, subQuestions, example, value, onChange,
  onCheck, loading, depth, onNext, onPrev, isLast, onProcess, processing,
}) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p>{intro}</p>

      <h4>Preguntas auxiliares (úsalas para profundizar)</h4>
      <ul className="small">
        {subQuestions.map((q, i) => <li key={i}>{q}</li>)}
      </ul>

      <details style={{ marginBottom: 12 }}>
        <summary className="small muted">Ver un ejemplo concreto</summary>
        <p className="small" style={{ background: 'var(--bg-3)', padding: 12, borderRadius: 6, marginTop: 8 }}>
          {example}
        </p>
      </details>

      <label>Tu respuesta</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder="Escribe aquí. Cuanto más específico, mejor."
      />

      <div className="flex" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" disabled={loading || !value.trim()} onClick={onCheck}>
          {loading ? 'Analizando…' : 'Profundizar con IA'}
        </button>
        <button className="btn btn-ghost" onClick={onPrev}>← Anterior</button>
        {!isLast && <button className="btn" onClick={onNext}>Siguiente →</button>}
        {isLast && (
          <button className="btn" disabled={processing || !value.trim()} onClick={onProcess}>
            {processing ? 'Procesando…' : 'Procesar perfil con IA →'}
          </button>
        )}
      </div>

      {depth && <DepthFeedback d={depth} />}
    </div>
  );
}

function DepthFeedback({ d }) {
  const ok = d.is_deep_enough;
  return (
    <div className={`alert ${ok ? 'alert-info' : 'alert-warn'}`} style={{ marginTop: 14 }}>
      <div className="between" style={{ marginBottom: 8 }}>
        <strong>{ok ? 'Profundidad: suficiente' : 'Profundidad: insuficiente'}</strong>
        <span className="badge">{d.score}/100</span>
      </div>
      {d.feedback && <p style={{ margin: '6px 0' }}>{d.feedback}</p>}
      {d.missing?.length > 0 && (
        <>
          <strong className="small">Falta:</strong>
          <ul className="small" style={{ margin: '4px 0' }}>
            {d.missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </>
      )}
      {d.follow_ups?.length > 0 && (
        <>
          <strong className="small">Preguntas para profundizar:</strong>
          <ul className="small" style={{ margin: '4px 0' }}>
            {d.follow_ups.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

function Summary({ profile, onEdit, onProcess, processing, onReset }) {
  if (!profile || !profile.is_complete) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Resumen IA</h3>
        <p className="muted">Aún no has procesado tu perfil. Completa los 3 pasos y pulsa "Procesar perfil con IA".</p>
        <button className="btn" disabled={processing} onClick={onProcess}>
          {processing ? 'Procesando…' : 'Procesar ahora'}
        </button>
      </div>
    );
  }

  const i = profile.ai_interpretation || {};
  return (
    <div className="card">
      <div className="between">
        <h3 style={{ marginTop: 0 }}>Tu perfil RPM procesado</h3>
        <div className="flex">
          <button className="btn btn-secondary" onClick={() => onEdit(1)}>Editar Results</button>
          <button className="btn btn-secondary" onClick={() => onEdit(2)}>Editar Purpose</button>
          <button className="btn btn-secondary" onClick={() => onEdit(3)}>Editar MAP</button>
          <button className="btn btn-ghost" onClick={onReset}>Resetear</button>
        </div>
      </div>

      <p className="small muted" style={{ marginTop: 12 }}>
        Esto es lo que la IA interpretó de tus respuestas. El motor de soluciones usará estos datos.
        Si algo está mal, vuelve a editar el paso correspondiente y vuelve a procesar.
      </p>

      <div className="row" style={{ marginTop: 12 }}>
        <Field label="Resumen Results" value={i.results_summary} wide />
      </div>
      <div className="row">
        <Field label="Resumen Purpose" value={i.purpose_summary} wide />
      </div>
      <div className="row">
        <Field label="Nivel de ambición" value={i.ambition_level} />
        <Field label="Horizonte (meses)" value={i.time_horizon_months} />
        <Field label="Meta mensual (USD)" value={i.monthly_revenue_target_usd} />
        <Field label="Horas/semana" value={i.weekly_hours_available} />
      </div>
      <div className="row">
        <Field label="Capital disponible (USD)" value={i.capital_available_usd} />
        <Field label="Banda capital" value={i.capital_band} />
        <Field label="Modalidad" value={i.fulltime_or_side} />
        <Field label="Tolerancia al riesgo" value={i.risk_tolerance} />
      </div>
      <div className="row">
        <Field label="Tipo de negocio preferido" value={i.business_type_preference} />
        <Field label="Ubicación" value={i.location} />
      </div>

      {Array.isArray(i.skills) && i.skills.length > 0 && <Tags label="Habilidades" items={i.skills} />}
      {Array.isArray(i.resources) && i.resources.length > 0 && <Tags label="Recursos" items={i.resources} />}
      {Array.isArray(i.constraints) && i.constraints.length > 0 && <Tags label="Restricciones" items={i.constraints} />}
      {Array.isArray(i.preferred_industries) && i.preferred_industries.length > 0 && <Tags label="Industrias preferidas" items={i.preferred_industries} />}
      {Array.isArray(i.willing_to_sacrifice) && i.willing_to_sacrifice.length > 0 && <Tags label="Dispuesto a sacrificar" items={i.willing_to_sacrifice} />}
      {Array.isArray(i.emotional_drivers) && i.emotional_drivers.length > 0 && <Tags label="Drivers emocionales" items={i.emotional_drivers} />}
      {Array.isArray(i.interests_categories) && i.interests_categories.length > 0 && <Tags label="Categorías de interés" items={i.interests_categories} />}

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button className="btn" disabled={processing} onClick={onProcess}>
          {processing ? 'Procesando…' : 'Volver a procesar (re-interpretar con IA)'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, wide }) {
  return (
    <div className="col" style={{ minWidth: wide ? 300 : 160, flex: wide ? '1 1 100%' : 1 }}>
      <label>{label}</label>
      <div>{value === null || value === undefined || value === '' ? <span className="muted">—</span> : String(value)}</div>
    </div>
  );
}

function Tags({ label, items }) {
  return (
    <div style={{ marginTop: 10 }}>
      <label>{label}</label>
      <div className="flex" style={{ flexWrap: 'wrap' }}>
        {items.map((t, i) => <span key={i} className="badge">{t}</span>)}
      </div>
    </div>
  );
}
