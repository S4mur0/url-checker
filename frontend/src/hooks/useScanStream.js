import { useState, useCallback } from 'react';

const INITIAL_COUNTS = {
  ONLINE: 0,
  WARNING: 0,
  OFFLINE: 0,
  PROTECTED: 0,
  UNPROTECTED: 0,
  EXTERNAL_UNPROTECTED: 0,
  S3_PUBLIC: 0,
};
const LIVE_TABLE_LIMIT = 200;

export function useScanStream() {
  const [results, setResults] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [counts, setCounts] = useState(INITIAL_COUNTS);
  const [runId, setRunId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const startScan = useCallback(async (projectId, domainIds, options = {}) => {
    setResults([]);
    setCompletedCount(0);
    setCounts(INITIAL_COUNTS);
    setRunId(null);
    setError(null);
    setIsRunning(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/scan-runs/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_ids: domainIds ?? null,
          concurrency: options.concurrency ?? 30,
          include_tls: options.includeTls ?? true,
          check_s3: options.checkS3 ?? true,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || 'Falha ao iniciar o scan');
      }

      setRunId(response.headers.get('X-Scan-Run-Id'));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const payload = JSON.parse(part.slice(6));
          if (payload.run_id !== undefined && Object.keys(payload).length === 1) continue; // evento "done"

          setCompletedCount((prev) => prev + 1);
          // Mantém só os últimos N resultados na tabela ao vivo — em scans com
          // milhares de domínios, manter todos no DOM trava o navegador. O total
          // real fica sempre correto no scan run persistido (ver Relatórios).
          setResults((prev) => [payload, ...prev].slice(0, LIVE_TABLE_LIMIT));
          const isExternalUnprotected =
            (payload.status === 'ONLINE' || payload.status === 'WARNING') &&
            !payload.akamai_protected &&
            payload.is_internal === false;

          setCounts((prev) => ({
            ...prev,
            [payload.status]: prev[payload.status] + 1,
            PROTECTED: prev.PROTECTED + (payload.akamai_protected ? 1 : 0),
            UNPROTECTED: prev.UNPROTECTED + (payload.akamai_protected ? 0 : 1),
            EXTERNAL_UNPROTECTED: prev.EXTERNAL_UNPROTECTED + (isExternalUnprotected ? 1 : 0),
            S3_PUBLIC: prev.S3_PUBLIC + (payload.s3_status === 'public' ? 1 : 0),
          }));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { results, completedCount, counts, runId, isRunning, error, startScan };
}
