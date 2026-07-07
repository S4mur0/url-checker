import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import ProjectAvatar from '../components/ProjectAvatar';
import ProjectFormModal from '../components/ProjectFormModal';
import DeleteProjectModal from '../components/DeleteProjectModal';

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return 'hoje';
  if (diffDays === 1) return 'há 1 dia';
  if (diffDays < 30) return `há ${diffDays} dias`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'há 1 mês';
  return `há ${diffMonths} meses`;
}

export default function ProjectsPage() {
  const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="panel">
      <div className="section-header">
        <div>
          <h2>Projetos</h2>
          <p className="muted">Separe domínios e scans por cliente ou engajamento</p>
        </div>
        <button className="primary-btn" onClick={() => setShowCreateModal(true)}>
          + Novo Projeto
        </button>
      </div>

      {error && <p style={{ color: 'var(--status-offline)' }}>{error}</p>}

      {loading ? (
        <p className="muted">Carregando...</p>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <p style={{ marginBottom: '1rem' }}>Nenhum projeto ainda.</p>
          <button className="primary-btn" onClick={() => setShowCreateModal(true)}>
            Criar primeiro projeto
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/p/${project.id}/domains`)}
            >
              <div className="project-card-header">
                <ProjectAvatar project={project} size={40} />
                <h3>{project.name}</h3>
              </div>

              {project.description && <p className="project-card-description">{project.description}</p>}

              <p className="muted project-card-stats">
                {project.domain_count} domínio{project.domain_count === 1 ? '' : 's'}
                {project.last_scan_at
                  ? ` · último scan ${formatRelativeTime(project.last_scan_at)}`
                  : ' · nenhum scan ainda'}
              </p>

              <div className="project-card-footer">
                <span className="plain-link">Abrir projeto →</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <button className="link-btn" onClick={() => setEditingProject(project)}>Editar</button>{' '}
                  <button className="danger-btn" onClick={() => setDeletingProject(project)}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <ProjectFormModal onClose={() => setShowCreateModal(false)} onSave={createProject} />
      )}

      {editingProject && (
        <ProjectFormModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={(payload) => updateProject(editingProject.id, payload)}
        />
      )}

      {deletingProject && (
        <DeleteProjectModal
          project={deletingProject}
          onClose={() => setDeletingProject(null)}
          onConfirm={() => deleteProject(deletingProject.id)}
        />
      )}
    </div>
  );
}
