import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState('');
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [msg, setMsg] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (hasAnalysis) params.has_analysis = 'true';
      setVideos(await api.getVideos(params));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function analyzeAll() {
    setAnalyzing(true);
    setMsg(null);
    try {
      let total = 0;
      // En Vercel cada call procesa hasta 5 videos (~40s).
      // Iteramos hasta vaciar la cola de pendientes.
      for (let i = 0; i < 30; i++) {
        const r = await api.analyzeAll(5);
        total += r.processed;
        setMsg({ type: 'info', text: `Analizando… ${total} listos, quedan ${r.remaining}` });
        if (r.remaining === 0 || r.processed === 0) break;
      }
      await load();
      setMsg({ type: 'info', text: `Completado: ${total} videos analizados.` });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setAnalyzing(false); }
  }

  return (
    <div>
      <h1 className="page-title">Videos</h1>
      <p className="page-subtitle">
        {videos.length} resultados
        {videos.length > 0 && (
          <> · {videos.filter((v) => v.has_analysis).length} con análisis IA</>
        )}
        {videos.length < 30 && <> · <span className="badge badge-warn">faltan {30 - videos.length} para el mínimo</span></>}
      </p>

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      <div className="card">
        <div className="row">
          <div className="col">
            <label>Buscar (título, negocio, resumen)</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <div className="col" style={{ maxWidth: 220, display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', gap: 6, fontSize: 13, color: 'var(--fg)' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={hasAnalysis} onChange={(e) => setHasAnalysis(e.target.checked)} />
              Solo con análisis IA
            </label>
          </div>
          <div className="col" style={{ maxWidth: 280, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button className="btn" onClick={load} disabled={loading}>Filtrar</button>
            <button className="btn btn-secondary" onClick={analyzeAll} disabled={analyzing}>
              {analyzing ? 'Analizando…' : 'Analizar pendientes'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Negocio</th>
              <th>Industria</th>
              <th>Modelo</th>
              <th>Vistas</th>
              <th>Publicado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 && (
              <tr><td colSpan={7}>
                <div className="empty">
                  <div className="empty-icon">🎬</div>
                  <div className="empty-title">Sin videos todavía</div>
                  <div className="empty-desc">Ve al Scraper, configura el cron y ejecuta una corrida para traer los videos del canal.</div>
                  <a href="/scraper" className="btn">Ir al Scraper →</a>
                </div>
              </td></tr>
            )}
            {videos.map((v) => (
              <tr key={v.id}>
                <td style={{ maxWidth: 360 }}>
                  <Link to={`/videos/${v.id}`}>{v.title || '(sin título)'}</Link>
                  <div className="small muted">{v.youtube_id}</div>
                </td>
                <td>{v.business_name || <span className="muted small">—</span>}</td>
                <td>{v.industry || <span className="muted small">—</span>}</td>
                <td>{v.business_model && <span className="badge">{v.business_model}</span>}</td>
                <td>{v.latest_views ? v.latest_views.toLocaleString() : '—'}</td>
                <td className="small">{v.published_at?.slice(0, 10) || '—'}</td>
                <td><a href={v.url} target="_blank" rel="noreferrer">YouTube ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
