import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import ProjectAvatar from './ProjectAvatar';
import ProjectFormModal from './ProjectFormModal';

export default function ProjectSwitcher() {
  const { projects, loading, activeProject, activeProjectId, createProject } = useProjects();
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function goToProject(id) {
    setOpen(false);
    navigate(`/p/${id}/domains`);
  }

  async function handleCreate(payload) {
    const project = await createProject(payload);
    setOpen(false);
    navigate(`/p/${project.id}/domains`);
  }

  if (loading) {
    return <div className="project-switcher"><span className="muted">Carregando projetos...</span></div>;
  }

  if (projects.length === 0) {
    return (
      <>
        <button className="project-switcher-trigger" onClick={() => setShowCreateModal(true)}>
          + Novo projeto
        </button>
        {showCreateModal && (
          <ProjectFormModal onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
        )}
      </>
    );
  }

  return (
    <div className="project-switcher" ref={wrapperRef}>
      <button
        className="project-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {activeProject ? (
          <>
            <ProjectAvatar project={activeProject} size={28} />
            <span className="project-switcher-name">{activeProject.name}</span>
          </>
        ) : (
          <span className="muted">Selecionar projeto</span>
        )}
        <span className="project-switcher-caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="project-switcher-menu" role="menu">
          <div className="project-switcher-label">Projetos</div>
          <div className="project-switcher-list">
            {projects.map((p) => (
              <button
                key={p.id}
                role="menuitem"
                className={`project-switcher-item ${p.id === activeProjectId ? 'active' : ''}`}
                onClick={() => p.id !== activeProjectId && goToProject(p.id)}
                disabled={p.id === activeProjectId}
              >
                <ProjectAvatar project={p} size={24} />
                <span className="project-switcher-item-name">{p.name}</span>
                {p.id === activeProjectId ? (
                  <span className="project-switcher-check">✓</span>
                ) : (
                  <span className="muted project-switcher-count">{p.domain_count} domínios</span>
                )}
              </button>
            ))}
          </div>
          <div className="project-switcher-divider" />
          <button
            role="menuitem"
            className="project-switcher-action"
            onClick={() => {
              setOpen(false);
              setShowCreateModal(true);
            }}
          >
            + Novo projeto
          </button>
          <button
            role="menuitem"
            className="project-switcher-action"
            onClick={() => {
              setOpen(false);
              navigate('/projects');
            }}
          >
            Gerenciar projetos
          </button>
        </div>
      )}

      {showCreateModal && (
        <ProjectFormModal onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
      )}
    </div>
  );
}
