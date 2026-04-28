import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function VideoDetail() {
  const { id } = useParams();
  const [v, setV] = useState(null);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [msg, setMsg] = useState(null);

  function reload() { return api.getVideo(id).then(setV).catch((e) => setError(e.message)); }
  useEffect(() => { reload(); }, [id]);

  async function reanalyze(force = false) {
    setAnalyzing(true); setMsg(null);
    try {
      await api.analyzeVideo(id, force);
      await reload();
      setMsg({ type: 'info', text: force ? 'Re-analizado.' : 'Análisis completado.' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setAnalyzing(false); }
  }

  async function classify(force = false) {
    setAnalyzing(true); setMsg(null);
    try {
      await api.classifyVideo(id, force);
      await reload();
      setMsg({ type: 'info', text: 'Clasificación contra pain points completada.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setAnalyzing(false); }
  }

  if (error) return <div className="alert alert-err">{error}</div>;
  if (!v) return <p className="muted">Cargando…</p>;

  const a = v.analysis;
  const strategies = parseJsonArray(a?.key_strategies);
  const tools = parseJsonArray(a?.tools_used);

  return (
    <div>
      <Link to="/videos" className="small">← Volver a videos</Link>
      <h1 className="page-title" style={{ marginTop: 6 }}>{v.title || '(sin título)'}</h1>
      <p className="page-subtitle">
        <a href={v.url} target="_blank" rel="noreferrer">{v.url}</a>
        {v.published_at && <> · publicado {v.published_at.slice(0, 10)}</>}
      </p>

      {v.thumbnail_url && <img src={v.thumbnail_url} alt="" style={{ maxWidth: 360, borderRadius: 8, marginBottom: 16 }} />}

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      <div className="card">
        <div className="between">
          <h3 style={{ marginTop: 0 }}>Análisis IA</h3>
          <div className="flex">
            {!a && <button className="btn" disabled={analyzing} onClick={() => reanalyze(false)}>{analyzing ? 'Analizando…' : 'Analizar'}</button>}
            {a && <button className="btn btn-secondary" disabled={analyzing} onClick={() => reanalyze(true)}>{analyzing ? 'Analizando…' : 'Re-analizar'}</button>}
          </div>
        </div>
        {!a && <p className="muted">Aún no analizado.</p>}
        {a && (
          <div className="row">
            <Field label="Negocio" value={a.business_name} />
            <Field label="Fundador" value={a.founder_name} />
            <Field label="Industria" value={a.industry} />
            <Field label="Modelo" value={a.business_model} />
            <Field label="Estimado de ingresos" value={a.revenue_estimate} />
          </div>
        )}
        {a?.summary && (
          <>
            <h4>Resumen</h4>
            <p>{a.summary}</p>
          </>
        )}
        {a?.monetization && (
          <>
            <h4>Monetización</h4>
            <p>{a.monetization}</p>
          </>
        )}
        {a?.origin_story && (
          <>
            <h4>Origen</h4>
            <p>{a.origin_story}</p>
          </>
        )}
        {strategies.length > 0 && (
          <>
            <h4>Estrategias clave</h4>
            <ul>{strategies.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </>
        )}
        {tools.length > 0 && (
          <>
            <h4>Herramientas</h4>
            <div className="flex" style={{ flexWrap: 'wrap' }}>{tools.map((t, i) => <span key={i} className="badge">{t}</span>)}</div>
          </>
        )}
      </div>

      <div className="card">
        <div className="between">
          <h3 style={{ marginTop: 0 }}>Clasificación contra Pain Points LATAM</h3>
          <button className="btn btn-secondary" disabled={analyzing || !a} onClick={() => classify(true)}>
            {v.classifications?.length ? 'Re-clasificar' : 'Clasificar'}
          </button>
        </div>
        {!a && <p className="muted small">Requiere análisis IA primero.</p>}
        {a && (!v.classifications || v.classifications.length === 0) && (
          <p className="muted small">Aún no clasificado contra pain points.</p>
        )}
        {v.classifications && v.classifications.length > 0 && (
          <table>
            <thead><tr><th>Score</th><th>Categoría</th><th>Pain Point</th><th>Razonamiento</th></tr></thead>
            <tbody>
              {v.classifications
                .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
                .map((c) => (
                  <tr key={c.id}>
                    <td><span className="badge">{((c.relevance_score || 0) * 100).toFixed(0)}%</span></td>
                    <td><span className="badge">{c.category}</span></td>
                    <td>{c.title}</td>
                    <td className="small">{c.reasoning}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Métricas (snapshots)</h3>
        {v.metrics?.length === 0 && <p className="muted">Sin métricas registradas.</p>}
        {v.metrics?.length > 0 && (
          <table>
            <thead><tr><th>Capturado</th><th>Vistas</th><th>Likes</th><th>Comentarios</th></tr></thead>
            <tbody>
              {v.metrics.map((m) => (
                <tr key={m.id}><td className="small">{m.captured_at}</td><td>{m.views?.toLocaleString() || '—'}</td><td>{m.likes?.toLocaleString() || '—'}</td><td>{m.comments?.toLocaleString() || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {v.transcript && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Transcripción ({v.transcript.language})</h3>
          <details>
            <summary className="small muted">Mostrar transcripción ({v.transcript.transcript?.length || 0} caracteres)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 12 }}>{v.transcript.transcript}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="col" style={{ minWidth: 160 }}>
      <label>{label}</label>
      <div>{value || <span className="muted">—</span>}</div>
    </div>
  );
}

function parseJsonArray(s) {
  if (!s) return [];
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
}
