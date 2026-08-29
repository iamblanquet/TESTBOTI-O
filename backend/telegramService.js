const TelegramBot = require('node-telegram-bot-api');
const { run, get, all } = require('./database');

let bot = null;
let currentToken = null;

// Inicializar el bot con un token
function initTelegramBot(token) {
  if (!token || token.trim() === '' || token.includes('TU_TELEGRAM_BOT_TOKEN_AQUI')) {
    console.log('⚠️ [Telegram Bot] No se ha configurado un TELEGRAM_BOT_TOKEN válido en .env.');
    console.log('ℹ️ [Telegram Bot] Puedes configurar el token desde el archivo .env o mediante el panel web.');
    return null;
  }

  try {
    if (bot) {
      bot.stopPolling();
      bot = null;
    }

    currentToken = token.trim();
    bot = new TelegramBot(currentToken, { polling: true });

    console.log('🤖 [Telegram Bot] Iniciando polling con el token configurado...');

    bot.on('polling_error', (error) => {
      console.error('❌ [Telegram Bot] Error de polling:', error.code, error.message);
    });

    setupBotHandlers(bot);

    bot.getMe().then((me) => {
      console.log(`✅ [Telegram Bot] Conectado exitosamente como @${me.username} (${me.first_name})`);
    }).catch(err => {
      console.error('❌ [Telegram Bot] Error al verificar token con Telegram:', err.message);
    });

    return bot;
  } catch (error) {
    console.error('❌ [Telegram Bot] Error al inicializar bot:', error.message);
    return null;
  }
}

// Configurar los comandos y escuchadores del bot
function setupBotHandlers(botInstance) {
  // Comando /start
  botInstance.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.chat.username || '';
    const firstName = msg.chat.first_name || 'Colega';

    const welcomeMsg = 
      `👋 *¡Hola, ${firstName}!* Bienvenido al sistema de control de proyectos *Offline-First*.\n\n` +
      `Este bot conecta a los *Operadores en campo* con los *Supervisores* y *Líderes*.\n\n` +
      `👉 *Por favor selecciona tu rol para comenzar:*\n` +
      `• Para recibir alertas de reportes de campo: escribe \`/rol supervisor\`\n` +
      `• Para consultar estado y avances globales: escribe \`/rol lider\`\n\n` +
      `📌 *Otros comandos disponibles:*\n` +
      `• \`/proyectos\` - Ver estado de todos los proyectos\n` +
      `• \`/avance <CODIGO>\` - Ver detalle de un proyecto (ej: \`/avance PRJ-001\`)\n` +
      `• \`/nuevo_proyecto <COD> | <NOMBRE> | <DESC>\` - Crear proyecto (Supervisor)\n` +
      `• \`/ayuda\` - Ver guía de comandos`;

    botInstance.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
  });

  // Comando /rol [supervisor | lider]
  botInstance.onText(/\/rol\s+(.+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const roleInput = match[1].toLowerCase().trim();
    const username = msg.chat.username || '';
    const firstName = msg.chat.first_name || '';

    let role = '';
    let roleText = '';

    if (roleInput.includes('super')) {
      role = 'supervisor';
      roleText = '👷 *SUPERVISOR*';
    } else if (roleInput.includes('lid') || roleInput.includes('geren')) {
      role = 'lider';
      roleText = '📊 *LÍDER DE PROYECTO*';
    } else {
      return botInstance.sendMessage(
        chatId,
        `⚠️ Rol no reconocido. Usa:\n• \`/rol supervisor\`\n• \`/rol lider\``,
        { parse_mode: 'Markdown' }
      );
    }

    try {
      await run(`
        INSERT INTO telegram_subscribers (chat_id, username, first_name, role, is_active)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(chat_id) DO UPDATE SET role = ?, is_active = 1, username = ?, first_name = ?
      `, [chatId, username, firstName, role, role, username, firstName]);

      let confirmation = `✅ *¡Registro exitoso como ${roleText}!*\n\n`;
      if (role === 'supervisor') {
        confirmation += `🔔 *Ahora recibirás alertas instantáneas* cada vez que un operador sincronice un reporte de campo con su hora real de captura offline.\n` +
                        `También puedes crear proyectos con: \`/nuevo_proyecto COD | NOMBRE | DESCRIPCIÓN\``;
      } else {
        confirmation += `📈 *Acceso habilitado.* Puedes consultar los avances consolidados en cualquier momento con \`/proyectos\` o \`/avance <CODIGO>\`.`;
      }

      botInstance.sendMessage(chatId, confirmation, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error al guardar suscriptor:', err);
      botInstance.sendMessage(chatId, '❌ Ocurrió un error al registrar tu rol.');
    }
  });

  // Comando /proyectos (Para Líderes y Supervisores)
  botInstance.onText(/\/proyectos/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const projects = await all(`
        SELECT p.*, COUNT(r.id) as total_reports 
        FROM projects p 
        LEFT JOIN reports r ON p.id = r.project_id 
        GROUP BY p.id 
        ORDER BY p.id ASC
      `);

      if (projects.length === 0) {
        return botInstance.sendMessage(chatId, '📁 No hay proyectos registrados actualmente.');
      }

      let response = `📊 *ESTADO GENERAL DE PROYECTOS*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      projects.forEach((p) => {
        const bar = createProgressBar(p.progress_percent || 0);
        response += `📁 *[${p.code}] ${p.name}*\n` +
                    `📍 *Ubicación:* ${p.location || 'No especificada'}\n` +
                    `📈 *Avance:* ${bar} *${p.progress_percent || 0}%*\n` +
                    `📝 *Reportes recibidos:* ${p.total_reports}\n` +
                    `🔍 Ver detalle: \`/avance ${p.code}\`\n\n`;
      });

      response += `_Tip: Puedes escribir /avance <CODIGO> para ver los últimos reportes de campo._`;

      botInstance.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error al listar proyectos en telegram:', err);
      botInstance.sendMessage(chatId, '❌ Error al consultar la lista de proyectos.');
    }
  });

  // Comando /avance <CODIGO>
  botInstance.onText(/\/avance(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const projectQuery = match[1] ? match[1].trim() : null;

    if (!projectQuery) {
      return botInstance.sendMessage(
        chatId,
        `⚠️ Por favor especifica el código del proyecto. Ejemplo:\n\`/avance PRJ-001\``,
        { parse_mode: 'Markdown' }
      );
    }

    try {
      const project = await get(`
        SELECT * FROM projects 
        WHERE code LIKE ? OR name LIKE ? 
        LIMIT 1
      `, [`%${projectQuery}%`, `%${projectQuery}%`]);

      if (!project) {
        return botInstance.sendMessage(
          chatId,
          `❌ No se encontró ningún proyecto con el código o nombre "*${projectQuery}*". Usa \`/proyectos\` para ver los códigos activos.`,
          { parse_mode: 'Markdown' }
        );
      }

      const tasks = await all('SELECT * FROM tasks WHERE project_id = ? ORDER BY id ASC', [project.id]);
      const lastReports = await all(`
        SELECT * FROM reports 
        WHERE project_id = ? 
        ORDER BY id DESC LIMIT 3
      `, [project.id]);

      const bar = createProgressBar(project.progress_percent || 0);

      let response = `📁 *PROYECTO: [${project.code}] ${project.name}*\n` +
                     `━━━━━━━━━━━━━━━━━━━━\n` +
                     `📌 *Descripción:* ${project.description || 'Sin descripción'}\n` +
                     `📍 *Ubicación:* ${project.location || 'N/A'}\n` +
                     `📈 *Avance Consolidado:* ${bar} *${project.progress_percent || 0}%*\n` +
                     `🏷️ *Estado:* \`${project.status}\`\n\n`;

      if (tasks.length > 0) {
        response += `📋 *Tareas / Hitos:*\n`;
        tasks.forEach((t, i) => {
          response += `  ${i + 1}. ${t.name} (${t.status})\n`;
        });
        response += `\n`;
      }

      response += `📝 *Últimos reportes de operadores:*\n`;
      if (lastReports.length === 0) {
        response += `_Aún no hay reportes sincronizados para este proyecto._\n`;
      } else {
        lastReports.forEach((r, idx) => {
          response += `\n🔸 *Reporte #${r.id} - ${r.operator_name}* (+${r.advance_percent}% avance)\n` +
                      `  ⏰ *Capturado en campo:* \`${r.offline_created_at}\`\n` +
                      `  🔄 *Sincronizado:* \`${r.synced_at}\`\n` +
                      `  💬 *Notas:* ${r.notes || 'Sin notas'}\n`;
        });
      }

      botInstance.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error al consultar detalle del proyecto:', err);
      botInstance.sendMessage(chatId, '❌ Error al consultar el proyecto.');
    }
  });

  // Comando /nuevo_proyecto (Para Supervisores)
  // Formato: /nuevo_proyecto CODIGO | NOMBRE | DESCRIPCION | UBICACION
  botInstance.onText(/\/nuevo_proyecto(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const content = match[1] ? match[1].trim() : '';

    const subscriber = await get('SELECT * FROM telegram_subscribers WHERE chat_id = ?', [chatId]);
    if (!subscriber || subscriber.role !== 'supervisor') {
      return botInstance.sendMessage(
        chatId,
        `🔒 *Acceso restringido.* Este comando es para *Supervisores*.\nPara registrarte como supervisor usa: \`/rol supervisor\``,
        { parse_mode: 'Markdown' }
      );
    }

    const parts = content.split('|').map(s => s.trim());
    if (parts.length < 2) {
      return botInstance.sendMessage(
        chatId,
        `⚠️ *Formato incorrecto.*\nUsa el separador \`|\`:\n\`/nuevo_proyecto CODIGO | NOMBRE | DESCRIPCION | UBICACION\`\n\n*Ejemplo:*\n\`/nuevo_proyecto PRJ-004 | Red Eléctrica Subestación Sur | Tendido de media tensión | Zona Industrial\``,
        { parse_mode: 'Markdown' }
      );
    }

    const [code, name, description = '', location = ''] = parts;

    try {
      const result = await run(
        `INSERT INTO projects (code, name, description, location, progress_percent) VALUES (?, ?, ?, ?, 0)`,
        [code.toUpperCase(), name, description, location]
      );

      // Crear una tarea genérica inicial
      await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [
        result.id,
        'Fase 1: Replanteo y arranque',
        'Actividades iniciales de campo'
      ]);

      const successMsg = 
        `✅ *¡Proyecto creado con éxito!*\n\n` +
        `📁 *Código:* \`${code.toUpperCase()}\`\n` +
        `📌 *Nombre:* ${name}\n` +
        `📝 *Descripción:* ${description || 'N/A'}\n` +
        `📍 *Ubicación:* ${location || 'N/A'}\n\n` +
        `📲 *Los operadores ya pueden descargar este proyecto en su aplicación móvil.*`;

      botInstance.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error al crear proyecto desde telegram:', err);
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        botInstance.sendMessage(chatId, `❌ El código \`${code}\` ya existe. Por favor usa un código único.`, { parse_mode: 'Markdown' });
      } else {
        botInstance.sendMessage(chatId, '❌ Error al registrar el nuevo proyecto.');
      }
    }
  });

  // Comando /ayuda
  botInstance.onText(/\/ayuda/, (msg) => {
    const helpText = 
      `📖 *GUÍA DE COMANDOS DEL BOT*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👥 *ASIGNACIÓN DE ROLES*\n` +
      `• \`/rol supervisor\` - Registrarse para recibir alertas de reportes de campo y gestionar proyectos.\n` +
      `• \`/rol lider\` - Registrarse para consultas ejecutivas de avance.\n\n` +
      `📊 *CONSULTAS*\n` +
      `• \`/proyectos\` - Lista de todos los proyectos y su avance actual.\n` +
      `• \`/avance <CODIGO>\` - Ficha detallada con últimos reportes recibidos (Ej: \`/avance PRJ-001\`).\n\n` +
      `👷 *GESTIÓN (SUPERVISORES)*\n` +
      `• \`/nuevo_proyecto COD | NOMBRE | DESC | UBICACION\` - Crear un nuevo proyecto directamente.\n\n` +
      `📱 *INFORMACIÓN OFFLINE-FIRST*\n` +
      `Cuando los operadores en campo capturan datos sin internet, el sistema guarda la hora real de campo. Al sincronizar, este bot te notificará inmediatamente indicando ambas marcas de tiempo.`;

    botInstance.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  });
}

// Función para notificar a los supervisores y líderes cuando se sincroniza un reporte
async function notifyReportSynced(reportData) {
  if (!bot) {
    console.log('ℹ️ [Telegram Bot] Bot no inicializado. Reporte recibido en BD pero no enviado a Telegram.');
    return { success: false, error: 'Bot no inicializado' };
  }

  try {
    const subscribers = await all(`SELECT * FROM telegram_subscribers WHERE is_active = 1`);
    if (!subscribers || subscribers.length === 0) {
      console.log('ℹ️ [Telegram Bot] No hay supervisores ni líderes registrados con /start o /rol.');
      return { success: true, count: 0 };
    }

    const message = 
      `🚨 *NUEVO REPORTE DE CAMPO (SINCRONIZADO)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📁 *Proyecto:* [${reportData.project_code || 'PRJ'}] ${reportData.project_name}\n` +
      `📌 *Tarea/Actividad:* ${reportData.task_name || 'General'}\n` +
      `👷 *Operador:* *${reportData.operator_name}*\n` +
      `📈 *Avance Reportado:* *+${reportData.advance_percent}%* (Total acumulado: ${reportData.new_total_progress || reportData.advance_percent}%)\n\n` +
      `⏱️ *Hora de captura en campo (OFFLINE):*\n` +
      `   👉 \`${reportData.offline_created_at}\` *(Hora real)*\n\n` +
      `🔄 *Hora de sincronización (ONLINE):*\n` +
      `   👉 \`${reportData.synced_at || new Date().toISOString()}\`\n\n` +
      `💬 *Observaciones:* \n` +
      `_${reportData.notes || 'Sin observaciones adicionales'}_`;

    let sentCount = 0;
    for (const sub of subscribers) {
      try {
        await bot.sendMessage(sub.chat_id, message, { parse_mode: 'Markdown' });
        sentCount++;
      } catch (sendErr) {
        console.error(`Error enviando mensaje a chat ${sub.chat_id}:`, sendErr.message);
      }
    }

    console.log(`📨 [Telegram Bot] Notificación de reporte enviada a ${sentCount} suscriptores.`);
    return { success: true, count: sentCount };
  } catch (error) {
    console.error('Error al notificar reporte por telegram:', error);
    return { success: false, error: error.message };
  }
}

// Barra de progreso visual en texto
function createProgressBar(percent) {
  const totalBars = 10;
  const filled = Math.min(Math.max(Math.round((percent / 100) * totalBars), 0), totalBars);
  const empty = totalBars - filled;
  return '`[' + '█'.repeat(filled) + '░'.repeat(empty) + ']`';
}

function getBotInstance() {
  return bot;
}

function getBotStatus() {
  return {
    isConfigured: !!currentToken,
    hasActiveBot: !!bot,
    tokenMasked: currentToken ? currentToken.slice(0, 6) + '...' + currentToken.slice(-4) : null
  };
}

module.exports = {
  initTelegramBot,
  notifyReportSynced,
  getBotInstance,
  getBotStatus
};
