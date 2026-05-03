import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import Icon from '../components/Icon.jsx';

export default function Solutions() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [rpmReady, setRpmReady] = useState(null);

  async function load() {
    try {
      const [s, profile] = await Promise.all([api.getSolutions(), api.getRpmProfile()]);
      setItems(s);
      setRpmReady(profile?.is_complete || false);
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    if (items.length > 0 && !confirm('Esto reemplaza las soluciones actuales por una nueva generación IA basada en tu RPM y pain points actuales. ¿Continuar?')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.generateSolutions(true);
      setMsg({ type: 'info', text: `${r.generated} soluciones generadas.` });
      await load();
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setBusy(false); }
  }

  async function deleteOne(id) {
    if (!confirm('¿Borrar esta solución?')) return;
    try { await api.deleteSolution(id); await load(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  }

  return (
    <div>
      <h1 className="page-title">Motor de Soluciones</h1>
      <p className="page-subtitle">
        Cruza tu perfil RPM, los pain points LATAM y los videos del canal para generar
        propuestas de negocio adaptadas a TI.
      </p>

      {msg && <div className={`alert alert-${msg.type === 'err' ? 'err' : 'info'}`}>{msg.text}</div>}

      {rpmReady === false && (
        <div className="alert alert-warn">
          <Icon name="alert" size={14} /> Necesitas completar y procesar tu perfil RPM antes de generar soluciones.{' '}
          <Link to="/rpm">Ir al Wizard RPM →</Link>
        </div>
      )}

      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--accent-soft), transparent)',
        borderColor: 'rgba(167, 139, 250, 0.3)',
      }}>
        <div className="between">
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkles" size={16} style={{ color: 'var(--accent)' }} />
              Generador IA de soluciones
            </h3>
            <p className="small muted" style={{ margin: '6px 0 0' }}>
              La IA analizará tu RPM, los pain points LATAM clasificados y los videos fuente
              para producir 4 propuestas adaptadas con score de fit, dificultad y primeros pasos.
            </p>
          </div>
          <div className="flex">
            <button className="btn" disabled={busy || rpmReady === false} onClick={generate}>
              {busy
                ? <><Icon name="spinner" size={14} className="spin" /> Generando…</>
                : <><Icon name="sparkles" size={14} /> {items.length > 0 ? 'Re-generar' : 'Generar soluciones'}</>}
            </button>
          </div>
        </div>
      </div>

      {items.length === 0 && rpmReady && (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><Icon name="sparkles" size={20} /></div>
            <div className="empty-title">Sin soluciones todavía</div>
            <div className="empty-desc">
              Pulsa "Generar soluciones" arriba. Necesitas tener videos analizados, pain points extraídos
              y clasificaciones video↔pain-point en su lugar.
            </div>
          </div>
        </div>
      )}

      {items.map((s) => <SolutionCard key={s.id} item={s} onDelete={() => deleteOne(s.id)} />)}
    </div>
  );
}

function SolutionCard({ item, onDelete }) {
  const breakdown = item.fit_score_breakdown || {};
  const firstSteps = Array.isArray(item.first_steps) ? item.first_steps : [];

  const diffColor = item.difficulty === 'baja' ? 'badge-ok' : item.difficulty === 'alta' ? 'badge-err' : 'badge-warn';

  return (
    <div className="card">
      <div className="between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="flex" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="badge badge-accent">{item.pain_point_category}</span>
            <span className={`badge ${diffColor}`}>dificultad {item.difficulty}</span>
            {item.monetization_model && <span className="badge">{item.monetization_model}</span>}
            {item.monthly_revenue_potential_usd && (
              <span className="badge">~${item.monthly_revenue_potential_usd}/mes</span>
            )}
          </div>
          <h3 style={{ margin: '4px 0', fontSize: 17 }}>{item.title}</h3>
          <p style={{ margin: '6px 0', color: 'var(--text-2)' }}>{item.description}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            background: 'var(--accent-soft)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            borderRadius: 12, padding: '8px 16px', minWidth: 90,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Fit</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-hover)' }}>{item.fit_score}</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onDelete}><Icon name="trash" size={13} /></button>
          </div>
        </div>
      </div>

      {(breakdown.pain_severity != null || breakdown.rpm_fit != null || breakdown.viability != null) && (
        <div className="row" style={{ marginBottom: 12 }}>
          <Mini label="Severidad pain" value={`${breakdown.pain_severity ?? '?'}/40`} />
          <Mini label="Fit RPM" value={`${breakdown.rpm_fit ?? '?'}/40`} />
          <Mini label="Viabilidad" value={`${breakdown.viability ?? '?'}/20`} />
        </div>
      )}

      <Section title="Pain point que resuelve" icon="bulb">
        <p className="small">
          <strong>{item.pain_point_title}</strong>
          {item.pain_point_severity && <span className="muted"> · severidad {item.pain_point_severity}/10</span>}
        </p>
      </Section>

      <Section title="Adaptación LATAM" icon="brain">
        <p className="small">{item.latam_adaptation}</p>
      </Section>

      <Section title="Por qué calza con tu RPM" icon="target">
        <p className="small">{item.rpm_alignment}</p>
      </Section>

      {item.difficulty_reasoning && (
        <Section title="Por qué esta dificultad" icon="alert">
          <p className="small">{item.difficulty_reasoning}</p>
        </Section>
      )}

      {firstSteps.length > 0 && (
        <Section title="Primeros pasos" icon="play">
          <ol className="small" style={{ paddingLeft: 20, margin: 0 }}>
            {firstSteps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ol>
        </Section>
      )}

      {item.sources?.length > 0 && (
        <Section title={`Inspirado en ${item.sources.length} negocio${item.sources.length > 1 ? 's' : ''} de Starter Story`} icon="film">
          <ul className="small" style={{ paddingLeft: 20, margin: 0 }}>
            {item.sources.map((src, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong>{src.business_name || '(sin nombre)'}</strong>{' '}
                — <Link to={`/videos/${src.video_id}`}>{src.title?.slice(0, 70)}</Link>{' '}
                · <a href={src.url} target="_blank" rel="noreferrer">YouTube <Icon name="external" size={11} /></a>
                {src.inspiration_note && <div className="muted" style={{ marginTop: 2 }}>{src.inspiration_note}</div>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <Link to={`/mvt?solution=${item.id}`} className="btn">
          <Icon name="beaker" size={13} /> Validar con MVT →
        </Link>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        <Icon name={icon} size={11} />
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="col" style={{ minWidth: 100, background: 'var(--bg-2)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
      <div className="small muted" style={{ fontSize: 11, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
