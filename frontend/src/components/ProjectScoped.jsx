import { useParams } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';

export default function ProjectScoped({ Component }) {
  const { projectId } = useParams();
  const { projects, loading } = useProjects();
  const id = Number(projectId);

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Carregando...</p>
      </div>
    );
  }

  if (!projects.some((p) => p.id === id)) {
    return (
      <div className="panel">
        <p className="empty-state">Projeto não encontrado. Ele pode ter sido excluído.</p>
      </div>
    );
  }

  // key={id} força o remount completo da página ao trocar de projeto pelo
  // switcher - sem isso o React Router reaproveita a instância do componente
  // e deixa estado antigo (busca, seleção, dados carregados) do projeto anterior.
  return <Component key={id} projectId={id} />;
}
