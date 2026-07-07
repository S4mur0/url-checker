import { Navigate } from 'react-router-dom';
import { useProjects, getLastProjectId } from '../context/ProjectContext';

export default function RootRedirect() {
  const { projects, loading } = useProjects();

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Carregando...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return <Navigate to="/projects" replace />;
  }

  const lastId = getLastProjectId();
  const target = projects.some((p) => p.id === lastId) ? lastId : projects[0].id;
  return <Navigate to={`/p/${target}/domains`} replace />;
}
