import { Link } from 'react-router-dom';

export default function ScanRunList({ runs }) {
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
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>#{run.id}</td>
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
              <td className="muted">{run.status === 'completed' ? 'Concluído' : 'Em execução'}</td>
              <td>
                <Link className="link-btn" to={`/reports/${run.id}`}>Ver relatório</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
