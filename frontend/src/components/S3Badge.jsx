const LABELS = {
  public: 'S3 PÚBLICO',
  private: 'S3 privado',
  not_found: 'Sem bucket',
  unknown: 'S3 indeterminado',
};

const SOURCE_LABELS = {
  cname_direct: 'confirmado via CNAME',
  cname_cdn: 'atrás de CDN/WAF, não confirmado',
  guess: 'mesmo nome do domínio, não confirmado',
};

export default function S3Badge({ status, source }) {
  if (!status) return <span className="muted">—</span>;
  const cls = status === 'public' ? 'unprotected' : status === 'private' ? 'protected' : 'exposure-unknown';
  const title = source ? SOURCE_LABELS[source] || source : undefined;
  return (
    <span className={`badge ${cls}`} title={title}>
      {LABELS[status] || status}
    </span>
  );
}
