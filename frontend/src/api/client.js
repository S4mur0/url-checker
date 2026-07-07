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
  listProjects: () => request('/projects'),
  createProject: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  listDomains: (projectId) => request(`/projects/${projectId}/domains`),
  createDomain: (projectId, payload) =>
    request(`/projects/${projectId}/domains`, { method: 'POST', body: JSON.stringify(payload) }),
  bulkCreateDomains: (projectId, text) =>
    request(`/projects/${projectId}/domains/bulk`, { method: 'POST', body: JSON.stringify({ text }) }),
  bulkCreateDomainItems: (projectId, items) =>
    request(`/projects/${projectId}/domains/bulk-items`, { method: 'POST', body: JSON.stringify({ items }) }),
  updateDomain: (projectId, id, payload) =>
    request(`/projects/${projectId}/domains/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDomain: (projectId, id, hard = false) =>
    request(`/projects/${projectId}/domains/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' }),
  bulkDeleteDomains: (projectId, domainIds, hard = true) =>
    request(`/projects/${projectId}/domains/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ domain_ids: domainIds, hard }),
    }),

  listScanRuns: (projectId) => request(`/projects/${projectId}/scan-runs`),
  getScanRun: (projectId, id) => request(`/projects/${projectId}/scan-runs/${id}`),

  xlsxReportUrl: (projectId, id) => `${BASE}/projects/${projectId}/scan-runs/${id}/report.xlsx`,
  pdfReportUrl: (projectId, id) => `${BASE}/projects/${projectId}/scan-runs/${id}/report.pdf`,
};
