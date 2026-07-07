import { useMemo, useState } from 'react';
import { api } from '../api/client';
import StatusBadge from './StatusBadge';
import AkamaiBadge from './AkamaiBadge';
import Pagination from './Pagination';

const PAGE_SIZE = 100;

export default function ScanRunDetail({ run }) {
  const { summary, results } = run;
  const risky = useMemo(
    () => results.filter((r) => r.status !== 'OFFLINE' && !r.akamai_protected),
    [results]
  );

  const [riskPage, setRiskPage] = useState(1);
  const riskTotalPages = Math.max(1, Math.ceil(risky.length / PAGE_SIZE));
  const riskPageItems = risky.slice((riskPage - 1) * PAGE_SIZE, riskPage * PAGE_SIZE);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return results;
    return results.filter((r) => r.hostname.toLowerCase().includes(term));
  }, [results, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Scan run #{run.id}</h2>
          <p className="muted">{new Date(run.started_at).toLocaleString('pt-BR')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a className="export-btn" href={api.xlsxReportUrl(run.id)}>Exportar XLSX</a>
          <a className="export-btn" href={api.pdfReportUrl(run.id)}>Exportar PDF</a>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="value">{summary.total}</div>
          <div className="label">Domínios analisados</div>
        </div>
        <div className="stat-card good">
          <div className="value">{summary.pct_online}%</div>
          <div className="label">Online</div>
        </div>
        <div className="stat-card good">
          <div className="value">{summary.protected} ({summary.pct_protected}%)</div>
          <div className="label">Protegidos por Akamai</div>
        </div>
        <div className="stat-card risk">
          <div className="value">{summary.unprotected_online}</div>
          <div className="label">Sem proteção e online (risco)</div>
        </div>
      </div>

      {risky.length > 0 && (
        <>
          <h3 style={{ marginBottom: '0.6rem' }}>Risco prioritário — online e sem proteção ({risky.length})</h3>
          <div className="table-container" style={{ marginBottom: '0.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>HTTP</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {riskPageItems.map((r) => (
                  <tr key={r.id}>
                    <td>{r.hostname}</td>
                    <td className="muted">{r.checked_url}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.http_status_code || '—'}</td>
                    <td className="muted">{r.resolved_ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={riskPage} totalPages={riskTotalPages} onChange={setRiskPage} />
        </>
      )}

      <h3 style={{ margin: '1.5rem 0 0.6rem' }}>Tabela completa ({filtered.length})</h3>
      <div className="field" style={{ maxWidth: 320, marginBottom: '0.8rem' }}>
        <input
          type="text"
          placeholder="Buscar por hostname..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Status</th>
              <th>HTTP / Erro</th>
              <th>Akamai</th>
              <th>Sinais</th>
              <th>IP</th>
              <th>Verificado em</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr key={r.id}>
                <td>{r.hostname}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.status === 'OFFLINE' ? r.error_message : r.http_status_code}</td>
                <td><AkamaiBadge protected={r.akamai_protected} /></td>
                <td className="muted">{r.akamai_signals.join(', ') || '—'}</td>
                <td className="muted">{r.resolved_ip || '—'}</td>
                <td className="muted">{new Date(r.checked_at).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
