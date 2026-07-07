import { useState } from 'react';
import { PROJECT_COLOR_PALETTE } from '../utils/projectColors';

export default function ProjectFormModal({ project, onClose, onSave }) {
  const isEditing = Boolean(project);
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [color, setColor] = useState(project?.color || PROJECT_COLOR_PALETTE[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim() || null, color });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Editar projeto' : 'Novo projeto'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="project-name">Nome</label>
            <input
              id="project-name"
              type="text"
              placeholder="ex: Cliente Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="project-description">Descrição (opcional)</label>
            <input
              id="project-description"
              type="text"
              placeholder="ex: Auditoria WAF do engajamento Q1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Cor</label>
            <div className="color-swatch-grid">
              {PROJECT_COLOR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`color-swatch ${color === hex ? 'selected' : ''}`}
                  style={{ background: hex }}
                  onClick={() => setColor(hex)}
                  aria-label={hex}
                />
              ))}
            </div>
          </div>

          {error && <p style={{ color: 'var(--status-offline)' }}>{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-btn" disabled={submitting || !name.trim()}>
              {submitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
