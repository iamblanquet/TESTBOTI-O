// Almacenamiento local persistente para AGROK Offline-First

const STORAGE_KEYS = {
  OBRAS: 'agrok_offline_obras_cache',
  PREDIOS: 'agrok_offline_predios_cache',
  PROYECTOS_ESTRUCTURA: 'agrok_offline_proyectos_estructura',
  REPORTS_QUEUE: 'agrok_offline_reports_queue',
  OPERATOR_NAME: 'agrok_offline_operator_name',
  LAST_SYNC: 'agrok_offline_last_sync_time',
  FORCE_OFFLINE_SIM: 'agrok_force_offline_simulation'
};

export function generateUUID() {
  return 'rep-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

export function formatLocalTimestamp(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatYMD(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 1. OBRAS, PREDIOS Y ESTRUCTURA DE PROYECTOS / HITOS / TAREAS
export function saveObrasLocally(obras, predios = [], estructura = []) {
  try {
    localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(obras));
    if (predios.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PREDIOS, JSON.stringify(predios));
    }
    if (estructura.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PROYECTOS_ESTRUCTURA, JSON.stringify(estructura));
    }
    return true;
  } catch (e) {
    console.error('Error guardando cache local:', e);
    return false;
  }
}

export function getLocalObras() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OBRAS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function getLocalPredios() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PREDIOS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function getLocalProyectosEstructura() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROYECTOS_ESTRUCTURA);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveProyectosEstructuraLocally(estructura) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROYECTOS_ESTRUCTURA, JSON.stringify(estructura));
  } catch (e) {}
}

// 2. COLA DE REPORTES OFFLINE AGROK (Con Proyecto, Hito y Tarea)
export function queueAgrokOfflineReport({
  proyecto_id,
  proyecto_nombre,
  hito_id,
  hito_nombre,
  tarea_id,
  tarea_nombre,
  obra_id,
  obra_nombre,
  fecha_operativa,
  autor_nombre,
  es_sin_actividad = false,
  motivo_sin_actividad = null,
  cuadrilla = [],
  avances = [],
  notas = '',
  texto_original = ''
}) {
  const currentQueue = getOfflineReportsQueue();
  const now = new Date();
  
  const newReport = {
    client_uuid: generateUUID(),
    proyecto_id: proyecto_id || 'PRJ-MAIZ-2026',
    proyecto_nombre: proyecto_nombre || 'Proyecto Maíz 2026',
    hito_id: hito_id || null,
    hito_nombre: hito_nombre || '',
    tarea_id: tarea_id || null,
    tarea_nombre: tarea_nombre || '',
    obra_id: obra_id || 'guayeme',
    obra_nombre: obra_nombre || 'Obra AGROK',
    fecha_operativa: fecha_operativa || formatYMD(now),
    autor_nombre: autor_nombre.trim(),
    es_sin_actividad: !!es_sin_actividad,
    motivo_sin_actividad: motivo_sin_actividad || null,
    cuadrilla: cuadrilla || [],
    avances: avances || [],
    notas: notas ? notas.trim() : '',
    texto_original: texto_original || '',
    offline_created_at: formatLocalTimestamp(now),
    offline_created_iso: now.toISOString(),
    status: 'PENDING_SYNC',
    synced_at: null
  };

  const updatedQueue = [newReport, ...currentQueue];
  localStorage.setItem(STORAGE_KEYS.REPORTS_QUEUE, JSON.stringify(updatedQueue));
  saveOperatorName(autor_nombre);

  return newReport;
}

export function getOfflineReportsQueue() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPORTS_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function getPendingReports() {
  const queue = getOfflineReportsQueue();
  return queue.filter(r => r.status === 'PENDING_SYNC' || r.status === 'ERROR');
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

// 3. PERFIL OPERADOR
export function saveOperatorName(name) {
  if (name) localStorage.setItem(STORAGE_KEYS.OPERATOR_NAME, name.trim());
}

export function getOperatorName() {
  return localStorage.getItem(STORAGE_KEYS.OPERATOR_NAME) || 'Operador AGROK';
}

// 4. SIMULACIÓN OFFLINE
export function getOfflineSimulationMode() {
  return localStorage.getItem(STORAGE_KEYS.FORCE_OFFLINE_SIM) === 'true';
}

export function setOfflineSimulationMode(enabled) {
  localStorage.setItem(STORAGE_KEYS.FORCE_OFFLINE_SIM, enabled ? 'true' : 'false');
}
