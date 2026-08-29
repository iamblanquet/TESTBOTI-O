// Almacenamiento local persistente para funcionamiento Offline-First

const STORAGE_KEYS = {
  PROJECTS: 'offline_projects_cache',
  REPORTS_QUEUE: 'offline_reports_queue',
  OPERATOR_NAME: 'offline_operator_name',
  LAST_SYNC: 'offline_last_sync_time',
  FORCE_OFFLINE_SIM: 'force_offline_simulation'
};

// Generador de UUID único para reportes offline
export function generateUUID() {
  return 'rep-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

// Formatear fecha y hora local legible
export function formatLocalTimestamp(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 1. GESTIÓN DE PROYECTOS LOCALES
export function saveProjectsLocally(projects) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    return true;
  } catch (e) {
    console.error('Error guardando proyectos locales:', e);
    return false;
  }
}

export function getLocalProjects() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error leyendo proyectos locales:', e);
    return [];
  }
}

// 2. GESTIÓN DE LA COLA OFFLINE DE REPORTES
export function queueOfflineReport({ projectId, projectName, taskId, taskName, operatorName, advancePercent, notes }) {
  const currentQueue = getOfflineReportsQueue();
  const now = new Date();
  
  const newReport = {
    client_uuid: generateUUID(),
    project_id: Number(projectId),
    project_name: projectName || 'Proyecto',
    task_id: taskId ? Number(taskId) : null,
    task_name: taskName || 'General',
    operator_name: operatorName.trim(),
    advance_percent: Number(advancePercent),
    notes: notes ? notes.trim() : '',
    offline_created_at: formatLocalTimestamp(now), // Timestamp inmutable de captura en campo
    offline_created_iso: now.toISOString(),
    status: 'PENDING_SYNC', // 'PENDING_SYNC', 'SYNCING', 'SYNCED', 'ERROR'
    synced_at: null
  };

  const updatedQueue = [newReport, ...currentQueue];
  localStorage.setItem(STORAGE_KEYS.REPORTS_QUEUE, JSON.stringify(updatedQueue));
  
  // Guardar también el nombre del operador para futuras sesiones
  saveOperatorName(operatorName);

  return newReport;
}

export function getOfflineReportsQueue() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPORTS_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error leyendo cola de reportes:', e);
    return [];
  }
}

export function getPendingReports() {
  const queue = getOfflineReportsQueue();
  return queue.filter(r => r.status === 'PENDING_SYNC' || r.status === 'ERROR');
}

export function updateReportStatusInQueue(clientUuid, status, syncedAt = null) {
  const queue = getOfflineReportsQueue();
  const updated = queue.map(r => {
    if (r.client_uuid === clientUuid) {
      return {
        ...r,
        status,
        synced_at: syncedAt || formatLocalTimestamp(new Date())
      };
    }
    return r;
  });
  localStorage.setItem(STORAGE_KEYS.REPORTS_QUEUE, JSON.stringify(updated));
}

export function markAllAsSynced(syncedList) {
  const queue = getOfflineReportsQueue();
  const syncedMap = new Map();
  syncedList.forEach(s => syncedMap.set(s.client_uuid, s.synced_at));

  const updated = queue.map(r => {
    if (syncedMap.has(r.client_uuid)) {
      return {
        ...r,
        status: 'SYNCED',
        synced_at: formatLocalTimestamp(new Date(syncedMap.get(r.client_uuid)))
      };
    }
    return r;
  });

  localStorage.setItem(STORAGE_KEYS.REPORTS_QUEUE, JSON.stringify(updated));
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

export function clearSyncedReportsFromQueue() {
  const queue = getOfflineReportsQueue();
  const pendingOnly = queue.filter(r => r.status !== 'SYNCED');
  localStorage.setItem(STORAGE_KEYS.REPORTS_QUEUE, JSON.stringify(pendingOnly));
}

export function deleteReportFromQueue(clientUuid) {
  const queue = getOfflineReportsQueue();
  const filtered = queue.filter(r => r.client_uuid !== clientUuid);
  localStorage.setItem(STORAGE_KEYS.REPORTS_QUEUE, JSON.stringify(filtered));
}

// 3. PERFIL DEL OPERADOR
export function saveOperatorName(name) {
  if (name) localStorage.setItem(STORAGE_KEYS.OPERATOR_NAME, name.trim());
}

export function getOperatorName() {
  return localStorage.getItem(STORAGE_KEYS.OPERATOR_NAME) || 'Operador de Campo';
}

// 4. MODO OFFLINE SIMULADO (Para pruebas manuales en entorno con internet)
export function getOfflineSimulationMode() {
  return localStorage.getItem(STORAGE_KEYS.FORCE_OFFLINE_SIM) === 'true';
}

export function setOfflineSimulationMode(enabled) {
  localStorage.setItem(STORAGE_KEYS.FORCE_OFFLINE_SIM, enabled ? 'true' : 'false');
}
