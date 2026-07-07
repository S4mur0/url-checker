import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';

const ProjectContext = createContext(null);
const LAST_PROJECT_KEY = 'waf-auditor:last-project-id';

export function getLastProjectId() {
  const raw = localStorage.getItem(LAST_PROJECT_KEY);
  return raw ? Number(raw) : null;
}

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      const data = await api.listProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // O switcher/header vive fora da árvore de <Routes>, então useParams() não
  // funciona ali - derivamos o projeto ativo diretamente da URL via useLocation().
  const activeProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/p\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [location.pathname]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem(LAST_PROJECT_KEY, String(activeProjectId));
    }
  }, [activeProjectId]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  async function createProject(payload) {
    const project = await api.createProject(payload);
    await refresh();
    return project;
  }

  async function updateProject(id, payload) {
    const project = await api.updateProject(id, payload);
    await refresh();
    return project;
  }

  async function deleteProject(id) {
    await api.deleteProject(id);
    await refresh();
  }

  const value = {
    projects,
    loading,
    error,
    activeProjectId,
    activeProject,
    refresh,
    createProject,
    updateProject,
    deleteProject,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects deve ser usado dentro de ProjectProvider');
  return ctx;
}
