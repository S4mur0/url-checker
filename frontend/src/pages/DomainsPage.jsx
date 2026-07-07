import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import DomainForm from '../components/DomainForm';
import DomainTable from '../components/DomainTable';
import BulkAddModal from '../components/BulkAddModal';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 50;

export default function DomainsPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());

  async function loadDomains() {
    setLoading(true);
    try {
      const data = await api.listDomains();
      setDomains(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDomains();
  }, []);

  async function handleCreate(payload) {
    await api.createDomain(payload);
    await loadDomains();
  }

  async function handleBulkCreate(text) {
    const result = await api.bulkCreateDomains(text);
    await loadDomains();
    return result;
  }

  async function handleBulkCreateItems(items) {
    const result = await api.bulkCreateDomainItems(items);
    await loadDomains();
    return result;
  }

  async function handleUpdate(id, payload) {
    await api.updateDomain(id, payload);
    await loadDomains();
  }

  async function handleDelete(id) {
    await api.deleteDomain(id);
    await loadDomains();
  }

  async function handleHardDelete(id) {
    await api.deleteDomain(id, true);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await loadDomains();
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    const confirmed = window.confirm(
      `Excluir permanentemente ${selected.size} domínio(s) selecionado(s)? Isso também apaga o histórico de scans desses domínios.`
    );
    if (!confirmed) return;
    await api.bulkDeleteDomains([...selected], true);
    setSelected(new Set());
    await loadDomains();
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((d) => d.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const activeCount = domains.filter((d) => d.active).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return domains;
    return domains.filter(
      (d) => d.hostname.toLowerCase().includes(term) || (d.notes || '').toLowerCase().includes(term)
    );
  }, [domains, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="glass-panel">
      <div className="section-header">
        <div>
          <h2>Domínios</h2>
          <p className="muted">{activeCount} ativo(s) de {domains.length} cadastrado(s)</p>
        </div>
        <button className="secondary-btn" onClick={() => setShowBulkModal(true)}>
          Adicionar em massa
        </button>
      </div>

      <DomainForm onCreate={handleCreate} />

      {error && <p style={{ color: 'var(--status-offline)', marginTop: '1rem' }}>{error}</p>}

      <div className="inline-form" style={{ marginTop: '1.5rem' }}>
        <div className="field" style={{ maxWidth: 360 }}>
          <input
            type="text"
            placeholder="Buscar por hostname ou nota..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <button className="secondary-btn" onClick={selectAllFiltered} disabled={filtered.length === 0}>
          Selecionar {search ? 'filtrados' : 'todos'} ({filtered.length})
        </button>
        {selected.size > 0 && (
          <>
            <button className="secondary-btn" onClick={clearSelection}>Limpar seleção</button>
            <button className="danger-btn" onClick={handleBulkDelete}>
              Excluir {selected.size} selecionado(s)
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <p className="muted">Carregando...</p>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              {filtered.length} resultado(s){search && ` para "${search}"`}
            </p>
            <DomainTable
              domains={pageItems}
              selected={selected}
              onToggleSelect={toggleSelect}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onHardDelete={handleHardDelete}
            />
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>

      {showBulkModal && (
        <BulkAddModal
          onClose={() => setShowBulkModal(false)}
          onBulkCreate={handleBulkCreate}
          onBulkCreateItems={handleBulkCreateItems}
        />
      )}
    </div>
  );
}
