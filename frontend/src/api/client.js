const BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail ? JSON.stringify(body.detail) : detail;
    } catch {
      // resposta sem corpo JSON, mantém statusText
    }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  listDomains: () => request('/domains'),
  createDomain: (payload) => request('/domains', { method: 'POST', body: JSON.stringify(payload) }),
  bulkCreateDomains: (text) => request('/domains/bulk', { method: 'POST', body: JSON.stringify({ text }) }),
  bulkCreateDomainItems: (items) => request('/domains/bulk-items', { method: 'POST', body: JSON.stringify({ items }) }),
  updateDomain: (id, payload) => request(`/domains/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDomain: (id, hard = false) => request(`/domains/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' }),
  bulkDeleteDomains: (domainIds, hard = true) =>
    request('/domains/bulk-delete', { method: 'POST', body: JSON.stringify({ domain_ids: domainIds, hard }) }),

  listScanRuns: () => request('/scan-runs'),
  getScanRun: (id) => request(`/scan-runs/${id}`),

  xlsxReportUrl: (id) => `${BASE}/scan-runs/${id}/report.xlsx`,
  pdfReportUrl: (id) => `${BASE}/scan-runs/${id}/report.pdf`,
};
