import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import ProjectSwitcher from './components/ProjectSwitcher';
import ProjectScoped from './components/ProjectScoped';
import RootRedirect from './components/RootRedirect';
import { ShieldIcon, DomainsIcon, ScanIcon, ReportsIcon, ProjectsIcon } from './components/Icons';
import ProjectsPage from './pages/ProjectsPage';
import DomainsPage from './pages/DomainsPage';
import ScanPage from './pages/ScanPage';
import ReportsPage from './pages/ReportsPage';

function navClass({ isActive }) {
  return `nav-link ${isActive ? 'active' : ''}`;
}

function Layout({ children }) {
  const { activeProjectId } = useProjects();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldIcon /></div>
          <div className="brand-name">
            Auditor WAF
            <span>Cobertura Akamai</span>
          </div>
        </div>

        <ProjectSwitcher />

        <nav className="primary-nav">
          {activeProjectId && (
            <>
              <div className="nav-group-label">Auditoria</div>
              <NavLink to={`/p/${activeProjectId}/domains`} className={navClass}>
                <DomainsIcon /> Domínios
              </NavLink>
              <NavLink to={`/p/${activeProjectId}/scan`} className={navClass}>
                <ScanIcon /> Scan
              </NavLink>
              <NavLink to={`/p/${activeProjectId}/reports`} className={navClass}>
                <ReportsIcon /> Relatórios
              </NavLink>
            </>
          )}
          <div className="nav-group-label">Workspace</div>
          <NavLink to="/projects" className={navClass}>
            <ProjectsIcon /> Projetos
          </NavLink>
        </nav>
      </aside>

      <div className="main">
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProjectProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/p/:projectId/domains" element={<ProjectScoped Component={DomainsPage} />} />
            <Route path="/p/:projectId/scan" element={<ProjectScoped Component={ScanPage} />} />
            <Route path="/p/:projectId/reports" element={<ProjectScoped Component={ReportsPage} />} />
            <Route path="/p/:projectId/reports/:runId" element={<ProjectScoped Component={ReportsPage} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ProjectProvider>
    </BrowserRouter>
  );
}
