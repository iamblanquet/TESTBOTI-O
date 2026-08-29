require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, run, get, all } = require('./database');
const { initTelegramBot, notifyReportSynced, getBotStatus, getBotInstance } = require('./telegramService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Obtener proyectos y tareas para descarga y uso offline
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await all('SELECT * FROM projects ORDER BY id ASC');
    const tasks = await all('SELECT * FROM tasks ORDER BY project_id, id ASC');

    const result = projects.map(p => {
      return {
        ...p,
        tasks: tasks.filter(t => t.project_id === p.id)
      };
    });

    res.json({ success: true, projects: result });
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Crear nuevo proyecto (Para Supervisores vía Web o API)
app.post('/api/projects', async (req, res) => {
  const { code, name, description, location, tasks } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, error: 'Código y Nombre son requeridos' });
  }

  try {
    const result = await run(
      `INSERT INTO projects (code, name, description, location, progress_percent) VALUES (?, ?, ?, ?, 0)`,
      [code.trim().toUpperCase(), name.trim(), description || '', location || '']
    );

    const projectId = result.id;

    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      for (const taskName of tasks) {
        if (taskName && taskName.trim()) {
          await run(`INSERT INTO tasks (project_id, name) VALUES (?, ?)`, [projectId, taskName.trim()]);
        }
      }
    } else {
      await run(`INSERT INTO tasks (project_id, name) VALUES (?, ?)`, [projectId, 'Fase 1: Actividades iniciales']);
    }

    const createdProject = await get('SELECT * FROM projects WHERE id = ?', [projectId]);
    const projectTasks = await all('SELECT * FROM tasks WHERE project_id = ?', [projectId]);

    res.json({
      success: true,
      message: 'Proyecto creado exitosamente',
      project: { ...createdProject, tasks: projectTasks }
    });
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Sincronización en lote de Reportes creados OFFLINE
app.post('/api/reports/sync', async (req, res) => {
  const { reports } = req.body;

  if (!reports || !Array.isArray(reports) || reports.length === 0) {
    return res.status(400).json({ success: false, error: 'Se esperaba un arreglo de reportes no vacío' });
  }

  const syncedResults = [];
  const errors = [];

  for (const report of reports) {
    try {
      const {
        client_uuid,
        project_id,
        task_id,
        operator_name,
        advance_percent,
        notes,
        offline_created_at
      } = report;

      // Obtener info del proyecto
      const project = await get('SELECT * FROM projects WHERE id = ?', [project_id]);
      if (!project) {
        throw new Error(`Proyecto con ID ${project_id} no encontrado`);
      }

      let taskName = 'General';
      if (task_id) {
        const task = await get('SELECT * FROM tasks WHERE id = ?', [task_id]);
        if (task) taskName = task.name;
      }

      // Insertar o ignorar si ya se había sincronizado (idempotencia mediante client_uuid)
      const nowIso = new Date().toISOString();
      const existing = client_uuid ? await get('SELECT * FROM reports WHERE client_uuid = ?', [client_uuid]) : null;

      let savedReportId;
      if (existing) {
        savedReportId = existing.id;
      } else {
        const insertRes = await run(`
          INSERT INTO reports (
            client_uuid, project_id, project_name, task_id, task_name,
            operator_name, advance_percent, notes, offline_created_at, synced_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SINCRONIZADO')
        `, [
          client_uuid || `rep-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          project.id,
          project.name,
          task_id || null,
          taskName,
          operator_name || 'Operador de Campo',
          Number(advance_percent) || 0,
          notes || '',
          offline_created_at || nowIso,
          nowIso
        ]);
        savedReportId = insertRes.id;

        // Actualizar avance total acumulado del proyecto (máximo 100%)
        const newProgress = Math.min(100, (project.progress_percent || 0) + (Number(advance_percent) || 0));
        await run(`UPDATE projects SET progress_percent = ? WHERE id = ?`, [newProgress, project.id]);

        // Disparar Notificación Inmediata al Bot de Telegram (Supervisores y Líderes)
        await notifyReportSynced({
          id: savedReportId,
          project_code: project.code,
          project_name: project.name,
          task_name: taskName,
          operator_name: operator_name || 'Operador de Campo',
          advance_percent: Number(advance_percent) || 0,
          new_total_progress: newProgress,
          notes: notes || '',
          offline_created_at: offline_created_at,
          synced_at: nowIso
        });
      }

      syncedResults.push({
        client_uuid,
        server_id: savedReportId,
        status: 'SINCRONIZADO',
        synced_at: nowIso
      });
    } catch (err) {
      console.error('Error procesando reporte individual:', err);
      errors.push({
        client_uuid: report.client_uuid,
        error: err.message
      });
    }
  }

  res.json({
    success: true,
    synced_count: syncedResults.length,
    results: syncedResults,
    errors: errors.length > 0 ? errors : undefined
  });
});

// 4. Historial de reportes
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await all(`
      SELECT r.*, p.code as project_code 
      FROM reports r
      LEFT JOIN projects p ON r.project_id = p.id
      ORDER BY r.id DESC
    `);
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Estadísticas del Dashboard (Para vista de Líder/Supervisor)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const projects = await all('SELECT * FROM projects');
    const reports = await all('SELECT * FROM reports ORDER BY id DESC LIMIT 10');
    const subscribers = await all('SELECT * FROM telegram_subscribers WHERE is_active = 1');

    const totalProjects = projects.length;
    const totalReports = (await get('SELECT COUNT(*) as count FROM reports')).count;
    const avgProgress = totalProjects > 0 
      ? Math.round(projects.reduce((acc, p) => acc + (p.progress_percent || 0), 0) / totalProjects) 
      : 0;

    res.json({
      success: true,
      stats: {
        totalProjects,
        totalReports,
        avgProgress,
        telegramSubscribers: subscribers.length,
        subscribersList: subscribers
      },
      recentReports: reports,
      projects
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Estado y configuración del Bot de Telegram
app.get('/api/bot/status', async (req, res) => {
  try {
    const status = getBotStatus();
    const subscribers = await all('SELECT chat_id, username, first_name, role, subscribed_at FROM telegram_subscribers WHERE is_active = 1');
    const botInstance = getBotInstance();

    let botInfo = null;
    if (botInstance) {
      try {
        botInfo = await botInstance.getMe();
      } catch (e) {
        // Ignorar si no responde
      }
    }

    res.json({
      success: true,
      bot: {
        ...status,
        botInfo,
        subscribers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Configuración dinámica del Token de Telegram desde la app
app.post('/api/bot/config', async (req, res) => {
  const { token } = req.body;
  if (!token || !token.trim()) {
    return res.status(400).json({ success: false, error: 'Token no puede estar vacío' });
  }

  try {
    await run(`INSERT INTO system_settings (key, value) VALUES ('TELEGRAM_BOT_TOKEN', ?) ON CONFLICT(key) DO UPDATE SET value = ?`, [token.trim(), token.trim()]);
    
    // Reiniciar bot con el nuevo token
    const botInstance = initTelegramBot(token.trim());
    
    if (botInstance) {
      const me = await botInstance.getMe();
      return res.json({
        success: true,
        message: `Bot de Telegram conectado exitosamente como @${me.username}`,
        botInfo: me
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'El token ingresado no es válido o no pudo conectarse con la API de Telegram.'
      });
    }
// 8. Servir archivos estáticos del frontend (Producción / Render)
const fs = require('fs');
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  console.log('📦 Sirviendo frontend estático desde:', frontendDist);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Inicializar base de datos y bot al arrancar
async function startServer() {
  await initDb();

  // Intentar cargar token de Telegram desde .env o base de datos
  const savedTokenRow = await get("SELECT value FROM system_settings WHERE key = 'TELEGRAM_BOT_TOKEN'");
  const token = process.env.TELEGRAM_BOT_TOKEN || (savedTokenRow ? savedTokenRow.value : null);

  if (token) {
    initTelegramBot(token);
  } else {
    console.log('💡 [Telegram Bot] No hay token configurado aún. Puedes ingresarlo en .env o desde el panel de control.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend iniciado en: http://localhost:${PORT}`);
  });
}

startServer();
