import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useScanStream } from '../hooks/useScanStream';
import ScanProgress from '../components/ScanProgress';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 100;

export default function ScanPage() {
  const [domains, setDomains] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [concurrency, setConcurrency] = useState(30);
  const [includeTls, setIncludeTls] = useState(true);

  const { results, completedCount, counts, runId, isRunning, error, startScan } = useScanStream();

  useEffect(() => {
    api.listDomains().then((data) => {
      const active = data.filter((d) => d.active);
      setDomains(active);
      setSelected(new Set(active.map((d) => d.id)));
      setLoading(false);
    });
  }, []);

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

  function toggle(id) {
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

  const hasResults = results.length > 0 || runId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel">
        <div className="section-header">
          <h2>Selecionar domínios para escanear</h2>
          <span className="muted">{selected.size} selecionado(s) de {domains.length} ativo(s)</span>
        </div>

        {loading ? (
          <p className="muted">Carregando domínios...</p>
        ) : domains.length === 0 ? (
          <p className="empty-state">
            Nenhum domínio ativo cadastrado. Vá em <Link className="plain-link" to="/domains">Domínios</Link> para adicionar.
          </p>
        ) : (
          <>
            <div className="inline-form" style={{ marginBottom: '0.8rem' }}>
              <div className="field">
                <input
                  type="text"
                  placeholder="Buscar por hostname ou nota..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <button className="secondary-btn" onClick={selectAllFiltered}>
                Selecionar {search ? 'filtrados' : 'todos'} ({filtered.length})
              </button>
              <button className="secondary-btn" onClick={clearSelection}>Limpar seleção</button>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {pageItems.map((d) => (
                <label className="checkbox-row" key={d.id}>
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                  {d.hostname}
                  {d.notes && <span className="muted"> — {d.notes}</span>}
                </label>
              ))}
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </>
        )}

        <button
          className="link-btn"
          style={{ marginTop: '1rem', display: 'block' }}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? '▾' : '▸'} Opções avançadas (concorrência, TLS)
        </button>

        {showAdvanced && (
          <div className="inline-form" style={{ marginTop: '0.8rem' }}>
            <div className="field" style={{ maxWidth: 160 }}>
              <label htmlFor="concurrency">Concorrência (1-150)</label>
              <input
                id="concurrency"
                type="text"
                inputMode="numeric"
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value.replace(/\D/g, '')) || 1)}
              />
            </div>
            <label className="checkbox-row" style={{ paddingTop: '1.4rem' }}>
              <input type="checkbox" checked={includeTls} onChange={(e) => setIncludeTls(e.target.checked)} />
              Verificar certificado TLS (mais lento em scans grandes)
            </label>
          </div>
        )}

        <button
          className="primary-btn"
          style={{ marginTop: '1rem' }}
          disabled={isRunning || selected.size === 0}
          onClick={() => startScan([...selected], { concurrency, includeTls })}
        >
          {isRunning ? 'Escaneando...' : `Iniciar Scan (${selected.size} domínio${selected.size === 1 ? '' : 's'})`}
        </button>

        {error && <p style={{ color: 'var(--status-offline)', marginTop: '1rem' }}>{error}</p>}
      </div>

      {hasResults && (
        <div className="glass-panel">
          <ScanProgress
            results={results}
            completedCount={completedCount}
            counts={counts}
            total={selected.size}
            isRunning={isRunning}
          />

          {!isRunning && runId && (
            <div className="section-header" style={{ marginTop: '1.5rem' }}>
              <Link className="secondary-btn" to={`/reports/${runId}`}>Ver Relatório Detalhado</Link>
              <div className="export-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                <a className="export-btn" href={api.xlsxReportUrl(runId)}>Exportar XLSX</a>
                <a className="export-btn" href={api.pdfReportUrl(runId)}>Exportar PDF</a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
