import { Routes, Route, NavLink } from 'react-router-dom';
import Icon from './components/Icon.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import Scraper from './pages/Scraper.jsx';
import Videos from './pages/Videos.jsx';
import VideoDetail from './pages/VideoDetail.jsx';
import PainPoints from './pages/PainPoints.jsx';
import RpmWizard from './pages/RpmWizard.jsx';
import Solutions from './pages/Solutions.jsx';
import Mvt from './pages/Mvt.jsx';

const NAV = [
  { section: 'Inicio', items: [
    { to: '/', icon: 'home', label: 'Dashboard', end: true },
  ]},
  { section: 'Fase 1 — Scraping', items: [
    { to: '/scraper', icon: 'zap', label: 'Scraper & Logs' },
    { to: '/videos', icon: 'film', label: 'Videos' },
  ]},
  { section: 'Fase 3 — Clasificación', items: [
    { to: '/pain-points', icon: 'bulb', label: 'Pain Points LATAM' },
    { to: '/rpm', icon: 'target', label: 'Wizard RPM' },
  ]},
  { section: 'Fase 4 — Soluciones', items: [
    { to: '/solutions', icon: 'sparkles', label: 'Motor de Soluciones' },
  ]},
  { section: 'Fase 5 — Validación', items: [
    { to: '/mvt', icon: 'beaker', label: 'MVT' },
  ]},
  { section: 'Sistema', items: [
    { to: '/settings', icon: 'cog', label: 'Ajustes' },
  ]},
];

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SS</div>
          <div className="brand-name">
            Starter Story <span>LATAM</span>
          </div>
        </div>

        {NAV.map((group) => (
          <div key={group.section}>
            <div className="nav-section">{group.section}</div>
            {group.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                <Icon name={it.icon} size={15} />
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/scraper" element={<Scraper />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/videos/:id" element={<VideoDetail />} />
          <Route path="/pain-points" element={<PainPoints />} />
          <Route path="/rpm" element={<RpmWizard />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/mvt" element={<Mvt />} />
        </Routes>
      </main>
    </div>
  );
}
