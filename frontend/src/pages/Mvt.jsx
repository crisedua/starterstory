import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import Icon from '../components/Icon.jsx';

export default function Mvt() {
  const [validations, setValidations] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [active, setActive] = useState(null); // validation_id seleccionada
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [params] = useSearchParams();

  async function loadList() {
    try {
      const [v, s] = await Promise.all([api.getMvtValidations(), api.getSolutions()]);
      setValidations(v);
      setSolutions(s);
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  async function loadActive(id) {
    if (!id) { setData(null); return; }
    try { setData(await api.getMvtValidation(id)); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  useEffect(() => { loadList(); }, []);
  useEffect(() => { loadActive(active); }, [active]);

  // Si llega ?solution=X, crear o seleccionar la validación
  useEffect(() => {
    const solId = params.get('solution');
    if (!solId || validations.length === 0) return;
    const existing = validations.find((v) => String(v.solution_id) === String(solId));
    if (existing) setActive(existing.id);
    else startValidation(Number(solId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, validations.length]);

  async function startValidation(solution_id) {
    try {
      const r = await api.createMvtValidation(solution_id);
      await loadList();
      setActive(r.id);
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  async function deleteValidation(id) {
    if (!confirm('¿Borrar toda esta validación con sus entrevistas, hipótesis y tests?')) return;
    try {
      await api.deleteMvtValidation(id);
      if (active === id) setActive(null);
      await loadList();
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  return (
    <div>
      <h1 className="page-title">Validación MVT</h1>
      <p className="page-subtitle">
        Minimum Viable Test sobre una de las soluciones generadas. Documenta inmersión, hipótesis y tests reales.
      </p>

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      {!active && (
        <>
          {validations.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Tus validaciones en curso</h3>
              <table>
                <thead>
                  <tr><th>Solución</th><th>Estado</th><th>Entrevistas</th><th>Hipótesis</th><th>Tests</th><th></th></tr>
                </thead>
                <tbody>
                  {validations.map((v) => (
                    <tr key={v.id} style={{ cursor: 'pointer' }}>
                      <td onClick={() => setActive(v.id)}>{v.solution_title}</td>
                      <td><span className="badge">{v.status}</span></td>
                      <td>{v.counts.interviews} <span className="muted">/ 5</span></td>
                      <td>{v.counts.hypotheses} <span className="muted">/ 5</span></td>
                      <td>{v.counts.tests}</td>
                      <td>
                        <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); deleteValidation(v.id); }}>
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Iniciar nueva validación</h3>
            <p className="small muted">Selecciona una solución para validar. Solo deberías validar UNA a la vez.</p>
            {solutions.length === 0 && <p className="muted">Genera soluciones primero en <Link to="/solutions">Motor de Soluciones</Link>.</p>}
            <div style={{ display: 'grid', gap: 10 }}>
              {solutions.map((s) => (
                <button
                  key={s.id}
                  className="card"
                  style={{ textAlign: 'left', cursor: 'pointer', margin: 0, padding: 14 }}
                  onClick={() => startValidation(s.id)}
                >
                  <div className="between">
                    <div>
                      <strong>{s.title}</strong>
                      <div className="small muted">{s.pain_point_title}</div>
                    </div>
                    <span className="badge badge-accent">fit {s.fit_score}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {active && data && (
        <ValidationView data={data} onBack={() => setActive(null)} onUpdate={() => loadActive(active)} />
      )}
    </div>
  );
}

function ValidationView({ data, onBack, onUpdate }) {
  const counts = {
    interviews: data.interviews.length,
    hypotheses: data.hypotheses.length,
    critical: data.hypotheses.filter((h) => h.is_critical).length,
    tests: data.tests.length,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrowLeft" size={13} /> Volver</button>
        <span className="badge">{data.status}</span>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{data.solution?.title}</h3>
        <p className="small">{data.solution?.description}</p>
      </div>

      <Step n={1} title="Inmersión: 5 entrevistas reales" complete={counts.interviews >= 5}>
        <p className="small muted">Habla con al menos 5 personas que tengan el pain point. Documenta cómo lo resuelven hoy, qué tan grave es, y si pagarían.</p>
        <InterviewsBlock validationId={data.id} interviews={data.interviews} onChange={onUpdate} />
      </Step>

      <Step n={2} title="Hipótesis: lista 5+ y marca 2-3 críticas" complete={counts.hypotheses >= 5 && counts.critical >= 2}>
        <p className="small muted">Lista todas las suposiciones que deben ser ciertas para que la solución funcione. Marca como críticas las que si fallan, matan la idea.</p>
        <HypothesesBlock validationId={data.id} hypotheses={data.hypotheses} onChange={onUpdate} />
      </Step>

      <Step n={3} title="Tests: ejecuta para cada hipótesis crítica" complete={counts.tests >= counts.critical && counts.critical > 0}>
        <p className="small muted">Para cada hipótesis crítica, diseña y ejecuta un test mínimo. Landing, smoke test, pre-venta, post en redes, prototipo. Adjunta evidencia (URL, métricas, capturas).</p>
        <TestsBlock hypotheses={data.hypotheses.filter((h) => h.is_critical)} tests={data.tests} onChange={onUpdate} />
      </Step>

      <div className="card">
        <div className="between">
          <div>
            <h4 style={{ margin: 0 }}>Estado de la validación</h4>
            <p className="small muted" style={{ margin: '4px 0 0' }}>Actualízalo a "completado" cuando hayas terminado los 3 pasos.</p>
          </div>
          <button
            className="btn"
            disabled={data.status === 'completed'}
            onClick={async () => {
              await api.updateMvtValidation(data.id, { status: 'completed' });
              onUpdate();
            }}
          >
            <Icon name="check" size={13} /> Marcar como completada
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, complete, children }) {
  return (
    <div className="card">
      <div className="flex" style={{ marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: complete ? 'var(--success-soft)' : 'var(--bg-3)',
          color: complete ? 'var(--success)' : 'var(--text-2)',
          display: 'grid', placeItems: 'center',
          fontSize: 12, fontWeight: 700,
          border: `1px solid ${complete ? 'rgba(52, 211, 153, 0.3)' : 'var(--border)'}`,
        }}>
          {complete ? <Icon name="check" size={14} /> : n}
        </div>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InterviewsBlock({ validationId, interviews, onChange }) {
  const [form, setForm] = useState({ person_label: '', channel: 'whatsapp', current_solution: '', pain_level: 5, would_pay: '', evidence_url: '', notes: '' });
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!form.person_label) return;
    setAdding(true);
    try {
      await api.addMvtInterview(validationId, form);
      setForm({ person_label: '', channel: 'whatsapp', current_solution: '', pain_level: 5, would_pay: '', evidence_url: '', notes: '' });
      onChange();
    } finally { setAdding(false); }
  }

  return (
    <>
      {interviews.length > 0 && (
        <table style={{ marginBottom: 12 }}>
          <thead><tr><th>Persona</th><th>Canal</th><th>Cómo resuelve hoy</th><th>Dolor</th><th>Pagaría</th><th>Evidencia</th><th></th></tr></thead>
          <tbody>
            {interviews.map((i) => (
              <tr key={i.id}>
                <td>{i.person_label}</td>
                <td><span className="badge">{i.channel}</span></td>
                <td className="small">{i.current_solution}</td>
                <td>{i.pain_level}/10</td>
                <td className="small">{i.would_pay}</td>
                <td>{i.evidence_url && <a href={i.evidence_url} target="_blank" rel="noreferrer">link <Icon name="external" size={11} /></a>}</td>
                <td><button className="btn btn-ghost" onClick={async () => { await api.deleteMvtInterview(i.id); onChange(); }}><Icon name="trash" size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
        <div className="row">
          <div className="col" style={{ minWidth: 160 }}>
            <label>Persona (alias)</label>
            <input value={form.person_label} onChange={(e) => setForm({ ...form, person_label: e.target.value })} placeholder="Persona 1" />
          </div>
          <div className="col" style={{ maxWidth: 140 }}>
            <label>Canal</label>
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option>whatsapp</option><option>llamada</option><option>presencial</option><option>otro</option>
            </select>
          </div>
          <div className="col" style={{ maxWidth: 110 }}>
            <label>Dolor (1-10)</label>
            <input type="number" min="1" max="10" value={form.pain_level} onChange={(e) => setForm({ ...form, pain_level: Number(e.target.value) })} />
          </div>
        </div>
        <div className="field">
          <label>¿Cómo resuelve el problema hoy?</label>
          <input value={form.current_solution} onChange={(e) => setForm({ ...form, current_solution: e.target.value })} />
        </div>
        <div className="field">
          <label>¿Pagaría por una solución? (cuánto, qué dijo)</label>
          <input value={form.would_pay} onChange={(e) => setForm({ ...form, would_pay: e.target.value })} />
        </div>
        <div className="field">
          <label>URL evidencia (captura WhatsApp, audio, etc.)</label>
          <input value={form.evidence_url} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="field">
          <label>Notas</label>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button className="btn" onClick={add} disabled={adding || !form.person_label}>
          <Icon name="plus" size={13} /> Agregar entrevista
        </button>
      </div>
    </>
  );
}

function HypothesesBlock({ validationId, hypotheses, onChange }) {
  const [form, setForm] = useState({ statement: '', risk: 5, is_critical: false });

  async function add() {
    if (!form.statement) return;
    await api.addMvtHypothesis(validationId, form);
    setForm({ statement: '', risk: 5, is_critical: false });
    onChange();
  }

  return (
    <>
      {hypotheses.length > 0 && (
        <table style={{ marginBottom: 12 }}>
          <thead><tr><th>Hipótesis</th><th>Riesgo</th><th>Crítica</th><th></th></tr></thead>
          <tbody>
            {hypotheses.map((h) => (
              <tr key={h.id}>
                <td>{h.statement}</td>
                <td>{h.risk}/10</td>
                <td>
                  <input
                    type="checkbox" style={{ width: 'auto' }}
                    checked={!!h.is_critical}
                    onChange={async (e) => { await api.updateMvtHypothesis(h.id, { is_critical: e.target.checked }); onChange(); }}
                  />
                </td>
                <td><button className="btn btn-ghost" onClick={async () => { await api.deleteMvtHypothesis(h.id); onChange(); }}><Icon name="trash" size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
        <div className="field">
          <label>Suposición que debe ser cierta para que el negocio funcione</label>
          <input value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} placeholder="ej: Los dueños de salones pagarían $30/mes por agendar via WhatsApp" />
        </div>
        <div className="row">
          <div className="col" style={{ maxWidth: 140 }}>
            <label>Riesgo (1-10)</label>
            <input type="number" min="1" max="10" value={form.risk} onChange={(e) => setForm({ ...form, risk: Number(e.target.value) })} />
          </div>
          <div className="col" style={{ maxWidth: 140, display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text)' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={form.is_critical} onChange={(e) => setForm({ ...form, is_critical: e.target.checked })} />
              Crítica
            </label>
          </div>
        </div>
        <button className="btn" onClick={add} disabled={!form.statement}>
          <Icon name="plus" size={13} /> Agregar hipótesis
        </button>
      </div>
    </>
  );
}

function TestsBlock({ hypotheses, tests, onChange }) {
  if (hypotheses.length === 0) {
    return <p className="muted small">Marca primero alguna hipótesis como crítica para poder testearla.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {hypotheses.map((h) => {
        const hypTests = tests.filter((t) => t.hypothesis_id === h.id);
        return <TestForHypothesis key={h.id} hypothesis={h} tests={hypTests} onChange={onChange} />;
      })}
    </div>
  );
}

function TestForHypothesis({ hypothesis, tests, onChange }) {
  const [form, setForm] = useState({ test_type: 'landing', description: '', evidence_url: '', result: '', metrics: '' });

  async function add() {
    if (!form.description) return;
    let metrics = null;
    if (form.metrics) {
      try { metrics = JSON.parse(form.metrics); } catch { metrics = { raw: form.metrics }; }
    }
    await api.addMvtTest(hypothesis.id, { ...form, metrics });
    setForm({ test_type: 'landing', description: '', evidence_url: '', result: '', metrics: '' });
    onChange();
  }

  return (
    <div style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
      <strong style={{ fontSize: 13 }}>{hypothesis.statement}</strong>
      <div className="small muted" style={{ marginBottom: 10 }}>Riesgo {hypothesis.risk}/10 · {tests.length} test{tests.length !== 1 ? 's' : ''} ejecutado{tests.length !== 1 ? 's' : ''}</div>

      {tests.map((t) => (
        <div key={t.id} className="small" style={{ background: 'var(--bg-3)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div className="between">
            <span className="badge">{t.test_type}</span>
            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={async () => { await api.deleteMvtTest(t.id); onChange(); }}>quitar</button>
          </div>
          <div style={{ marginTop: 4 }}>{t.description}</div>
          {t.result && <div style={{ marginTop: 4 }}><strong>Resultado:</strong> {t.result}</div>}
          {t.evidence_url && <a href={t.evidence_url} target="_blank" rel="noreferrer">evidencia <Icon name="external" size={11} /></a>}
        </div>
      ))}

      <div className="row" style={{ marginTop: 8 }}>
        <div className="col" style={{ maxWidth: 160 }}>
          <label>Tipo de test</label>
          <select value={form.test_type} onChange={(e) => setForm({ ...form, test_type: e.target.value })}>
            <option value="landing">Landing page</option>
            <option value="smoke">Smoke test</option>
            <option value="preventa">Pre-venta</option>
            <option value="post-redes">Post en redes</option>
            <option value="prototipo">Prototipo / demo</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="col" style={{ minWidth: 280 }}>
          <label>Descripción del test</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>URL evidencia (landing, captura analytics, etc.)</label>
        <input value={form.evidence_url} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="https://..." />
      </div>
      <div className="field">
        <label>Resultado / aprendizaje</label>
        <input value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} placeholder="ej: 23 visitas, 4 signups (17% conversión)" />
      </div>
      <button className="btn btn-secondary" onClick={add} disabled={!form.description}>
        <Icon name="plus" size={13} /> Agregar test
      </button>
    </div>
  );
}
