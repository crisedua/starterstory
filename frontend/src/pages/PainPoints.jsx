import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import Icon from '../components/Icon.jsx';

const CATEGORIES = [
  'fintech', 'logistica', 'edtech', 'edtech-talent', 'healthtech',
  'agtech', 'govtech', 'proptech', 'cleantech', 'saas-pyme',
  'ecommerce', 'contenido', 'productividad', 'safetech', 'otro',
];

export default function PainPoints() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    try { setItems(await api.getPainPoints()); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  }
  useEffect(() => { load(); }, []);

  async function extract(replace = false) {
    if (replace && !confirm('Esto reemplaza todos los pain points "extraídos" por una nueva extracción IA desde los videos analizados. Los manuales no se tocan. ¿Continuar?')) return;
    setExtracting(true); setMsg(null);
    try {
      const r = await api.extractPainPoints(replace);
      setMsg({ type: 'info', text: `${r.extracted} pain points extraídos desde ${r.total_videos_analyzed} videos analizados.` });
      await load();
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setExtracting(false); }
  }

  async function classifyAll() {
    setBusy(true); setMsg(null);
    try {
      await api.classifyAllVideos(false);
      setMsg({ type: 'info', text: 'Clasificación iniciada en background. Recarga en 1-2 min para ver resultados.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setBusy(false); }
  }

  async function reclassifyAll() {
    if (!confirm('Esto borra TODAS las clasificaciones existentes y vuelve a clasificar todos los videos. ¿Continuar?')) return;
    setBusy(true); setMsg(null);
    try {
      await api.reclassifyAllVideos();
      setMsg({ type: 'info', text: 'Reclasificación iniciada. Tarda ~10s por video.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setBusy(false); }
  }

  async function deleteOne(id) {
    if (!confirm('¿Borrar este pain point? Se borran también sus clasificaciones.')) return;
    try { await api.deletePainPoint(id); await load(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  let filtered = items;
  if (filter) filtered = filtered.filter((p) => p.category === filter);
  if (sourceFilter) filtered = filtered.filter((p) => (p.source || 'manual') === sourceFilter);

  const stats = {
    total: items.length,
    extracted: items.filter((p) => p.source === 'extracted').length,
    manual: items.filter((p) => (p.source || 'manual') === 'manual').length,
    classifications: items.reduce((s, p) => s + (p.video_match_count || 0), 0),
  };

  return (
    <div>
      <h1 className="page-title">Pain Points LATAM</h1>
      <p className="page-subtitle">
        Pain points <strong>extraídos desde los videos analizados</strong> (transcripts procesados por IA)
        e investigados para evaluar su aplicabilidad al mercado latinoamericano.
      </p>

      {msg && (
        <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>
          <Icon name={msg.type === 'err' ? 'alert' : 'check'} size={14} /> {msg.text}
        </div>
      )}

      <div className="grid-stats">
        <div className="stat">
          <div className="label"><Icon name="bulb" size={12} /> Total</div>
          <div className="value">{stats.total}</div>
        </div>
        <div className="stat">
          <div className="label"><Icon name="sparkles" size={12} /> Extraídos IA</div>
          <div className="value">{stats.extracted}</div>
        </div>
        <div className="stat">
          <div className="label"><Icon name="edit" size={12} /> Manuales</div>
          <div className="value">{stats.manual}</div>
        </div>
        <div className="stat">
          <div className="label"><Icon name="zap" size={12} /> Clasificaciones</div>
          <div className="value">{stats.classifications}</div>
        </div>
      </div>

      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--accent-soft), transparent)',
        borderColor: 'rgba(167, 139, 250, 0.3)',
      }}>
        <div className="between">
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkles" size={16} style={{ color: 'var(--accent)' }} />
              Extracción IA desde videos
            </h3>
            <p className="small muted" style={{ margin: '6px 0 0' }}>
              Analiza los videos del canal, identifica los pain points que esos negocios resuelven,
              clusteriza los similares y evalúa cuáles aplican al mercado LATAM con razonamiento.
            </p>
          </div>
          <div className="flex">
            <button className="btn" disabled={extracting} onClick={() => extract(false)}>
              {extracting
                ? <><Icon name="spinner" size={14} className="spin" /> Extrayendo…</>
                : <><Icon name="sparkles" size={14} /> Extraer pain points</>}
            </button>
            {stats.extracted > 0 && (
              <button className="btn btn-secondary" disabled={extracting} onClick={() => extract(true)}>
                <Icon name="refresh" size={14} /> Re-extraer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="between">
          <div className="flex" style={{ flexWrap: 'wrap' }}>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 180 }}>
              <option value="">Todas las categorías</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ width: 180 }}>
              <option value="">Todas las fuentes</option>
              <option value="extracted">Solo extraídos IA</option>
              <option value="manual">Solo manuales</option>
            </select>
          </div>
          <div className="flex">
            <button className="btn-secondary btn" disabled={busy} onClick={classifyAll}>
              <Icon name="zap" size={13} /> Clasificar pendientes
            </button>
            <button className="btn-secondary btn" disabled={busy} onClick={reclassifyAll}>
              <Icon name="refresh" size={13} /> Reclasificar todo
            </button>
            <button className="btn" onClick={() => setEditing('new')}>
              <Icon name="plus" size={13} /> Manual
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <PainPointForm
          item={editing === 'new' ? null : items.find((p) => p.id === editing)}
          onCancel={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}

      {filtered.length === 0 && (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><Icon name="bulb" size={20} /></div>
            <div className="empty-title">Sin pain points todavía</div>
            <div className="empty-desc">
              Asegúrate de tener videos analizados con IA, luego pulsa "Extraer pain points" arriba para que la IA identifique
              los problemas reales que esos negocios resuelven y evalúe su aplicabilidad LATAM.
            </div>
            <Link to="/videos" className="btn">
              <Icon name="film" size={13} /> Ver videos
            </Link>
          </div>
        </div>
      )}

      {filtered.map((p) => (
        <PainPointCard
          key={p.id}
          item={p}
          expanded={expanded === p.id}
          onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
          onEdit={() => setEditing(p.id)}
          onDelete={() => deleteOne(p.id)}
        />
      ))}
    </div>
  );
}

function PainPointCard({ item, expanded, onToggle, onEdit, onDelete }) {
  const [matches, setMatches] = useState(null);

  async function loadMatches() {
    if (matches) return;
    try {
      const full = await api.getPainPoint(item.id);
      setMatches(full.matches || []);
    } catch (e) { /* swallow */ }
  }

  function handleToggle() {
    onToggle();
    if (!expanded) loadMatches();
  }

  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  const adjustments = Array.isArray(item.adjustments_for_latam) ? item.adjustments_for_latam : [];
  const isExtracted = item.source === 'extracted';

  return (
    <div className="card">
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${isExtracted ? 'badge-accent' : ''}`}>
              {isExtracted ? <><Icon name="sparkles" size={11} /> extraído IA</> : <><Icon name="edit" size={11} /> manual</>}
            </span>
            <span className="badge">{item.category}</span>
            <span className="badge badge-warn">severidad {item.severity}/10</span>
            <span className="badge">{item.video_match_count} videos</span>
          </div>
          <h3 style={{ margin: '4px 0', fontSize: 16 }}>{item.title}</h3>
          <p style={{ margin: '6px 0', color: 'var(--text-2)' }}>{item.description}</p>
        </div>
        <div className="flex" style={{ alignItems: 'flex-start' }}>
          <button className="btn btn-ghost" onClick={onEdit}><Icon name="edit" size={13} /></button>
          <button className="btn btn-ghost" onClick={onDelete}><Icon name="trash" size={13} /></button>
        </div>
      </div>

      {item.latam_reasoning && (
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: 12,
          marginTop: 10,
        }}>
          <div className="small muted" style={{ marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
            <Icon name="brain" size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Aplicabilidad LATAM (razonamiento IA)
          </div>
          <p className="small" style={{ margin: 0 }}>{item.latam_reasoning}</p>
        </div>
      )}

      {adjustments.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="small muted" style={{ marginBottom: 6, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Ajustes para LATAM
          </div>
          <div className="flex" style={{ flexWrap: 'wrap' }}>
            {adjustments.map((a, i) => <span key={i} className="badge">{a}</span>)}
          </div>
        </div>
      )}

      {evidence.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="small muted">Evidencia ({evidence.length})</summary>
          <ul style={{ marginTop: 8, fontSize: 13, paddingLeft: 20 }}>
            {evidence.map((e, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong>{e.source || e.source_org}</strong>: {e.claim}
                {e.url && <> · <a href={e.url} target="_blank" rel="noreferrer">fuente <Icon name="external" size={11} /></a></>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details
        open={expanded}
        onClick={(e) => { e.preventDefault(); handleToggle(); }}
        style={{ marginTop: 10 }}
      >
        <summary className="small">
          {isExtracted ? 'Videos fuente' : 'Videos clasificados'} ({item.video_match_count})
        </summary>
        {expanded && (
          <div style={{ marginTop: 10 }}>
            {!matches && <p className="small muted">Cargando…</p>}
            {matches && matches.length === 0 && <p className="small muted">Sin videos relacionados.</p>}
            {matches && matches.length > 0 && (
              <table>
                <thead><tr><th>Score</th><th>Video</th><th>Negocio</th><th>Razonamiento</th></tr></thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td><span className="badge">{(m.relevance_score * 100).toFixed(0)}%</span></td>
                      <td><Link to={`/videos/${m.video_id}`}>{m.video_title?.slice(0, 60) || '(sin título)'}</Link></td>
                      <td>{m.business_name || '—'}</td>
                      <td className="small">{m.reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </details>
    </div>
  );
}

function PainPointForm({ item, onCancel, onSaved }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    category: item?.category || 'fintech',
    description: item?.description || '',
    severity: item?.severity ?? 5,
    evidence: Array.isArray(item?.evidence) ? item.evidence : [],
    latam_reasoning: item?.latam_reasoning || '',
  });
  const [evRow, setEvRow] = useState({ source: '', url: '', claim: '' });
  const [error, setError] = useState(null);

  function addEvidence() {
    if (!evRow.source || !evRow.claim) return;
    setForm({ ...form, evidence: [...form.evidence, evRow] });
    setEvRow({ source: '', url: '', claim: '' });
  }

  function removeEvidence(i) {
    setForm({ ...form, evidence: form.evidence.filter((_, idx) => idx !== i) });
  }

  async function save() {
    setError(null);
    try {
      const payload = { ...form, source: 'manual' };
      if (item) await api.updatePainPoint(item.id, payload);
      else await api.createPainPoint(payload);
      onSaved();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="card" style={{ background: 'var(--bg-2)' }}>
      <h3 style={{ marginTop: 0 }}>{item ? 'Editar pain point' : 'Nuevo pain point manual'}</h3>
      {error && <div className="alert alert-err">{error}</div>}

      <div className="row">
        <div className="col" style={{ minWidth: 280 }}>
          <label>Título</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="col" style={{ maxWidth: 200 }}>
          <label>Categoría</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col" style={{ maxWidth: 140 }}>
          <label>Severidad</label>
          <input type="number" min="1" max="10" value={form.severity} onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })} />
        </div>
      </div>

      <div className="field">
        <label>Descripción del problema</label>
        <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="field">
        <label>Razonamiento LATAM</label>
        <textarea rows={3} value={form.latam_reasoning} onChange={(e) => setForm({ ...form, latam_reasoning: e.target.value })} placeholder="Por qué este pain point aplica al mercado LATAM" />
      </div>

      <h4>Evidencia</h4>
      {form.evidence.map((e, i) => (
        <div key={i} className="small" style={{ background: 'var(--bg-3)', padding: 10, borderRadius: 6, marginBottom: 6 }}>
          <div className="between">
            <strong>{e.source || e.source_org}</strong>
            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => removeEvidence(i)}>quitar</button>
          </div>
          <div>{e.claim}</div>
          {e.url && <a href={e.url} target="_blank" rel="noreferrer">{e.url}</a>}
        </div>
      ))}

      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="col">
          <label>Fuente</label>
          <input value={evRow.source} onChange={(e) => setEvRow({ ...evRow, source: e.target.value })} />
        </div>
        <div className="col">
          <label>URL</label>
          <input value={evRow.url} onChange={(e) => setEvRow({ ...evRow, url: e.target.value })} />
        </div>
        <div className="col" style={{ minWidth: 280 }}>
          <label>Claim / dato</label>
          <input value={evRow.claim} onChange={(e) => setEvRow({ ...evRow, claim: e.target.value })} />
        </div>
        <div className="col" style={{ maxWidth: 120 }}>
          <button className="btn btn-secondary" onClick={addEvidence}>Añadir</button>
        </div>
      </div>

      <div className="flex" style={{ marginTop: 12 }}>
        <button className="btn" onClick={save}>Guardar</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
