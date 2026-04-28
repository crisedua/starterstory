import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const CATEGORIES = [
  'fintech', 'logistica', 'edtech', 'edtech-talent', 'healthtech',
  'agtech', 'govtech', 'proptech', 'cleantech', 'saas-pyme', 'safetech', 'otro',
];

export default function PainPoints() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    try { setItems(await api.getPainPoints()); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  }
  useEffect(() => { load(); }, []);

  async function classifyAll() {
    setBusy(true); setMsg(null);
    try {
      await api.classifyAllVideos(false);
      setMsg({ type: 'info', text: 'Clasificación iniciada en background. Recarga en 1-2 min para ver resultados.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setBusy(false); }
  }

  async function reclassifyAll() {
    if (!confirm('Esto borra TODAS las clasificaciones existentes y vuelve a clasificar todos los videos contra los pain points actuales. ¿Continuar?')) return;
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

  const filtered = filter ? items.filter((p) => p.category === filter) : items;

  return (
    <div>
      <h1 className="page-title">Pain Points LATAM</h1>
      <p className="page-subtitle">
        Investigación de problemas reales del mercado latinoamericano con fuentes citadas.
        {' '}{items.length} pain points · {items.reduce((s, p) => s + p.video_match_count, 0)} clasificaciones
      </p>

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      <div className="card">
        <div className="between">
          <div className="flex">
            <label style={{ margin: 0 }}>Filtro:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
              <option value="">Todas las categorías</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex">
            <button className="btn btn-secondary" disabled={busy} onClick={classifyAll}>
              Clasificar pendientes
            </button>
            <button className="btn btn-secondary" disabled={busy} onClick={reclassifyAll}>
              Reclasificar todo
            </button>
            <button className="btn" onClick={() => setEditing('new')}>+ Nuevo pain point</button>
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

      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          Estos pain points se usan como Dimensión 1 del clasificador (relevancia LATAM). Cuando agregues, edites o borres uno, ejecuta <strong>"Reclasificar todo"</strong> para que las clasificaciones reflejen los cambios. La Dimensión 2 (alineación con tu RPM) se evalúa al generar soluciones.
        </p>
      </div>

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

  return (
    <div className="card">
      <div className="between">
        <div style={{ flex: 1 }}>
          <div className="flex" style={{ marginBottom: 4 }}>
            <span className="badge">{item.category}</span>
            <span className="badge badge-warn">severidad {item.severity}/10</span>
            <span className="badge">{item.video_match_count} videos relacionados</span>
          </div>
          <h3 style={{ margin: '4px 0' }}>{item.title}</h3>
          <p style={{ margin: '4px 0' }}>{item.description}</p>
        </div>
        <div className="flex" style={{ alignItems: 'flex-start' }}>
          <button className="btn btn-ghost" onClick={onEdit}>Editar</button>
          <button className="btn btn-ghost" onClick={onDelete}>Borrar</button>
        </div>
      </div>

      {evidence.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="small muted">Evidencia ({evidence.length} fuentes)</summary>
          <ul style={{ marginTop: 8, fontSize: 13 }}>
            {evidence.map((e, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong>{e.source}</strong>: {e.claim}
                {e.url && <> · <a href={e.url} target="_blank" rel="noreferrer">fuente ↗</a></>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details open={expanded} onClick={(e) => { e.preventDefault(); handleToggle(); }} style={{ marginTop: 10 }}>
        <summary className="small">Videos clasificados como inspiración ({item.video_match_count})</summary>
        {expanded && (
          <div style={{ marginTop: 10 }}>
            {!matches && <p className="small muted">Cargando…</p>}
            {matches && matches.length === 0 && <p className="small muted">Aún no hay videos clasificados con este pain point.</p>}
            {matches && matches.length > 0 && (
              <table>
                <thead><tr><th>Score</th><th>Video</th><th>Negocio</th><th>Razonamiento IA</th></tr></thead>
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
    evidence: item?.evidence || [],
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
      if (item) await api.updatePainPoint(item.id, form);
      else await api.createPainPoint(form);
      onSaved();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="card" style={{ background: 'var(--bg-3)' }}>
      <h3 style={{ marginTop: 0 }}>{item ? 'Editar pain point' : 'Nuevo pain point'}</h3>
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
          <label>Severidad (1-10)</label>
          <input type="number" min="1" max="10" value={form.severity} onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })} />
        </div>
      </div>

      <div className="field">
        <label>Descripción</label>
        <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <h4>Evidencia</h4>
      {form.evidence.map((e, i) => (
        <div key={i} className="small" style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 6, marginBottom: 6 }}>
          <div className="between">
            <strong>{e.source}</strong>
            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => removeEvidence(i)}>quitar</button>
          </div>
          <div>{e.claim}</div>
          {e.url && <a href={e.url} target="_blank" rel="noreferrer">{e.url}</a>}
        </div>
      ))}

      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="col">
          <label>Fuente (ej: BID, CEPAL)</label>
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
