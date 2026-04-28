import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { supabaseConfigured } from '../lib/supabase.js';

export default function Settings() {
  const [data, setData] = useState({});
  const [form, setForm] = useState({ apify_token: '', anthropic_api_key: '' });
  const [msg, setMsg] = useState(null);

  const load = () => api.getSettings().then(setData).catch((e) => setMsg({ type: 'err', text: e.message }));
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {};
      if (form.apify_token) payload.apify_token = form.apify_token;
      if (form.anthropic_api_key) payload.anthropic_api_key = form.anthropic_api_key;
      await api.saveSettings(payload);
      setForm({ apify_token: '', anthropic_api_key: '' });
      await load();
      setMsg({ type: 'info', text: 'Guardado correctamente.' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
  }

  return (
    <div>
      <h1 className="page-title">Ajustes</h1>
      <p className="page-subtitle">Configura las claves de API necesarias para que la app funcione</p>

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Supabase</h3>
        <p className="small">
          Estado del frontend: {supabaseConfigured
            ? <span className="badge badge-ok">conectado</span>
            : <span className="badge badge-warn">no configurado</span>}
        </p>
        <p className="small muted">
          Las credenciales de Supabase se cargan desde variables de entorno y no son editables desde la UI:
        </p>
        <ul className="small muted">
          <li><code>backend/.env</code> → <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code></li>
          <li><code>frontend/.env</code> → <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p className="small muted">
          Antes de usar la app por primera vez, ejecuta el SQL de <code>supabase/migrations/001_initial_schema.sql</code>
          en Supabase Studio → SQL Editor.
        </p>
      </div>

      <form className="card" onSubmit={save}>
        <h3 style={{ marginTop: 0 }}>Apify</h3>
        <p className="small muted">
          Necesario para scrapear el canal de YouTube. Estado: {data.apify_token_set
            ? <span className="badge badge-ok">configurado ({data.apify_token})</span>
            : <span className="badge badge-warn">no configurado</span>}
        </p>
        <div className="field">
          <label>APIFY_TOKEN</label>
          <input
            type="password"
            placeholder="apify_api_..."
            value={form.apify_token}
            onChange={(e) => setForm({ ...form, apify_token: e.target.value })}
          />
        </div>

        <h3>Anthropic</h3>
        <p className="small muted">
          Necesario para análisis IA, clasificación y motor de soluciones. Estado: {data.anthropic_api_key_set
            ? <span className="badge badge-ok">configurado ({data.anthropic_api_key})</span>
            : <span className="badge badge-warn">no configurado</span>}
        </p>
        <div className="field">
          <label>ANTHROPIC_API_KEY</label>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={form.anthropic_api_key}
            onChange={(e) => setForm({ ...form, anthropic_api_key: e.target.value })}
          />
        </div>

        <button className="btn" type="submit">Guardar</button>
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>¿Por qué Apify?</h3>
        <p className="small">
          Para extraer videos de YouTube hay tres caminos comunes: la <strong>API oficial de YouTube Data v3</strong> (rápida, pero no entrega transcripciones y tiene cuotas estrictas), <strong>scraping con librerías</strong> como <code>youtube-dl</code> / <code>ytdl</code> (frágil, requiere mantenimiento) y <strong>Apify</strong> (actor mantenido por terceros que entrega metadata + transcripciones en una sola llamada). Elegimos Apify porque resuelve el caso completo: necesitamos tanto los datos crudos del video (título, vistas, fecha) como la transcripción del contenido hablado para que la IA pueda extraer el modelo de negocio del emprendedor.
        </p>
      </div>
    </div>
  );
}
