require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb, run, get, all } = require('./database');
const { initTelegramBot, getBotStatus, getBotInstance } = require('./telegramService');
const { parseDailyReport } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Tablero Hoy (Alimenta los 4 widgets canónicos según docs/3 — Backend y escritorio.md §5)
app.get('/api/tablero/hoy', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Widget 1: Obras sin reporte hoy
    const obrasOperacion = await all('SELECT * FROM obra WHERE estado = "operacion"');
    const reportesHoy = await all('SELECT obra_id, es_sin_actividad, motivo_sin_actividad FROM reporte WHERE fecha_operativa = ?', [today]);
    const reportedIds = new Set(reportesHoy.map(r => r.obra_id));

    const sinReporte = [];
    for (const o of obrasOperacion) {
      if (!reportedIds.has(o.id)) {
        // Calcular días desde último reporte
        const ultRep = await get('SELECT fecha_operativa FROM reporte WHERE obra_id = ? ORDER BY fecha_operativa DESC LIMIT 1', [o.id]);
        let dias = 1;
        if (ultRep && ultRep.fecha_operativa) {
          dias = Math.max(1, Math.floor((new Date(today) - new Date(ultRep.fecha_operativa)) / (1000 * 60 * 60 * 24)));
        }
        sinReporte.push({ ...o, dias_sin_reporte: dias });
      }
    }
    sinReporte.sort((a, b) => b.dias_sin_reporte - a.dias_sin_reporte);

    // Widget 2: Avance contra meta (por obra y predio)
    const obrasAvance = [];
    for (const o of obrasOperacion) {
      const predios = await all(`
        SELECT p.* FROM predio p 
        JOIN obra_predio op ON p.id = op.predio_id 
        WHERE op.obra_id = ?
      `, [o.id]);

      const prediosAvance = [];
      let obraTotalCampoHa = 0;

      for (const p of predios) {
        const campoHa = (await get(`
          SELECT COALESCE(SUM(l.cantidad_ha), 0) as total 
          FROM reporte_linea l 
          JOIN reporte r ON l.reporte_id = r.id 
          WHERE r.obra_id = ? AND l.predio_id = ?
        `, [o.id, p.id])).total;

        const ultMed = await get('SELECT * FROM medicion WHERE obra_id = ? AND predio_id = ? ORDER BY id DESC LIMIT 1', [o.id, p.id]);
        const oficialHa = ultMed ? ultMed.hectareas : campoHa;

        obraTotalCampoHa += campoHa;
        prediosAvance.push({
          predio_id: p.id,
          predio_nombre: p.nombre,
          superficie_legal_ha: p.superficie_legal_ha,
          campo_ha: Math.round(campoHa * 100) / 100,
          oficial_ha: Math.round(oficialHa * 100) / 100,
          medicion_fuente: ultMed ? ultMed.fuente : 'campo',
          medicion_fecha: ultMed ? ultMed.fecha : null
        });
      }

      const proj = await get('SELECT * FROM proyecto WHERE id = ?', [o.proyecto_id]);
      const metaHa = proj ? proj.superficie_meta_ha : 120.0;

      obrasAvance.push({
        obra_id: o.id,
        obra_nombre: o.nombre,
        fase_actual: o.fase_actual,
        total_campo_ha: Math.round(obraTotalCampoHa * 100) / 100,
        meta_ha: metaHa,
        predios: prediosAvance
      });
    }

    // Widget 3: Incidencias abiertas
    const incidencias = await all(`
      SELECT i.*, o.nombre as obra_nombre 
      FROM incidencia i 
      JOIN obra o ON i.obra_id = o.id 
      WHERE i.estado != 'cerrada' 
      ORDER BY i.abierta_en ASC
    `);
    const incidenciasConDias = incidencias.map(i => {
      const dias = Math.max(0, Math.floor((new Date() - new Date(i.abierta_en)) / (1000 * 60 * 60 * 24)));
      return { ...i, dias_abierta: dias };
    });

    // Widget 4: Bloqueado por material
    const materialesFaltantes = await all(`
      SELECT m.*, o.nombre as obra_nombre 
      FROM material m 
      JOIN obra o ON m.obra_id = o.id 
      WHERE (m.requerido - m.en_sitio) > 0
    `);

    // Extras: Maquinaria y Activos
    const maquinas = await all('SELECT * FROM maquina');
    const activos = await all('SELECT a.*, p.nombre as predio_nombre FROM activo a JOIN predio p ON a.predio_id = p.id');

    res.json({
      success: true,
      fecha: today,
      widgets: {
        sin_reporte: sinReporte,
        avance_obras: obrasAvance,
        incidencias_abiertas: incidenciasConDias,
        bloqueado_material: materialesFaltantes
      },
      maquinaria: maquinas,
      activos: activos
    });
  } catch (error) {
    console.error('Error en /api/tablero/hoy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Catálogo de Obras y Predios (Para descarga offline en la Mini App)
app.get('/api/obras', async (req, res) => {
  try {
    const obras = await all('SELECT * FROM obra ORDER BY id ASC');
    const predios = await all('SELECT * FROM predio ORDER BY nombre ASC');
    const obraPredios = await all('SELECT * FROM obra_predio');

    const result = obras.map(o => {
      const pIds = obraPredios.filter(op => op.obra_id === o.id).map(op => op.predio_id);
      return {
        ...o,
        alias: o.alias ? JSON.parse(o.alias) : [],
        predios: predios.filter(p => pIds.includes(p.id))
      };
    });

    res.json({
      success: true,
      obras: result,
      predios: predios.map(p => ({ ...p, alias: p.alias ? JSON.parse(p.alias) : [] }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Sincronización en lote de Reportes Offline (Offline-First Sync API)
app.post('/api/reports/sync', async (req, res) => {
  const { reports } = req.body;
  if (!reports || !Array.isArray(reports) || reports.length === 0) {
    return res.status(400).json({ success: false, error: 'Lista de reportes vacía' });
  }

  const results = [];
  const errors = [];

  for (const rep of reports) {
    try {
      const {
        client_uuid,
        obra_id,
        fecha_operativa,
        offline_created_at,
        autor_nombre,
        es_sin_actividad,
        motivo_sin_actividad,
        texto_original,
        cuadrilla,
        avances,
        notas
      } = rep;

      const nowIso = new Date().toISOString();
      const existing = client_uuid ? await get('SELECT id FROM reporte WHERE client_uuid = ?', [client_uuid]) : null;

      let reporteId;
      if (existing) {
        reporteId = existing.id;
      } else {
        const insertRes = await run(`
          INSERT INTO reporte (
            client_uuid, obra_id, recibido_en, fecha_operativa, autor_nombre,
            texto_original, nota, estado, es_sin_actividad, motivo_sin_actividad
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmado', ?, ?)
        `, [
          client_uuid || `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          obra_id || 'guayeme',
          nowIso,
          fecha_operativa || offline_created_at?.split(' ')[0] || nowIso.split('T')[0],
          autor_nombre || 'Operador AGROK',
          texto_original || `Reporte Offline sincronizado el ${nowIso}`,
          notas || '',
          es_sin_actividad ? 1 : 0,
          motivo_sin_actividad || null
        ]);
        reporteId = insertRes.id;

        // Insertar cuadrilla
        if (cuadrilla && Array.isArray(cuadrilla)) {
          for (const c of cuadrilla) {
            await run(`
              INSERT INTO reporte_cuadrilla (reporte_id, rol_id, headcount)
              VALUES (?, ?, ?)
            `, [reporteId, c.rol_id, Number(c.headcount) || 1]);
          }
        }

        // Insertar líneas de avance
        if (avances && Array.isArray(avances)) {
          for (const a of avances) {
            await run(`
              INSERT INTO reporte_linea (
                reporte_id, predio_id, actividad_id, texto, cantidad, unidad, cantidad_ha, fuente
              ) VALUES (?, ?, ?, ?, ?, ?, ?, 'campo')
            `, [
              reporteId,
              a.predio_id || 'guayeme',
              a.actividad_id || 'siembra',
              a.texto || `${a.actividad_id} ${a.cantidad} ${a.unidad}`,
              Number(a.cantidad) || 0,
              a.unidad || 'ha',
              Number(a.cantidad_ha) || Number(a.cantidad) || 0
            ]);
          }
        }
      }

      results.push({
        client_uuid,
        server_id: reporteId,
        status: 'SYNCED',
        synced_at: nowIso
      });
    } catch (err) {
      console.error('Error sincronizando reporte AGROK:', err);
      errors.push({ client_uuid: rep.client_uuid, error: err.message });
    }
  }

  res.json({
    success: true,
    synced_count: results.length,
    results,
    errors: errors.length > 0 ? errors : undefined
  });
});

// 4. Crear Incidencia
app.post('/api/incidencias', async (req, res) => {
  const { tipo, obra_id, maquina_id, descripcion, autor_nombre } = req.body;
  if (!tipo || !obra_id || !descripcion) {
    return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
  }

  try {
    const count = (await get('SELECT COUNT(*) as c FROM incidencia')).c + 15;
    const folio = `F-${count}`;
    const nowIso = new Date().toISOString();

    await run(`
      INSERT INTO incidencia (folio, tipo, obra_id, maquina_id, estado, abierta_en, descripcion)
      VALUES (?, ?, ?, ?, 'abierta', ?, ?)
    `, [folio, tipo, obra_id, maquina_id || null, nowIso, descripcion]);

    await run(`
      INSERT INTO incidencia_evento (folio, fecha, autor_nombre, texto, estado_resultante)
      VALUES (?, ?, ?, ?, 'abierta')
    `, [folio, nowIso, autor_nombre || 'Supervisor', descripcion]);

    res.json({ success: true, folio, message: `Incidencia ${folio} creada` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Cerrar o Actualizar Incidencia (Requiere Causa Raíz)
app.post('/api/incidencias/:folio/estado', async (req, res) => {
  const { folio } = req.params;
  const { estado, causa_raiz, autor_nombre } = req.body;

  if (estado === 'cerrada' && (!causa_raiz || causa_raiz.trim().length < 5)) {
    return res.status(400).json({
      success: false,
      error: 'Regla AGROK: La causa raíz es obligatoria para cerrar una incidencia'
    });
  }

  try {
    const nowIso = new Date().toISOString();
    if (estado === 'cerrada') {
      await run(`
        UPDATE incidencia SET estado = 'cerrada', cerrada_en = ?, causa_raiz = ? WHERE folio = ?
      `, [nowIso, causa_raiz.trim(), folio]);
    } else {
      await run('UPDATE incidencia SET estado = ? WHERE folio = ?', [estado, folio]);
    }

    await run(`
      INSERT INTO incidencia_evento (folio, fecha, autor_nombre, texto, estado_resultante)
      VALUES (?, ?, ?, ?, ?)
    `, [folio, nowIso, autor_nombre || 'Usuario', `Cambio de estado a ${estado}: ${causa_raiz || ''}`, estado]);

    res.json({ success: true, message: `Incidencia ${folio} actualizada a ${estado}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Registrar Lectura de Horómetro de Maquinaria
app.post('/api/lecturas/maquina', async (req, res) => {
  const { maquina_id, obra_id, horometro_inicio, horometro_fin, litros, autor_nombre } = req.body;
  if (!maquina_id || horometro_fin === undefined) {
    return res.status(400).json({ success: false, error: 'Máquina y horómetro fin son obligatorios' });
  }

  try {
    const hInicio = Number(horometro_inicio) || 0;
    const hFin = Number(horometro_fin) || 0;
    const horasTrabajadas = Math.max(0, Math.round((hFin - hInicio) * 10) / 10);
    const nowIso = new Date().toISOString();

    await run(`
      INSERT INTO lectura_maquina (maquina_id, obra_id, fecha, autor_nombre, horometro_inicio, horometro_fin, horas_trabajadas, litros)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [maquina_id, obra_id || null, nowIso, autor_nombre || 'Operador', hInicio, hFin, horasTrabajadas, Number(litros) || 0]);

    await run('UPDATE maquina SET horometro_actual = ? WHERE id = ?', [hFin, maquina_id]);

    res.json({ success: true, message: 'Lectura de horómetro registrada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Endpoint para probar el Parser de Texto AGROK
app.post('/api/parser/test', (req, res) => {
  const { text, obra_id } = req.body;
  const parsed = parseDailyReport(text, new Date(), obra_id);
  res.json({ success: true, parsed });
});

// 8. Estado y Configuración del Bot
app.get('/api/bot/status', async (req, res) => {
  try {
    const status = getBotStatus();
    const subscribers = await all('SELECT chat_id, username, first_name, role, subscribed_at FROM telegram_subscribers WHERE is_active = 1');
    const botInstance = getBotInstance();

    let botInfo = null;
    if (botInstance) {
      try {
        botInfo = await botInstance.getMe();
      } catch (e) {}
    }

    res.json({
      success: true,
      bot: { ...status, botInfo, subscribers }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bot/config', async (req, res) => {
  const { token } = req.body;
  if (!token || !token.trim()) return res.status(400).json({ success: false, error: 'Token requerido' });

  try {
    await run("INSERT INTO system_settings (key, value) VALUES ('TELEGRAM_BOT_TOKEN', ?) ON CONFLICT(key) DO UPDATE SET value = ?", [token.trim(), token.trim()]);
    const botInstance = initTelegramBot(token.trim());
    if (botInstance) {
      const me = await botInstance.getMe();
      return res.json({ success: true, message: `Conectado como @${me.username}`, botInfo: me });
    }
    return res.status(400).json({ success: false, error: 'Token inválido' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Servir archivos estáticos del frontend (Producción / Render)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  console.log('📦 Sirviendo frontend estático desde:', frontendDist);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Inicialización
async function startServer() {
  await initDb();
  const savedTokenRow = await get("SELECT value FROM system_settings WHERE key = 'TELEGRAM_BOT_TOKEN'");
  const token = process.env.TELEGRAM_BOT_TOKEN || (savedTokenRow ? savedTokenRow.value : null);

  if (token) {
    initTelegramBot(token);
  } else {
    console.log('💡 [Telegram Bot AGROK] Ingresa tu token de @BotFather en el panel.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor AGROK Backend iniciado en: http://localhost:${PORT}`);
  });
}

startServer();
