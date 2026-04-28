import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const PRESET_CRONS = [
  { label: 'Cada hora', value: '0 * * * *' },
  { label: 'Cada 6 horas', value: '0 */6 * * *' },
  { label: 'Cada 12 horas', value: '0 */12 * * *' },
  { label: 'Diario (3 AM)', value: '0 3 * * *' },
  { label: 'Semanal (lunes 3 AM)', value: '0 3 * * 1' },
];

// Validador básico de cron (5 campos). Acepta números, *, /, -, ,
function isValidCron(s) {
  if (!s || typeof s !== 'string') return false;
  const parts = s.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => /^[\d*/,\-]+$/.test(p));
}

function describeCron(s) {
  const preset = PRESET_CRONS.find((p) => p.value === s);
  if (preset) return preset.label;
  return isValidCron(s) ? 'Cron personalizado' : 'Inválido';
}

export default function Scraper() {
  const [configs, setConfigs] = useState([]);
  const [channels, setChannels] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newChannel, setNewChannel] = useState({ handle: '', name: '' });

  async function load() {
    const [c, ch, r] = await Promise.all([
      api.getScraperConfig(),
      api.getChannels(),
      api.getScraperRuns(),
    ]);
    setConfigs(c);
    setChannels(ch);
    setRuns(r);
  }
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  async function updateConfig(channelId, patch) {
    try {
      await api.updateScraperConfig(channelId, patch);
      await load();
      setMsg({ type: 'info', text: 'Configuración actualizada.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  async function runNow(channelId) {
    setBusy(true);
    setMsg({ type: 'info', text: 'Ejecutando scraper… puede tardar 30-60s (Apify + inserts).' });
    try {
      const r = await api.runScraper(channelId);
      setMsg({
        type: 'info',
        text: `Scrape completo: ${r.found || 0} encontrados, ${r.new || 0} nuevos, ${r.updated || 0} actualizados.`,
      });
      await load();
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setBusy(false); }
  }

  async function addChannel(e) {
    e.preventDefault();
    setMsg(null);
    try {
      let handle = newChannel.handle.trim();
      if (!handle) return;
      if (!handle.startsWith('@')) handle = '@' + handle;
      await api.addChannel({ handle, name: newChannel.name || handle });
      setNewChannel({ handle: '', name: '' });
      await load();
      setMsg({ type: 'info', text: 'Canal añadido. Configura su scheduling abajo.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  return (
    <div>
      <h1 className="page-title">Scraper & Logs</h1>
      <p className="page-subtitle">Configura el schedule, gestiona canales y revisa el historial</p>

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Canales</h3>
        <p className="small muted">El esquema soporta múltiples canales. Añade otro si quieres comparar Starter Story con un segundo canal.</p>
        <table>
          <thead><tr><th>Handle</th><th>Nombre</th><th>Videos</th><th>URL</th></tr></thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.handle}</strong></td>
                <td>{c.name}</td>
                <td>{c.video_count}</td>
                <td><a href={c.url} target="_blank" rel="noreferrer">abrir ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addChannel} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div className="row">
            <div className="col">
              <label>Handle (@nombre)</label>
              <input value={newChannel.handle} onChange={(e) => setNewChannel({ ...newChannel, handle: e.target.value })} placeholder="@otrocanal" />
            </div>
            <div className="col">
              <label>Nombre (opcional)</label>
              <input value={newChannel.name} onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })} />
            </div>
            <div className="col" style={{ maxWidth: 140, display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn" type="submit">Añadir canal</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Configuración por canal</h3>
        {configs.length === 0 && <p className="muted">No hay configuraciones.</p>}
        {configs.map((c) => (
          <ConfigRow key={c.id} cfg={c} onSave={(patch) => updateConfig(c.channel_id, patch)} onRun={() => runNow(c.channel_id)} busy={busy} />
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Historial de ejecuciones</h3>
        <table>
          <thead>
            <tr>
              <th>Inicio</th>
              <th>Canal</th>
              <th>Trigger</th>
              <th>Estado</th>
              <th>Encontrados</th>
              <th>Nuevos</th>
              <th>Actualizados</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr><td colSpan={8} className="muted center">Sin ejecuciones todavía. Pulsa "Ejecutar ahora" arriba.</td></tr>
            )}
            {runs.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRun(r)}>
                <td className="small">{formatDate(r.started_at)}</td>
                <td>{r.channel_handle}</td>
                <td><span className="badge">{r.trigger}</span></td>
                <td>
                  <span className={`badge badge-${r.status === 'success' ? 'ok' : r.status === 'error' ? 'err' : 'warn'}`}>
                    {r.status}
                  </span>
                </td>
                <td>{r.videos_found ?? '—'}</td>
                <td>{r.videos_new ?? '—'}</td>
                <td>{r.videos_updated ?? '—'}</td>
                <td className="small muted">ver →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </div>
  );
}

function ConfigRow({ cfg, onSave, onRun, busy }) {
  const [cron, setCron] = useState(cfg.cron_expression);
  const [enabled, setEnabled] = useState(!!cfg.enabled);
  const [maxV, setMaxV] = useState(cfg.max_videos_per_run);
  const [error, setError] = useState(null);

  function save() {
    if (!isValidCron(cron)) { setError('Expresión cron inválida'); return; }
    setError(null);
    onSave({ cron_expression: cron, enabled: enabled, max_videos_per_run: maxV });
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
      <div className="between">
        <div>
          <strong>{cfg.channel_name}</strong> <span className="muted small">({cfg.channel_handle})</span>
        </div>
        <div className="flex">
          <button className="btn-secondary btn" disabled={busy} onClick={onRun}>Ejecutar ahora</button>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="col">
          <label>Expresión cron <span className="muted">— {describeCron(cron)}</span></label>
          <input value={cron} onChange={(e) => setCron(e.target.value)} />
          {error && <div className="small" style={{ color: 'var(--err)', marginTop: 4 }}>{error}</div>}
          <div className="small muted" style={{ marginTop: 6 }}>
            Presets:&nbsp;
            {PRESET_CRONS.map((p) => (
              <button key={p.value} type="button" className="btn-ghost btn" style={{ padding: '2px 8px', marginRight: 4, fontSize: 11 }} onClick={() => setCron(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="col" style={{ maxWidth: 180 }}>
          <label>Máx. videos por corrida</label>
          <input type="number" min="1" max="100" value={maxV} onChange={(e) => setMaxV(Number(e.target.value))} />
          <div className="small muted" style={{ marginTop: 4 }}>
            Sugerencia: 30+ para llegar al mínimo de la entrega de una sola vez.
          </div>
        </div>
        <div className="col" style={{ maxWidth: 140, display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--fg)' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Habilitado
          </label>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="btn" onClick={save}>Guardar</button>
      </div>
    </div>
  );
}

function RunDetail({ run, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 640, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
        <div className="between">
          <h3 style={{ margin: 0 }}>Run #{run.id}</h3>
          <button className="btn-ghost btn" onClick={onClose}>Cerrar</button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Field label="Canal" value={run.channel_handle} />
          <Field label="Trigger" value={run.trigger} />
          <Field label="Estado" value={run.status} />
        </div>
        <div className="row">
          <Field label="Iniciado" value={formatDate(run.started_at)} />
          <Field label="Terminado" value={run.finished_at ? formatDate(run.finished_at) : '—'} />
        </div>
        <div className="row">
          <Field label="Encontrados" value={run.videos_found} />
          <Field label="Nuevos" value={run.videos_new} />
          <Field label="Actualizados" value={run.videos_updated} />
        </div>
        {run.error_message && (
          <>
            <h4>Error</h4>
            <pre style={{ background: 'var(--bg-3)', padding: 12, borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {run.error_message}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="col" style={{ minWidth: 140 }}>
      <label>{label}</label>
      <div>{value ?? <span className="muted">—</span>}</div>
    </div>
  );
}

function formatDate(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleString('es-CL'); } catch { return s; }
}
