import { useState } from 'react';
import { parseCsv, guessHostnameColumn, guessNotesColumn } from '../utils/csv';

const NONE = '__none__';

export default function BulkAddModal({ onClose, onBulkCreate, onBulkCreateItems, onDiscover }) {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');

  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [hostCol, setHostCol] = useState(0);
  const [notesCol, setNotesCol] = useState(NONE);

  const [rootDomain, setRootDomain] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoverData, setDiscoverData] = useState(null);
  const [discoverError, setDiscoverError] = useState(null);
  const [discoverSelected, setDiscoverSelected] = useState(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleDiscover() {
    const root = rootDomain.trim().toLowerCase();
    if (!root) return;
    setDiscovering(true);
    setDiscoverError(null);
    setDiscoverData(null);
    setResult(null);
    try {
      const data = await onDiscover(root);
      setDiscoverData(data);
      setDiscoverSelected(new Set(data.candidates.map((c) => c.hostname)));
    } catch (err) {
      setDiscoverError(err.message);
    } finally {
      setDiscovering(false);
    }
  }

  function toggleDiscoverCandidate(hostname) {
    setDiscoverSelected((prev) => {
      const next = new Set(prev);
      next.has(hostname) ? next.delete(hostname) : next.add(hostname);
      return next;
    });
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
  }

  async function handleCsvFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const raw = await file.text();
    const { headers, rows } = parseCsv(raw);
    setCsvHeaders(headers);
    setCsvRows(rows);
    setHostCol(guessHostnameColumn(headers));
    const guessedNotes = guessNotesColumn(headers);
    setNotesCol(guessedNotes === -1 ? NONE : guessedNotes);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'csv') {
        const items = csvRows
          .map((row) => ({
            hostname: (row[hostCol] || '').trim(),
            notes: notesCol !== NONE ? (row[notesCol] || '').trim() || null : null,
          }))
          .filter((item) => item.hostname);
        const res = await onBulkCreateItems(items);
        setResult(res);
      } else if (mode === 'discover') {
        const items = discoverData.candidates
          .filter((c) => discoverSelected.has(c.hostname))
          .map((c) => ({ hostname: c.hostname, notes: discoverData.root_domain }));
        const res = await onBulkCreateItems(items);
        setResult(res);
      } else {
        const res = await onBulkCreate(text);
        setResult(res);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    mode === 'csv'
      ? csvRows.length > 0
      : mode === 'discover'
      ? discoverSelected.size > 0
      : text.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar domínios em massa</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
            Colar Texto
          </button>
          <button className={`tab-btn ${mode === 'file' ? 'active' : ''}`} onClick={() => setMode('file')}>
            Upload (.txt)
          </button>
          <button className={`tab-btn ${mode === 'csv' ? 'active' : ''}`} onClick={() => setMode('csv')}>
            Importar CSV
          </button>
          <button className={`tab-btn ${mode === 'discover' ? 'active' : ''}`} onClick={() => setMode('discover')}>
            Descobrir Subdomínios
          </button>
        </div>

        {mode === 'text' && (
          <textarea
            placeholder="Cole seus domínios aqui, um por linha..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        {mode === 'file' && (
          <div className="file-drop-area">
            <span className="file-msg">{fileName || 'Arraste um arquivo .txt ou clique para selecionar'}</span>
            <input className="file-input" type="file" accept=".txt" onChange={handleFileChange} />
          </div>
        )}

        {mode === 'csv' && (
          <div>
            <div className="file-drop-area">
              <span className="file-msg">
                {fileName ? `${fileName} (${csvRows.length} linha(s))` : 'Selecione um arquivo .csv'}
              </span>
              <input className="file-input" type="file" accept=".csv" onChange={handleCsvFileChange} />
            </div>

            {csvHeaders.length > 0 && (
              <>
                <div className="inline-form" style={{ marginBottom: '1rem' }}>
                  <div className="field">
                    <label htmlFor="host-col">Coluna do subdomínio/hostname</label>
                    <select
                      id="host-col"
                      value={hostCol}
                      onChange={(e) => setHostCol(Number(e.target.value))}
                    >
                      {csvHeaders.map((h, idx) => (
                        <option key={idx} value={idx}>{h || `Coluna ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="notes-col">Coluna de notas (opcional, ex: domínio raiz)</label>
                    <select
                      id="notes-col"
                      value={notesCol}
                      onChange={(e) => setNotesCol(e.target.value === NONE ? NONE : Number(e.target.value))}
                    >
                      <option value={NONE}>— nenhuma —</option>
                      {csvHeaders.map((h, idx) => (
                        <option key={idx} value={idx}>{h || `Coluna ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="muted" style={{ marginBottom: '0.5rem' }}>Pré-visualização (5 primeiras linhas):</p>
                <div className="table-container" style={{ maxHeight: 200, marginBottom: '1rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Hostname</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td>{row[hostCol]}</td>
                          <td className="muted">{notesCol !== NONE ? row[notesCol] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'discover' && (
          <div>
            <p className="muted" style={{ marginBottom: '0.8rem' }}>
              Busca em logs públicos de Certificate Transparency (crt.sh) por subdomínios que já
              receberam certificado TLS — não é força bruta, só o que já é público. Pode levar até
              1 minuto.
            </p>
            <div className="inline-form" style={{ marginBottom: '1rem' }}>
              <div className="field" style={{ maxWidth: 320 }}>
                <input
                  type="text"
                  placeholder="ex: exemplo.com.br"
                  value={rootDomain}
                  onChange={(e) => setRootDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !discovering && handleDiscover()}
                />
              </div>
              <button className="secondary-btn" onClick={handleDiscover} disabled={discovering || !rootDomain.trim()}>
                {discovering ? 'Buscando... (até 1 min)' : 'Buscar'}
              </button>
            </div>

            {discoverError && <p style={{ color: 'var(--status-offline)' }}>{discoverError}</p>}

            {discoverData && discoverData.candidates.length === 0 && (
              <p className="empty-state">Nenhum subdomínio encontrado para {discoverData.root_domain}.</p>
            )}

            {discoverData && discoverData.candidates.length > 0 && (
              <>
                <div className="inline-form" style={{ marginBottom: '0.5rem' }}>
                  <span className="muted">
                    {discoverData.candidates.length} subdomínio(s) encontrado(s), {discoverSelected.size} selecionado(s)
                    {discoverData.truncated && ' (lista truncada no limite máximo)'}
                  </span>
                  <button
                    className="link-btn"
                    onClick={() => setDiscoverSelected(new Set(discoverData.candidates.map((c) => c.hostname)))}
                  >
                    Selecionar todos
                  </button>
                  <button className="link-btn" onClick={() => setDiscoverSelected(new Set())}>
                    Limpar seleção
                  </button>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {discoverData.candidates.map((c) => (
                    <label className="checkbox-row" key={c.hostname}>
                      <input
                        type="checkbox"
                        checked={discoverSelected.has(c.hostname)}
                        onChange={() => toggleDiscoverCandidate(c.hostname)}
                      />
                      <span className="cell-mono">{c.hostname}</span>
                      {c.already_tracked && <span className="muted"> — já cadastrado</span>}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {error && <p style={{ color: 'var(--status-offline)' }}>{error}</p>}

        {result && (
          <p className="bulk-result">
            {result.created.length} domínio(s) adicionado(s)
            {result.skipped.length > 0 && `, ${result.skipped.length} ignorado(s) (duplicado ou inválido)`}.
          </p>
        )}

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>Fechar</button>
          <button className="primary-btn" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting
              ? 'Adicionando...'
              : mode === 'csv'
              ? `Importar ${csvRows.length} linha(s)`
              : mode === 'discover'
              ? `Adicionar ${discoverSelected.size} selecionado(s)`
              : 'Adicionar domínios'}
          </button>
        </div>
      </div>
    </div>
  );
}
