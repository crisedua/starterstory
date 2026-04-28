import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import Scraper from './pages/Scraper.jsx';
import Videos from './pages/Videos.jsx';
import VideoDetail from './pages/VideoDetail.jsx';
import PainPoints from './pages/PainPoints.jsx';
import RpmWizard from './pages/RpmWizard.jsx';
import Solutions from './pages/Solutions.jsx';
import Mvt from './pages/Mvt.jsx';

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <h1>🚀 Starter <span>Story</span> LATAM</h1>

        <div className="nav-section">Inicio</div>
        <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          Dashboard
        </NavLink>

        <div className="nav-section">Fase 1 — Scraping</div>
        <NavLink to="/scraper" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          Scraper & Logs
        </NavLink>
        <NavLink to="/videos" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          Videos
        </NavLink>

        <div className="nav-section">Fase 3 — Clasificación</div>
        <NavLink to="/pain-points" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          Pain Points LATAM
        </NavLink>
        <NavLink to="/rpm" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          Wizard RPM
        </NavLink>

        <div className="nav-section">Fase 4 — Soluciones</div>
        <NavLink to="/solutions" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          Motor de Soluciones
        </NavLink>

        <div className="nav-section">Fase 5 — Validación</div>
        <NavLink to="/mvt" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          MVT
        </NavLink>

        <div className="nav-section">Sistema</div>
        <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          Ajustes (APIs)
        </NavLink>
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
