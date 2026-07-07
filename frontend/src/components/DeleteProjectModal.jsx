import { useState } from 'react';

export default function DeleteProjectModal({ project, onClose, onConfirm }) {
  const [typedName, setTypedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canDelete = typedName.trim() === project.name;

  async function handleConfirm() {
    if (!canDelete) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Excluir projeto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p>
          Isso apaga permanentemente <strong>{project.name}</strong>, incluindo{' '}
          <strong>{project.domain_count} domínio(s)</strong> e todo o histórico de scans. Essa ação
          não pode ser desfeita.
        </p>

        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="confirm-name">
            Digite <strong>{project.name}</strong> para confirmar
          </label>
          <input
            id="confirm-name"
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            autoFocus
          />
        </div>

        {error && <p style={{ color: 'var(--status-offline)' }}>{error}</p>}

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>Cancelar</button>
          <button className="danger-btn" disabled={!canDelete || submitting} onClick={handleConfirm}>
            {submitting ? 'Excluindo...' : 'Excluir permanentemente'}
          </button>
        </div>
      </div>
    </div>
  );
}
