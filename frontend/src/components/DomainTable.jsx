import { useState } from 'react';

export default function DomainTable({ domains, selected, onToggleSelect, onUpdate, onDelete, onHardDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(domain) {
    setEditingId(domain.id);
    setEditValue(domain.notes || '');
  }

  async function saveEdit(domain) {
    await onUpdate(domain.id, { notes: editValue.trim() || null });
    setEditingId(null);
  }

  function handleHardDelete(domain) {
    if (window.confirm(`Excluir "${domain.hostname}" permanentemente? Isso também apaga o histórico de scans desse domínio.`)) {
      onHardDelete(domain.id);
    }
  }

  if (domains.length === 0) {
    return <p className="empty-state">Nenhum domínio encontrado.</p>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th>Hostname</th>
            <th>Notas</th>
            <th>Status</th>
            <th>Cadastrado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((domain) => (
            <tr key={domain.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(domain.id)}
                  onChange={() => onToggleSelect(domain.id)}
                />
              </td>
              <td className="cell-mono">{domain.hostname}</td>
              <td>
                {editingId === domain.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                ) : (
                  domain.notes || <span className="muted">—</span>
                )}
              </td>
              <td>
                <span className={`badge ${domain.active ? 'protected' : 'unprotected'}`}>
                  {domain.active ? 'ATIVO' : 'INATIVO'}
                </span>
              </td>
              <td className="muted">{new Date(domain.created_at).toLocaleDateString('pt-BR')}</td>
              <td>
                {editingId === domain.id ? (
                  <>
                    <button className="link-btn" onClick={() => saveEdit(domain)}>Salvar</button>{' '}
                    <button className="link-btn" onClick={() => setEditingId(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button className="link-btn" onClick={() => startEdit(domain)}>Editar</button>{' '}
                    {domain.active ? (
                      <button className="link-btn" onClick={() => onDelete(domain.id)}>Desativar</button>
                    ) : (
                      <button className="link-btn" onClick={() => onUpdate(domain.id, { active: true })}>
                        Reativar
                      </button>
                    )}{' '}
                    <button className="danger-btn" onClick={() => handleHardDelete(domain)}>Excluir</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
