import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import Icon from '../components/Icon.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.08), rgba(96, 165, 250, 0.04))',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.18), transparent 70%)',
        }} />
        <div style={{ position: 'relative', maxWidth: 720 }}>
          <span className="badge badge-accent">v0.4 · Etapa 4 desplegada</span>
          <h1 className="page-title" style={{ marginTop: 14 }}>
            Encuentra tu próxima idea de negocio en LATAM
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Esta app extrae los videos de Starter Story, los clasifica contra pain points reales del
            mercado latinoamericano y los cruza con tu perfil RPM para proponer soluciones viables.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-err"><Icon name="alert" /> {error}</div>}

      {stats && (
        <>
          <div className="grid-stats">
            <Stat icon="film" label="Videos" value={stats.videos} accent={stats.videos < 30} />
            <Stat icon="brain" label="Analizados (IA)" value={stats.videos_analyzed} />
            <Stat icon="bulb" label="Pain Points" value={stats.pain_points} />
            <Stat icon="zap" label="Clasificaciones" value={stats.classifications} />
            <Stat icon="target" label="RPM completado" value={stats.rpm_complete > 0 ? '✓' : '—'} link={!stats.rpm_complete && '/rpm'} />
            <Stat icon="sparkles" label="Soluciones" value={stats.solutions} />
          </div>

          <div className="row">
            <div className="col" style={{ minWidth: 360 }}>
              <div className="card">
                <h3><Icon name="clock" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Última ejecución</h3>
                {stats.last_run ? (
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <StatusBadge status={stats.last_run.status} />
                      <span className="small muted">{formatDate(stats.last_run.started_at)}</span>
                    </div>
                    <div className="row">
                      <Mini label="Encontrados" value={stats.last_run.videos_found ?? 0} />
                      <Mini label="Nuevos" value={stats.last_run.videos_new ?? 0} accent />
                      <Mini label="Actualizados" value={stats.last_run.videos_updated ?? 0} />
                    </div>
                    {stats.last_run.error_message && (
                      <p className="small" style={{ color: 'var(--danger)', marginTop: 10 }}>
                        {stats.last_run.error_message.slice(0, 200)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Empty
                    icon="zap"
                    title="Aún no se ha ejecutado el scraper"
                    desc="Configura un cron y ejecuta para empezar a poblar la base de videos."
                    cta={{ to: '/scraper', label: 'Ir al Scraper' }}
                  />
                )}
              </div>
            </div>

            <div className="col" style={{ minWidth: 360 }}>
              <div className="card">
                <h3><Icon name="check" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Próximos pasos</h3>
                <Step n={1} done={true} title="Configura tus claves" desc="Apify y Anthropic en Ajustes" to="/settings" />
                <Step n={2} done={stats.videos > 0} title="Scrapea videos" desc={`${stats.videos}/30 videos · objetivo de la entrega`} to="/scraper" />
                <Step n={3} done={stats.videos_analyzed > 0} title="Análisis IA" desc={`${stats.videos_analyzed} con análisis`} to="/videos" />
                <Step n={4} done={stats.rpm_complete > 0} title="Completa tu RPM" desc="Define Results, Purpose, Massive Action" to="/rpm" />
                <Step n={5} done={stats.classifications > 0} title="Clasifica vs pain points LATAM" desc={`${stats.classifications} clasificaciones`} to="/pain-points" />
                <Step n={6} done={stats.solutions > 0} title="Genera soluciones" desc="Cruza pain points + RPM + videos" to="/solutions" last />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, accent, link }) {
  const node = (
    <div className="stat" style={accent ? { borderColor: 'rgba(167, 139, 250, 0.3)' } : {}}>
      <div className="label">
        <Icon name={icon} size={12} />
        {label}
      </div>
      <div className="value">{value}</div>
    </div>
  );
  return link ? <Link to={link} style={{ display: 'block', color: 'inherit' }}>{node}</Link> : node;
}

function StatusBadge({ status }) {
  const map = {
    success: { cls: 'badge-ok', label: 'success' },
    error: { cls: 'badge-err', label: 'error' },
    running: { cls: 'badge-warn', label: 'running' },
  };
  const m = map[status] || { cls: '', label: status || '—' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function Mini({ label, value, accent }) {
  return (
    <div className="col" style={{ minWidth: 80 }}>
      <div className="small muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Step({ n, done, title, desc, to, last }) {
  return (
    <Link to={to} style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '10px 0',
      color: 'inherit',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 26, height: 26,
        flexShrink: 0,
        borderRadius: '50%',
        background: done ? 'var(--success-soft)' : 'var(--bg-3)',
        color: done ? 'var(--success)' : 'var(--text-3)',
        display: 'grid', placeItems: 'center',
        fontSize: 12, fontWeight: 700,
        border: `1px solid ${done ? 'rgba(52, 211, 153, 0.3)' : 'var(--border)'}`,
      }}>
        {done ? <Icon name="check" size={13} /> : n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        <div className="small muted">{desc}</div>
      </div>
      <Icon name="chevronRight" size={14} style={{ color: 'var(--text-3)', marginTop: 6 }} />
    </Link>
  );
}

function Empty({ icon, title, desc, cta }) {
  return (
    <div className="empty" style={{ padding: '24px 12px' }}>
      <div className="empty-icon"><Icon name={icon} size={20} /></div>
      <div className="empty-title">{title}</div>
      <div className="empty-desc">{desc}</div>
      {cta && <Link to={cta.to} className="btn">{cta.label} <Icon name="arrowRight" size={14} /></Link>}
    </div>
  );
}

function formatDate(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return s; }
}
