import { Link } from 'react-router-dom';

export default function ScanRunList({ runs, projectId }) {
  if (runs.length === 0) {
    return <p className="empty-state">Nenhum scan executado ainda. Vá em Scan para rodar o primeiro.</p>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Data</th>
            <th>Domínios</th>
            <th>Online</th>
            <th>Protegidos</th>
            <th>Risco real (externo, sem proteção)</th>
            <th>S3 público</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td className="cell-mono">#{run.id}</td>
              <td className="muted">{new Date(run.started_at).toLocaleString('pt-BR')}</td>
              <td>{run.total_domains}</td>
              <td>{run.summary ? `${run.summary.pct_online}%` : '—'}</td>
              <td>{run.summary ? `${run.summary.protected} (${run.summary.pct_protected}%)` : '—'}</td>
              <td>
                {run.summary && run.summary.external_unprotected_online > 0 ? (
                  <span className="badge unprotected">{run.summary.external_unprotected_online}</span>
                ) : (
                  '0'
                )}
              </td>
              <td>
                {run.summary && run.summary.s3_public_count > 0 ? (
                  <span className="badge unprotected">{run.summary.s3_public_count}</span>
                ) : (
                  <span className="muted">{run.summary && run.summary.s3_checked_count > 0 ? '0' : '—'}</span>
                )}
              </td>
              <td className="muted">{run.status === 'completed' ? 'Concluído' : 'Em execução'}</td>
              <td>
                <Link className="link-btn" to={`/p/${projectId}/reports/${run.id}`}>Ver relatório</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
