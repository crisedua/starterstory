import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Vista general del estado de la app y los módulos</p>

      {error && <div className="alert alert-err">{error}</div>}

      {stats && (
        <>
          <div className="grid-stats">
            <div className="stat"><div className="label">Videos</div><div className="value">{stats.videos}</div></div>
            <div className="stat"><div className="label">Analizados (IA)</div><div className="value">{stats.videos_analyzed}</div></div>
            <div className="stat"><div className="label">Pain Points</div><div className="value">{stats.pain_points}</div></div>
            <div className="stat"><div className="label">Clasificaciones</div><div className="value">{stats.classifications}</div></div>
            <div className="stat">
              <div className="label">RPM completado</div>
              <div className="value">{stats.rpm_complete > 0 ? '✓' : '—'}</div>
              {!stats.rpm_complete && <Link to="/rpm" className="small">completar →</Link>}
            </div>
            <div className="stat"><div className="label">Soluciones</div><div className="value">{stats.solutions}</div></div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Última ejecución del scraper</h3>
            {stats.last_run ? (
              <div className="small">
                <div><strong>Inicio:</strong> {stats.last_run.started_at}</div>
                <div><strong>Estado:</strong> <span className={`badge badge-${stats.last_run.status === 'success' ? 'ok' : stats.last_run.status === 'error' ? 'err' : 'warn'}`}>{stats.last_run.status}</span></div>
                <div><strong>Encontrados:</strong> {stats.last_run.videos_found} | <strong>Nuevos:</strong> {stats.last_run.videos_new} | <strong>Actualizados:</strong> {stats.last_run.videos_updated}</div>
              </div>
            ) : (
              <p className="muted">Aún no se ha ejecutado el scraper. Configúralo en <Link to="/scraper">Scraper & Logs</Link>.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Próximos pasos</h3>
            <ol>
              <li>Configura tus claves de API en <Link to="/settings">Ajustes</Link>.</li>
              <li>Ejecuta el scraper en <Link to="/scraper">Scraper & Logs</Link> para obtener los primeros videos del canal.</li>
              <li>Revisa los <Link to="/videos">Videos</Link> y sus análisis IA.</li>
              <li>Completa el <Link to="/rpm">Wizard RPM</Link> para definir tu perfil.</li>
              <li>Revisa la investigación de <Link to="/pain-points">Pain Points LATAM</Link>.</li>
              <li>Genera <Link to="/solutions">Soluciones</Link> y valida una con <Link to="/mvt">MVT</Link>.</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
