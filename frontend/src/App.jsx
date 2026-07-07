import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import DomainsPage from './pages/DomainsPage';
import ScanPage from './pages/ScanPage';
import ReportsPage from './pages/ReportsPage';

function Layout({ children }) {
  return (
    <>
      <div className="background-mesh"></div>
      <div className="app-shell">
        <header className="app-header">
          <h1>Auditor de Cobertura WAF</h1>
          <p>Descubra quais domínios estão sem proteção Akamai.</p>
        </header>

        <nav className="navbar">
          <NavLink to="/domains" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Domínios
          </NavLink>
          <NavLink to="/scan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Scan
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Relatórios
          </NavLink>
        </nav>

        <main>{children}</main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/domains" replace />} />
          <Route path="/domains" element={<DomainsPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:runId" element={<ReportsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
