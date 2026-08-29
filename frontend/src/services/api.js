import { saveObrasLocally, getLocalObras, getLocalPredios, saveProyectosEstructuraLocally, getLocalProyectosEstructura } from './storage';

const API_BASE = '/api';

export async function fetchObrasOnline() {
  try {
    const res = await fetch(`${API_BASE}/obras`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && data.obras) {
      saveObrasLocally(data.obras, data.predios);
      return {
        success: true,
        obras: data.obras,
        predios: data.predios,
        proyectos: data.proyectos || [],
        hitos: data.hitos || [],
        tareas: data.tareas || [],
        fromCache: false
      };
    }
    throw new Error(data.error || 'Error al obtener obras');
  } catch (err) {
    console.warn('Usando catálogo local offline de AGROK:', err.message);
    const cachedObras = getLocalObras();
    const cachedPredios = getLocalPredios();
    return {
      success: cachedObras.length > 0,
      obras: cachedObras,
      predios: cachedPredios,
      proyectos: [],
      hitos: [],
      tareas: [],
      fromCache: true,
      error: err.message
    };
  }
}

export async function fetchProyectosEstructura() {
  try {
    const res = await fetch(`${API_BASE}/proyectos/estructura`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && data.proyectos) {
      saveProyectosEstructuraLocally(data.proyectos);
      return { success: true, proyectos: data.proyectos, hitosRaw: data.hitosRaw, tareasRaw: data.tareasRaw };
    }
    throw new Error(data.error || 'Error al obtener proyectos');
  } catch (err) {
    console.warn('Cargando proyectos desde caché local offline:', err.message);
    const cached = getLocalProyectosEstructura();
    return { success: cached.length > 0, proyectos: cached, fromCache: true };
  }
}

export async function createHitoApi(data) {
  const res = await fetch(`${API_BASE}/hitos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Error al crear hito');
  }
  return await res.json();
}

export async function createTareaApi(data) {
  const res = await fetch(`${API_BASE}/tareas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Error al crear tarea');
  }
  return await res.json();
}

export async function updateTareaApi(id, data) {
  const res = await fetch(`${API_BASE}/tareas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Error al actualizar tarea');
  }
  return await res.json();
}

export async function fetchTableroHoy() {
  const res = await fetch(`${API_BASE}/tablero/hoy`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function syncAgrokReportsBatch(reportsList) {
  if (!reportsList || reportsList.length === 0) return { success: true, count: 0 };

  const res = await fetch(`${API_BASE}/reports/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reports: reportsList })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en servidor (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export async function createIncidenciaApi(data) {
  const res = await fetch(`${API_BASE}/incidencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Error al crear incidencia');
  }
  return await res.json();
}

export async function updateIncidenciaEstadoApi(folio, data) {
  const res = await fetch(`${API_BASE}/incidencias/${folio}/estado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Error al actualizar incidencia');
  }
  return await res.json();
}

export async function saveHorometroApi(data) {
  const res = await fetch(`${API_BASE}/lecturas/maquina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Error al guardar lectura de horómetro');
  }
  return await res.json();
}

export async function testParserApi(text, obraId) {
  const res = await fetch(`${API_BASE}/parser/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, obra_id: obraId })
  });
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
  if (!res.ok || !data.success) throw new Error(data.error || 'Error al actualizar token');
  return data;
}
