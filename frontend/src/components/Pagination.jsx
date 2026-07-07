export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
      <button className="secondary-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Anterior</button>
      <span className="muted">Página {page} de {totalPages}</span>
      <button className="secondary-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Próxima →</button>
    </div>
  );
}
