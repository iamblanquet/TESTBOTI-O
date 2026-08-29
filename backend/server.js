require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb, run, get, all, hashPassword } = require('./database');
const { initTelegramBot, getBotStatus, getBotInstance } = require('./telegramService');
const { parseDailyReport } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. AUTENTICACIÓN & GESTIÓN DE USUARIOS Y ROLES
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
  }

  try {
    const pHash = hashPassword(password);
    const user = await get(`
      SELECT id, username, nombre, rol, tg_user_id, tg_chat_id, puede_crear_proyectos, puede_cerrar_incidencias, puede_registrar_medicion, puede_gestionar_materiales, activo 
      FROM usuario 
      WHERE username = ? AND password_hash = ? AND activo = 1
    `, [username.trim().toLowerCase(), pHash]);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas o usuario inactivo' });
    }

    res.json({
      success: true,
      user,
      token: `session-${user.id}-${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await all(`
      SELECT id, username, nombre, rol, tg_user_id, tg_chat_id, puede_crear_proyectos, puede_cerrar_incidencias, puede_registrar_medicion, puede_gestionar_materiales, activo, creado_en 
      FROM usuario 
      ORDER BY creado_en DESC
    `);
    const subscribers = await all('SELECT * FROM telegram_subscribers');
    res.json({ success: true, usuarios, subscribers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const { username, password, nombre, rol, puede_crear_proyectos, puede_cerrar_incidencias, puede_registrar_medicion, puede_gestionar_materiales, tg_user_id } = req.body;
  if (!username || !password || !nombre) {
    return res.status(400).json({ success: false, error: 'Usuario, contraseña y nombre son obligatorios' });
  }

  try {
    const userId = `usr-${Date.now().toString(36)}`;
    const pHash = hashPassword(password);

    // Asignar funciones por defecto según el rol si no se especifican
    let crearProj = puede_crear_proyectos ? 1 : 0;
    let cerrarInc = puede_cerrar_incidencias ? 1 : 0;
    let gestMat = puede_gestionar_materiales ? 1 : 0;
    let regMed = puede_registrar_medicion ? 1 : 0;

    if (rol === 'supervisor' || rol === 'direccion' || rol === 'it') {
      crearProj = 1;
      cerrarInc = 1;
      gestMat = 1;
    }
    if (rol === 'it' || rol === 'direccion') {
      regMed = 1;
    }

    await run(`
      INSERT INTO usuario (
        id, username, password_hash, nombre, rol,
        puede_crear_proyectos, puede_cerrar_incidencias, puede_registrar_medicion, puede_gestionar_materiales,
        tg_user_id, creado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      username.trim().toLowerCase(),
      pHash,
      nombre.trim(),
      rol || 'campo',
      crearProj,
      cerrarInc,
      regMed,
      gestMat,
      tg_user_id || null,
      new Date().toISOString()
    ]);

    res.json({ success: true, message: `Usuario @${username} creado con éxito`, userId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, rol, puede_crear_proyectos, puede_cerrar_incidencias, puede_registrar_medicion, puede_gestionar_materiales, password, activo, tg_user_id } = req.body;

  try {
    if (password && password.trim().length > 0) {
      const pHash = hashPassword(password);
      await run('UPDATE usuario SET password_hash = ? WHERE id = ?', [pHash, id]);
    }

    await run(`
      UPDATE usuario 
      SET nombre = COALESCE(?, nombre),
          rol = COALESCE(?, rol),
          puede_crear_proyectos = COALESCE(?, puede_crear_proyectos),
          puede_cerrar_incidencias = COALESCE(?, puede_cerrar_incidencias),
          puede_registrar_medicion = COALESCE(?, puede_registrar_medicion),
          puede_gestionar_materiales = COALESCE(?, puede_gestionar_materiales),
          activo = COALESCE(?, activo),
          tg_user_id = COALESCE(?, tg_user_id)
      WHERE id = ?
    `, [
      nombre ? nombre.trim() : null,
      rol || null,
      puede_crear_proyectos !== undefined ? (puede_crear_proyectos ? 1 : 0) : null,
      puede_cerrar_incidencias !== undefined ? (puede_cerrar_incidencias ? 1 : 0) : null,
      puede_registrar_medicion !== undefined ? (puede_registrar_medicion ? 1 : 0) : null,
      puede_gestionar_materiales !== undefined ? (puede_gestionar_materiales ? 1 : 0) : null,
      activo !== undefined ? (activo ? 1 : 0) : null,
      tg_user_id || null,
      id
    ]);

    res.json({ success: true, message: 'Usuario actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await run('UPDATE usuario SET activo = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. PROYECTOS & TAREAS (Para Gerentes / Supervisores y Admin)
// ==========================================

app.get('/api/proyectos', async (req, res) => {
  try {
    const proyectos = await all('SELECT * FROM proyecto ORDER BY id ASC');
    const obras = await all('SELECT * FROM obra');

    const result = proyectos.map(p => {
      const pObras = obras.filter(o => o.proyecto_id === p.id);
      return {
        ...p,
        obras_count: pObras.length,
        obras: pObras
      };
    });

    res.json({ success: true, proyectos: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/proyectos', async (req, res) => {
  const { id, nombre, tipo, ciclo, superficie_meta_ha, fase_catalogo, gerente_id, inicio, fin } = req.body;
  if (!nombre) return res.status(400).json({ success: false, error: 'Nombre del proyecto requerido' });

  try {
    const cleanId = id ? id.trim() : `PRJ-${Date.now().toString(36).toUpperCase()}`;
    await run(`
      INSERT INTO proyecto (id, nombre, tipo, ciclo, superficie_meta_ha, fase_catalogo, gerente_id, inicio, fin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanId,
      nombre.trim(),
      tipo || 'maiz',
      ciclo || `${tipo || 'Maíz'} 2026`,
      Number(superficie_meta_ha) || 0,
      fase_catalogo || 'V0_V2',
      gerente_id || 'Gerente Asignado',
      inicio || new Date().toISOString().split('T')[0],
      fin || null
    ]);

    res.json({ success: true, message: 'Proyecto creado exitosamente', projectId: cleanId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/proyectos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, ciclo, superficie_meta_ha, fase_catalogo, gerente_id, estado, inicio, fin } = req.body;

  try {
    await run(`
      UPDATE proyecto
      SET nombre = COALESCE(?, nombre),
          tipo = COALESCE(?, tipo),
          ciclo = COALESCE(?, ciclo),
          superficie_meta_ha = COALESCE(?, superficie_meta_ha),
          fase_catalogo = COALESCE(?, fase_catalogo),
          gerente_id = COALESCE(?, gerente_id),
          estado = COALESCE(?, estado),
          inicio = COALESCE(?, inicio),
          fin = COALESCE(?, fin)
      WHERE id = ?
    `, [
      nombre, tipo, ciclo,
      superficie_meta_ha !== undefined ? Number(superficie_meta_ha) : null,
      fase_catalogo, gerente_id, estado, inicio, fin,
      id
    ]);

    res.json({ success: true, message: 'Proyecto actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 3. TABLERO OPERATIVO (4 WIDGETS CANÓNICOS)
// ==========================================

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
        const ultRep = await get('SELECT fecha_operativa FROM reporte WHERE obra_id = ? ORDER BY fecha_operativa DESC LIMIT 1', [o.id]);
        let dias = 1;
        if (ultRep && ultRep.fecha_operativa) {
          dias = Math.max(1, Math.floor((new Date(today) - new Date(ultRep.fecha_operativa)) / (1000 * 60 * 60 * 24)));
        }
        sinReporte.push({ ...o, dias_sin_reporte: dias });
      }
    }
    sinReporte.sort((a, b) => b.dias_sin_reporte - a.dias_sin_reporte);

    // Widget 2: Avance contra meta
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
    const incidenciasConDias = incidencias.map(i => ({
      ...i,
      dias_abierta: Math.max(0, Math.floor((new Date() - new Date(i.abierta_en)) / (1000 * 60 * 60 * 24)))
    }));

    // Widget 4: Bloqueado por material
    const materialesFaltantes = await all(`
      SELECT m.*, o.nombre as obra_nombre 
      FROM material m 
      JOIN obra o ON m.obra_id = o.id 
      WHERE (m.requerido - m.en_sitio) > 0
    `);

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
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 4. OBRAS, PREDIOS, ACTIVIDADES Y ROLES
// ==========================================

app.get('/api/obras', async (req, res) => {
  try {
    const obras = await all('SELECT * FROM obra ORDER BY id ASC');
    const predios = await all('SELECT * FROM predio ORDER BY nombre ASC');
    const obraPredios = await all('SELECT * FROM obra_predio');
    const actividades = await all('SELECT * FROM actividad_catalogo ORDER BY nombre ASC');
    const rolesCuadrilla = await all('SELECT * FROM rol_cuadrilla_catalogo ORDER BY nombre ASC');
    const proyectos = await all('SELECT * FROM proyecto ORDER BY nombre ASC');

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
      predios: predios.map(p => ({ ...p, alias: p.alias ? JSON.parse(p.alias) : [] })),
      actividades,
      rolesCuadrilla,
      proyectos
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/obras', async (req, res) => {
  const { id, nombre, proyecto_id, entidad_id, fase_actual, estado, responsable_id, predio_ids } = req.body;
  if (!nombre) return res.status(400).json({ success: false, error: 'Nombre de obra requerido' });

  try {
    const cleanId = id ? id.trim().toLowerCase().replace(/\s+/g, '_') : `obra_${Date.now().toString(36)}`;
    await run(`
      INSERT INTO obra (id, nombre, proyecto_id, entidad_id, fase_actual, estado, responsable_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [cleanId, nombre.trim(), proyecto_id || 'PRJ-MAIZ-2026', entidad_id || 'Agrokool', fase_actual || 'operacion', estado || 'operacion', responsable_id || 'Campo']);

    if (predio_ids && Array.isArray(predio_ids)) {
      for (const pid of predio_ids) {
        await run('INSERT OR IGNORE INTO obra_predio (obra_id, predio_id) VALUES (?, ?)', [cleanId, pid]);
      }
    }

    res.json({ success: true, message: 'Obra creada exitosamente', obraId: cleanId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/obras/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, fase_actual, estado, responsable_id, proyecto_id, predio_ids } = req.body;

  try {
    await run(`
      UPDATE obra 
      SET nombre = COALESCE(?, nombre),
          fase_actual = COALESCE(?, fase_actual),
          estado = COALESCE(?, estado),
          responsable_id = COALESCE(?, responsable_id),
          proyecto_id = COALESCE(?, proyecto_id)
      WHERE id = ?
    `, [nombre, fase_actual, estado, responsable_id, proyecto_id, id]);

    if (predio_ids && Array.isArray(predio_ids)) {
      await run('DELETE FROM obra_predio WHERE obra_id = ?', [id]);
      for (const pid of predio_ids) {
        await run('INSERT INTO obra_predio (obra_id, predio_id) VALUES (?, ?)', [id, pid]);
      }
    }

    res.json({ success: true, message: 'Obra actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Predios CRUD
app.get('/api/predios', async (req, res) => {
  try {
    const predios = await all('SELECT * FROM predio ORDER BY nombre ASC');
    res.json({ success: true, predios: predios.map(p => ({ ...p, alias: p.alias ? JSON.parse(p.alias) : [] })) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/predios', async (req, res) => {
  const { id, nombre, superficie_legal_ha, superficie_util_ha, regimen, restricciones } = req.body;
  if (!nombre) return res.status(400).json({ success: false, error: 'Nombre de predio requerido' });

  try {
    const cleanId = id ? id.trim().toLowerCase().replace(/\s+/g, '_') : `predio_${Date.now().toString(36)}`;
    await run(`
      INSERT INTO predio (id, nombre, alias, superficie_legal_ha, superficie_util_ha, regimen, restricciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanId,
      nombre.trim(),
      JSON.stringify([nombre.trim()]),
      Number(superficie_legal_ha) || 0,
      Number(superficie_util_ha) || Number(superficie_legal_ha) || 0,
      regimen || 'propio',
      restricciones || ''
    ]);

    res.json({ success: true, message: 'Predio registrado exitosamente', predioId: cleanId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. REPORTES OFFLINE-FIRST & HISTORIAL
// ==========================================

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

        if (cuadrilla && Array.isArray(cuadrilla)) {
          for (const c of cuadrilla) {
            await run(`
              INSERT INTO reporte_cuadrilla (reporte_id, rol_id, headcount)
              VALUES (?, ?, ?)
            `, [reporteId, c.rol_id, Number(c.headcount) || 1]);
          }
        }

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

app.get('/api/reportes', async (req, res) => {
  try {
    const reportes = await all(`
      SELECT r.*, o.nombre as obra_nombre 
      FROM reporte r 
      JOIN obra o ON r.obra_id = o.id 
      ORDER BY r.id DESC LIMIT 50
    `);

    const result = [];
    for (const r of reportes) {
      const cuadrilla = await all('SELECT * FROM reporte_cuadrilla WHERE reporte_id = ?', [r.id]);
      const lineas = await all('SELECT l.*, p.nombre as predio_nombre FROM reporte_linea l JOIN predio p ON l.predio_id = p.id WHERE l.reporte_id = ?', [r.id]);
      result.push({ ...r, cuadrilla, lineas });
    }

    res.json({ success: true, reportes: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 6. INCIDENCIAS, MAQUINARIA, ACTIVOS & MATERIALES
// ==========================================

app.get('/api/incidencias', async (req, res) => {
  try {
    const incidencias = await all(`
      SELECT i.*, o.nombre as obra_nombre 
      FROM incidencia i 
      JOIN obra o ON i.obra_id = o.id 
      ORDER BY i.abierta_en DESC
    `);
    res.json({ success: true, incidencias });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
      await run("UPDATE incidencia SET estado = 'cerrada', cerrada_en = ?, causa_raiz = ? WHERE folio = ?", [nowIso, causa_raiz.trim(), folio]);
    } else {
      await run('UPDATE incidencia SET estado = ? WHERE folio = ?', [estado, folio]);
    }

    await run("INSERT INTO incidencia_evento (folio, fecha, autor_nombre, texto, estado_resultante) VALUES (?, ?, ?, ?, ?)", [
      folio, nowIso, autor_nombre || 'Usuario', `Cambio a ${estado}: ${causa_raiz || ''}`, estado
    ]);

    res.json({ success: true, message: `Incidencia ${folio} actualizada a ${estado}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Maquinaria
app.get('/api/maquinaria', async (req, res) => {
  try {
    const maquinas = await all('SELECT * FROM maquina ORDER BY id ASC');
    const lecturas = await all('SELECT l.*, m.nombre as maquina_nombre FROM lectura_maquina l JOIN maquina m ON l.maquina_id = m.id ORDER BY l.id DESC LIMIT 20');
    res.json({ success: true, maquinas, lecturas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/maquinaria', async (req, res) => {
  const { id, nombre, tipo, propietaria_id, umbral_servicio_hrs, horometro_actual, operador_habitual } = req.body;
  if (!nombre) return res.status(400).json({ success: false, error: 'Nombre requerido' });

  try {
    const cleanId = id ? id.trim().toLowerCase().replace(/\s+/g, '_') : `maq_${Date.now().toString(36)}`;
    await run(`
      INSERT INTO maquina (id, nombre, tipo, propietaria_id, umbral_servicio_hrs, horometro_actual, operador_habitual)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [cleanId, nombre.trim(), tipo || 'tractor', propietaria_id || 'Aspromex', Number(umbral_servicio_hrs) || 300, Number(horometro_actual) || 0, operador_habitual || 'General']);

    res.json({ success: true, message: 'Máquina registrada con éxito', maquinaId: cleanId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/lecturas/maquina', async (req, res) => {
  const { maquina_id, obra_id, horometro_inicio, horometro_fin, litros, autor_nombre } = req.body;
  if (!maquina_id || horometro_fin === undefined) {
    return res.status(400).json({ success: false, error: 'Máquina y horómetro fin requeridos' });
  }

  try {
    const hInicio = Number(horometro_inicio) || 0;
    const hFin = Number(horometro_fin) || 0;
    const horas = Math.max(0, Math.round((hFin - hInicio) * 10) / 10);
    const nowIso = new Date().toISOString();

    await run(`
      INSERT INTO lectura_maquina (maquina_id, obra_id, fecha, autor_nombre, horometro_inicio, horometro_fin, horas_trabajadas, litros)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [maquina_id, obra_id || null, nowIso, autor_nombre || 'Operador', hInicio, hFin, horas, Number(litros) || 0]);

    await run('UPDATE maquina SET horometro_actual = ? WHERE id = ?', [hFin, maquina_id]);

    res.json({ success: true, message: 'Horómetro registrado con éxito' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Activos
app.get('/api/activos', async (req, res) => {
  try {
    const activos = await all('SELECT a.*, p.nombre as predio_nombre FROM activo a JOIN predio p ON a.predio_id = p.id');
    res.json({ success: true, activos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/activos', async (req, res) => {
  const { id, nombre, predio_id, tipo, umbral_dias_sin_lectura } = req.body;
  if (!nombre || !predio_id) return res.status(400).json({ success: false, error: 'Campos requeridos faltantes' });

  try {
    const cleanId = id ? id.trim().toLowerCase().replace(/\s+/g, '_') : `activo_${Date.now().toString(36)}`;
    await run(`
      INSERT INTO activo (id, nombre, predio_id, tipo, umbral_dias_sin_lectura, ultima_lectura_fecha, ultimo_estado)
      VALUES (?, ?, ?, ?, ?, ?, 'ok')
    `, [cleanId, nombre.trim(), predio_id, tipo || 'bomba', Number(umbral_dias_sin_lectura) || 30, new Date().toISOString().split('T')[0]]);

    res.json({ success: true, message: 'Activo registrado', activoId: cleanId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Materiales
app.get('/api/materiales', async (req, res) => {
  try {
    const materiales = await all(`
      SELECT m.*, o.nombre as obra_nombre 
      FROM material m 
      JOIN obra o ON m.obra_id = o.id 
      ORDER BY m.id DESC
    `);
    res.json({ success: true, materiales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/materiales', async (req, res) => {
  const { obra_id, insumo, requerido, en_sitio, pedido, unidad, eta, autor_nombre } = req.body;
  if (!obra_id || !insumo) return res.status(400).json({ success: false, error: 'Obra e Insumo requeridos' });

  try {
    await run(`
      INSERT INTO material (obra_id, insumo, requerido, en_sitio, pedido, unidad, eta, actualizado_en, autor_nombre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [obra_id, insumo.trim(), Number(requerido) || 0, Number(en_sitio) || 0, Number(pedido) || 0, unidad || 'pieza', eta || 'sin_fecha', new Date().toISOString(), autor_nombre || 'Supervisor']);

    res.json({ success: true, message: 'Material registrado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parser Helper
app.post('/api/parser/test', (req, res) => {
  const { text, obra_id } = req.body;
  const parsed = parseDailyReport(text, new Date(), obra_id);
  res.json({ success: true, parsed });
});

// Bot Status & Config
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
    const botInstance = await initTelegramBot(token.trim(), app);
    if (botInstance) {
      const me = await botInstance.getMe();
      return res.json({ success: true, message: `Conectado como @${me.username}`, botInfo: me });
    }
    return res.status(400).json({ success: false, error: 'Token inválido' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir Frontend Estático en Producción (Render)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Inicialización del Servidor
async function startServer() {
  await initDb();
  const savedTokenRow = await get("SELECT value FROM system_settings WHERE key = 'TELEGRAM_BOT_TOKEN'");
  const token = process.env.TELEGRAM_BOT_TOKEN || (savedTokenRow ? savedTokenRow.value : null);

  if (token) {
    await initTelegramBot(token, app);
  } else {
    console.log('💡 [Telegram Bot AGROK] Ingresa tu token de @BotFather en el panel.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor AGROK Backend iniciado en: http://localhost:${PORT}`);
  });
}

startServer();
