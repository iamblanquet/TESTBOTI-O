import { saveProjectsLocally, getLocalProjects } from './storage';

const API_BASE = '/api';

export async function fetchProjectsOnline() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success && data.projects) {
      saveProjectsLocally(data.projects);
      return { success: true, projects: data.projects, fromCache: false };
    }
    throw new Error(data.error || 'Respuesta inválida del servidor');
  } catch (err) {
    console.warn('Fallo al obtener proyectos online, usando caché local:', err.message);
    const cached = getLocalProjects();
    return { success: cached.length > 0, projects: cached, fromCache: true, error: err.message };
  }
}

export async function syncReportsBatch(reportsList) {
  if (!reportsList || reportsList.length === 0) {
    return { success: true, count: 0 };
  }

  const payload = {
    reports: reportsList.map(r => ({
      client_uuid: r.client_uuid,
      project_id: r.project_id,
      task_id: r.task_id,
      operator_name: r.operator_name,
      advance_percent: r.advance_percent,
      notes: r.notes,
      offline_created_at: r.offline_created_at
    }))
  };

  const res = await fetch(`${API_BASE}/reports/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en servidor (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export async function createProjectApi({ code, name, description, location, tasks }) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name, description, location, tasks })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return await res.json();
}

export async function fetchDashboardStatsApi() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function fetchBotStatusApi() {
  const res = await fetch(`${API_BASE}/bot/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function saveBotTokenApi(token) {
  const res = await fetch(`${API_BASE}/bot/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Error al actualizar token de Telegram');
  }

  return data;
}
