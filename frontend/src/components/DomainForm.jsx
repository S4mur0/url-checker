import { useState } from 'react';

export default function DomainForm({ onCreate }) {
  const [hostname, setHostname] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!hostname.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ hostname: hostname.trim(), notes: notes.trim() || null });
      setHostname('');
      setNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="hostname">Domínio</label>
        <input
          id="hostname"
          type="text"
          placeholder="exemplo.com.br"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="notes">Notas (opcional)</label>
        <input
          id="notes"
          type="text"
          placeholder="ex: e-commerce principal"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button className="primary-btn" type="submit" disabled={submitting || !hostname.trim()}>
        {submitting ? 'Adicionando...' : 'Adicionar'}
      </button>
      {error && <p style={{ color: 'var(--status-offline)', width: '100%' }}>{error}</p>}
    </form>
  );
}
