import StatusBadge from './StatusBadge';
import AkamaiBadge from './AkamaiBadge';
import ExposureBadge from './ExposureBadge';

export default function ScanProgress({ results, completedCount, counts, total, isRunning }) {
  const isCapped = completedCount > results.length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Resultados <span className="muted">({completedCount}/{total})</span></h2>
          <div className="stats" style={{ marginTop: '0.5rem' }}>
            <span className="stat online"><span className="dot"></span> {counts.ONLINE}</span>
            <span className="stat warning"><span className="dot"></span> {counts.WARNING}</span>
            <span className="stat offline"><span className="dot"></span> {counts.OFFLINE}</span>
            <span className="stat protected"><span className="dot"></span> {counts.PROTECTED} protegidos</span>
            <span className="stat unprotected"><span className="dot"></span> {counts.UNPROTECTED} sem proteção</span>
          </div>
          {counts.EXTERNAL_UNPROTECTED > 0 && (
            <p className="muted" style={{ marginTop: '0.4rem', color: 'var(--status-offline)' }}>
              ⚠ {counts.EXTERNAL_UNPROTECTED} externo(s) e sem proteção — risco real
            </p>
          )}
        </div>
        {isRunning && <span className="muted">Escaneando...</span>}
      </div>

      {isCapped && (
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Mostrando os últimos {results.length} resultados. Os contadores acima refletem o total real —
          a lista completa fica disponível no relatório ao final do scan.
        </p>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Status</th>
              <th>Código HTTP / Erro</th>
              <th>Akamai</th>
              <th>Exposição</th>
              <th>IP</th>
              <th>Tempo (ms)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td className="cell-mono">{r.hostname}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="cell-muted">{r.status === 'OFFLINE' ? r.error_message : r.http_status_code}</td>
                <td><AkamaiBadge protected={r.akamai_protected} /></td>
                <td><ExposureBadge isInternal={r.is_internal} /></td>
                <td className="cell-muted">{r.resolved_ip || '—'}</td>
                <td className="cell-muted">{r.response_time_ms ? Math.round(r.response_time_ms) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
