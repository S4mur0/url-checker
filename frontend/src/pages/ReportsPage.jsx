import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import ScanRunList from '../components/ScanRunList';
import ScanRunDetail from '../components/ScanRunDetail';

export default function ReportsPage({ projectId }) {
  const { runId } = useParams();

  if (runId) {
    return <ScanRunDetailLoader projectId={projectId} runId={runId} />;
  }

  return <ScanRunListLoader projectId={projectId} />;
}

function ScanRunListLoader({ projectId }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listScanRuns(projectId).then((data) => {
      setRuns(data);
      setLoading(false);
    });
  }, [projectId]);

  return (
    <div className="panel">
      <div className="section-header">
        <h2>Histórico de Scans</h2>
      </div>
      {loading ? <p className="muted">Carregando...</p> : <ScanRunList runs={runs} projectId={projectId} />}
    </div>
  );
}

function ScanRunDetailLoader({ projectId, runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRun(null);
    setError(null);
    api.getScanRun(projectId, runId).then(setRun).catch((err) => setError(err.message));
  }, [projectId, runId]);

  return (
    <div className="panel">
      <Link className="plain-link" to={`/p/${projectId}/reports`}>← Voltar ao histórico</Link>
      <div style={{ marginTop: '1rem' }}>
        {error && <p style={{ color: 'var(--status-offline)' }}>{error}</p>}
        {!error && !run && <p className="muted">Carregando...</p>}
        {run && <ScanRunDetail run={run} projectId={projectId} />}
      </div>
    </div>
  );
}
