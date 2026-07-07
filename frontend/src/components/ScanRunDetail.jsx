import { useMemo, useState } from 'react';
import { api } from '../api/client';
import StatusBadge from './StatusBadge';
import AkamaiBadge from './AkamaiBadge';
import ExposureBadge from './ExposureBadge';
import Pagination from './Pagination';

const PAGE_SIZE = 100;
const EXPOSURE_ORDER = { false: 0, true: 1, null: 2 };

export default function ScanRunDetail({ run }) {
  const { summary, results } = run;
  const risky = useMemo(
    () =>
      results
        .filter((r) => r.status !== 'OFFLINE' && !r.akamai_protected)
        .sort((a, b) => EXPOSURE_ORDER[a.is_internal] - EXPOSURE_ORDER[b.is_internal]),
    [results]
  );

  const [riskPage, setRiskPage] = useState(1);
  const riskTotalPages = Math.max(1, Math.ceil(risky.length / PAGE_SIZE));
  const riskPageItems = risky.slice((riskPage - 1) * PAGE_SIZE, riskPage * PAGE_SIZE);

  const [search, setSearch] = useState('');
  const [exposureFilter, setExposureFilter] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return results.filter((r) => {
      if (term && !r.hostname.toLowerCase().includes(term)) return false;
      if (exposureFilter === 'external' && r.is_internal !== false) return false;
      if (exposureFilter === 'internal' && r.is_internal !== true) return false;
      if (exposureFilter === 'unknown' && r.is_internal !== null) return false;
      return true;
    });
  }, [results, search, exposureFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleExposureFilterChange(value) {
    setExposureFilter(value);
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
          <div className="value">{summary.protected} ({summary.pct_protected}%)</div>
          <div className="label">Protegidos por Akamai</div>
        </div>
        <div className="stat-card risk">
          <div className="value">{summary.external_unprotected_online}</div>
          <div className="label">Externo, online e sem proteção (risco real)</div>
        </div>
        <div className="stat-card">
          <div className="value">{summary.internal_unprotected_online}</div>
          <div className="label">Interno, sem proteção (risco baixo)</div>
        </div>
        <div className="stat-card">
          <div className="value">{summary.external_count} / {summary.internal_count}</div>
          <div className="label">Externos / Internos</div>
        </div>
      </div>

      {risky.length > 0 && (
        <>
          <h3 style={{ marginBottom: '0.6rem' }}>
            Risco prioritário — online e sem proteção ({risky.length}), externos primeiro
          </h3>
          <div className="table-container" style={{ marginBottom: '0.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Exposição</th>
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
                    <td><ExposureBadge isInternal={r.is_internal} /></td>
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
      <div className="inline-form" style={{ marginBottom: '0.8rem' }}>
        <div className="field" style={{ maxWidth: 320 }}>
          <input
            type="text"
            placeholder="Buscar por hostname..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="field" style={{ maxWidth: 200 }}>
          <select value={exposureFilter} onChange={(e) => handleExposureFilterChange(e.target.value)}>
            <option value="all">Todas as exposições</option>
            <option value="external">Só externos</option>
            <option value="internal">Só internos</option>
            <option value="unknown">Exposição desconhecida</option>
          </select>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Status</th>
              <th>HTTP / Erro</th>
              <th>Akamai</th>
              <th>Exposição</th>
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
                <td><ExposureBadge isInternal={r.is_internal} /></td>
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
