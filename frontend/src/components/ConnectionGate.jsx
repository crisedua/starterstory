import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Icon from './Icon.jsx';

export default function ConnectionGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | online | offline
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL || '(proxy a localhost:4000 en dev)';

  async function check() {
    setStatus('checking');
    setError(null);
    try {
      await api.health();
      setStatus('online');
    } catch (e) {
      setError(e.message);
      setStatus('offline');
    }
  }

  useEffect(() => { check(); }, []);

  if (status === 'checking') {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'var(--bg)', color: 'var(--text-2)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Icon name="spinner" size={28} className="spin" style={{ color: 'var(--accent)' }} />
          <div className="small">Conectando con el backend…</div>
        </div>
      </div>
    );
  }

  if (status === 'offline') {
    return <OfflineScreen apiUrl={apiUrl} error={error} onRetry={check} />;
  }

  return children;
}

function OfflineScreen({ apiUrl, error, onRetry }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid', placeItems: 'center',
      padding: 24,
      background: 'var(--bg)',
    }}>
      <div className="card" style={{ maxWidth: 640, width: '100%', padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--danger-soft)', color: 'var(--danger)',
            display: 'grid', placeItems: 'center',
            border: '1px solid rgba(248, 113, 113, 0.3)',
          }}>
            <Icon name="alert" size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Backend no disponible</h2>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              La aplicación funciona pero no puede llegar a la API en <code>{apiUrl}</code>
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-err" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        <h3 style={{ marginTop: 0, fontSize: 14 }}>Cómo arreglarlo</h3>

        <Section
          icon="zap"
          title="Opción rápida — desarrollo local"
          steps={[
            <>Abre la terminal en la raíz del proyecto y ejecuta <code>npm run dev</code></>,
            <>Esto levanta backend en <code>:4000</code> y frontend en <code>:5173</code> con proxy</>,
            <>Asegúrate de tener <code>backend/.env</code> con <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code></>,
          ]}
        />

        <Section
          icon="sparkles"
          title="Opción producción — desplegar backend en Render"
          steps={[
            <>Crea cuenta en <a href="https://render.com" target="_blank" rel="noreferrer">render.com</a></>,
            <>New → Web Service → conecta el repo</>,
            <>Root Directory: <code>backend</code> · Build: <code>npm install</code> · Start: <code>npm start</code></>,
            <>Environment: <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>APIFY_TOKEN</code>, <code>ANTHROPIC_API_KEY</code></>,
            <>Copia la URL pública del servicio</>,
            <>En Vercel → Settings → Environment Variables → añade <code>VITE_API_URL</code> con esa URL</>,
            <>Redeploy del frontend</>,
          ]}
        />

        <div style={{ marginTop: 22, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={onRetry}>
            <Icon name="refresh" size={14} /> Reintentar conexión
          </button>
          <a className="btn btn-secondary" href="https://render.com" target="_blank" rel="noreferrer">
            <Icon name="external" size={14} /> Abrir Render
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, steps }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'grid', placeItems: 'center',
        }}>
          <Icon name={icon} size={14} />
        </div>
        <strong style={{ fontSize: 13 }}>{title}</strong>
      </div>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}
