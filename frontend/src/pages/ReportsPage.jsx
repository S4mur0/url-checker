import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import ScanRunList from '../components/ScanRunList';
import ScanRunDetail from '../components/ScanRunDetail';

export default function ReportsPage() {
  const { runId } = useParams();

  if (runId) {
    return <ScanRunDetailLoader runId={runId} />;
  }

  return <ScanRunListLoader />;
}

function ScanRunListLoader() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listScanRuns().then((data) => {
      setRuns(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="glass-panel">
      <div className="section-header">
        <h2>Histórico de Scans</h2>
      </div>
      {loading ? <p className="muted">Carregando...</p> : <ScanRunList runs={runs} />}
    </div>
  );
}

function ScanRunDetailLoader({ runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRun(null);
    setError(null);
    api.getScanRun(runId).then(setRun).catch((err) => setError(err.message));
  }, [runId]);

  return (
    <div className="glass-panel">
      <Link className="plain-link" to="/reports">← Voltar ao histórico</Link>
      <div style={{ marginTop: '1rem' }}>
        {error && <p style={{ color: 'var(--status-offline)' }}>{error}</p>}
        {!error && !run && <p className="muted">Carregando...</p>}
        {run && <ScanRunDetail run={run} />}
      </div>
    </div>
  );
}
