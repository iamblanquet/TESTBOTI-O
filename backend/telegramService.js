const TelegramBot = require('node-telegram-bot-api');
const { run, get, all } = require('./database');

let bot = null;
let currentToken = null;

function getWebAppUrl() {
  return process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || 'https://testboti-o.onrender.com';
}

// Inicializar el bot con un token
function initTelegramBot(token) {
  if (!token || token.trim() === '' || token.includes('TU_TELEGRAM_BOT_TOKEN_AQUI')) {
    console.log('⚠️ [Telegram Bot] No se ha configurado un TELEGRAM_BOT_TOKEN válido.');
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
      
      // Configurar el botón de Menú persistente para abrir la Mini App
      const appUrl = getWebAppUrl();
      if (appUrl && appUrl.startsWith('https://')) {
        bot.setChatMenuButton({
          menu_button: {
            type: 'web_app',
            text: '📱 Mini App',
            web_app: { url: appUrl }
          }
        }).catch(err => {
          console.log('ℹ️ Nota MenuButton:', err.message);
        });
      }
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
    const firstName = msg.chat.first_name || 'Colega';
    const appUrl = getWebAppUrl();

    const welcomeMsg = 
      `👋 *¡Hola, ${firstName}!* Bienvenido al sistema de control y reportes *Offline-First*.\n\n` +
      `📱 *Puedes usar la nueva Telegram Mini App* para capturar reportes en campo incluso sin señal de internet, o interactuar directamente por este chat.\n\n` +
      `👉 *Selecciona tu rol o abre la Mini App:*`;

    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📱 ABRIR MINI APP OFFLINE-FIRST',
              web_app: { url: appUrl }
            }
          ],
          [
            { text: '🛠️ Soy Operador', callback_data: 'role_operador' },
            { text: '👷 Soy Supervisor', callback_data: 'role_supervisor' },
            { text: '📊 Soy Líder', callback_data: 'role_lider' }
          ],
          [
            { text: '📁 Ver Proyectos (/proyectos)', callback_data: 'cmd_proyectos' },
            { text: '📖 Ayuda (/ayuda)', callback_data: 'cmd_ayuda' }
          ]
        ]
      }
    };

    botInstance.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown', ...inlineKeyboard });
  });

  // Manejo de botones inline
  botInstance.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id.toString();
    const data = callbackQuery.data;
    const username = callbackQuery.from.username || '';
    const firstName = callbackQuery.from.first_name || '';

    if (data.startsWith('role_')) {
      const role = data.replace('role_', '');
      await registerUserRole(chatId, username, firstName, role, botInstance);
    } else if (data === 'cmd_proyectos') {
      sendProjectsList(chatId, botInstance);
    } else if (data === 'cmd_ayuda') {
      sendHelpMessage(chatId, botInstance);
    }

    botInstance.answerCallbackQuery(callbackQuery.id);
  });

  // Comando /rol [operador | supervisor | lider]
  botInstance.onText(/\/rol\s+(.+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const roleInput = match[1].toLowerCase().trim();
    const username = msg.chat.username || '';
    const firstName = msg.chat.first_name || '';

    let role = '';
    if (roleInput.includes('oper')) role = 'operador';
    else if (roleInput.includes('super')) role = 'supervisor';
    else if (roleInput.includes('lid') || roleInput.includes('geren')) role = 'lider';
    else {
      return botInstance.sendMessage(
        chatId,
        `⚠️ Rol no reconocido. Usa:\n• \`/rol operador\`\n• \`/rol supervisor\`\n• \`/rol lider\``,
        { parse_mode: 'Markdown' }
      );
    }

    await registerUserRole(chatId, username, firstName, role, botInstance);
  });

  // Comando /reportar (Para que los operadores envíen reportes directamente por chat de Telegram)
  // Formato: /reportar CODIGO | PORCENTAJE% | NOTAS
  botInstance.onText(/\/reportar(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const content = match[1] ? match[1].trim() : '';
    const operatorName = msg.chat.first_name + (msg.chat.last_name ? ` ${msg.chat.last_name}` : '') || msg.chat.username || 'Operador Telegram';

    if (!content) {
      return botInstance.sendMessage(
        chatId,
        `📝 *Formato para enviar reporte directo por Telegram:*\n` +
        `\`/reportar CODIGO | AVANCE% | OBSERVACIONES\`\n\n` +
        `*Ejemplo:*\n\`/reportar PRJ-001 | 15 | Terminado el tendido de tubería tramo 3\`\n\n` +
        `_Tip: También puedes presionar el botón "📱 Mini App" para usar la interfaz táctil con soporte offline completo._`,
        { parse_mode: 'Markdown' }
      );
    }

    const parts = content.split('|').map(s => s.trim());
    if (parts.length < 2) {
      return botInstance.sendMessage(
        chatId,
        `⚠️ Formato incompleto. Debe incluir al menos el código y el porcentaje.\n*Ejemplo:* \`/reportar PRJ-001 | 20 | Notas de campo\``,
        { parse_mode: 'Markdown' }
      );
    }

    const projectCode = parts[0].toUpperCase();
    const advancePercent = parseInt(parts[1].replace('%', ''), 10);
    const notes = parts[2] || 'Reporte enviado vía chat de Telegram';

    if (isNaN(advancePercent) || advancePercent <= 0) {
      return botInstance.sendMessage(chatId, '❌ El porcentaje de avance debe ser un número mayor a 0.');
    }

    try {
      const project = await get('SELECT * FROM projects WHERE code = ? OR name LIKE ?', [projectCode, `%${projectCode}%`]);
      if (!project) {
        return botInstance.sendMessage(
          chatId,
          `❌ No se encontró el proyecto con código \`${projectCode}\`. Escribe \`/proyectos\` para ver la lista.`,
          { parse_mode: 'Markdown' }
        );
      }

      const nowIso = new Date().toISOString();
      const nowFormatted = formatLocalTimestamp(new Date());

      // Guardar reporte
      const insertRes = await run(`
        INSERT INTO reports (
          client_uuid, project_id, project_name, task_id, task_name,
          operator_name, advance_percent, notes, offline_created_at, synced_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SINCRONIZADO')
      `, [
        `tg-${Date.now()}-${chatId}`,
        project.id,
        project.name,
        null,
        'Reporte Directo Telegram',
        operatorName,
        advancePercent,
        notes,
        nowFormatted,
        nowFormatted
      ]);

      // Actualizar avance acumulado
      const newProgress = Math.min(100, (project.progress_percent || 0) + advancePercent);
      await run('UPDATE projects SET progress_percent = ? WHERE id = ?', [newProgress, project.id]);

      // Confirmar al operador
      const confirmMsg = 
        `✅ *¡Reporte registrado exitosamente!*\n\n` +
        `📁 *Proyecto:* [${project.code}] ${project.name}\n` +
        `📈 *Avance Reportado:* +${advancePercent}%\n` +
        `📊 *Nuevo Total del Proyecto:* ${newProgress}%\n` +
        `⏱️ *Hora:* \`${nowFormatted}\`\n\n` +
        `📢 *Los supervisores y líderes han sido notificados.*`;

      botInstance.sendMessage(chatId, confirmMsg, { parse_mode: 'Markdown' });

      // Notificar a Supervisores y Líderes
      await notifyReportSynced({
        id: insertRes.id,
        project_code: project.code,
        project_name: project.name,
        task_name: 'Reporte Directo Telegram',
        operator_name: operatorName,
        advance_percent: advancePercent,
        new_total_progress: newProgress,
        notes: notes,
        offline_created_at: nowFormatted,
        synced_at: nowFormatted
      });

    } catch (err) {
      console.error('Error al guardar reporte directo:', err);
      botInstance.sendMessage(chatId, '❌ Error al procesar tu reporte.');
    }
  });

  // Escuchar datos enviados desde Telegram Mini App (si se usa sendData)
  botInstance.on('message', async (msg) => {
    if (msg.web_app_data) {
      try {
        const data = JSON.parse(msg.web_app_data.data);
        botInstance.sendMessage(
          msg.chat.id,
          `✅ *Datos recibidos desde la Mini App:* ${data.message || 'Reporte procesado'}`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        console.error('Error parseando web_app_data:', e);
      }
    }
  });

  // Comando /proyectos
  botInstance.onText(/\/proyectos/, (msg) => {
    sendProjectsList(msg.chat.id, botInstance);
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

      response += `📝 *Últimos reportes recibidos:*\n`;
      if (lastReports.length === 0) {
        response += `_Aún no hay reportes para este proyecto._\n`;
      } else {
        lastReports.forEach((r) => {
          response += `\n🔸 *Reporte #${r.id} - ${r.operator_name}* (+${r.advance_percent}% avance)\n` +
                      `  ⏰ *Captura en campo (Offline):* \`${r.offline_created_at}\`\n` +
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
  botInstance.onText(/\/nuevo_proyecto(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const content = match[1] ? match[1].trim() : '';

    const subscriber = await get('SELECT * FROM telegram_subscribers WHERE chat_id = ?', [chatId]);
    if (!subscriber || subscriber.role !== 'supervisor') {
      return botInstance.sendMessage(
        chatId,
        `🔒 *Acceso para Supervisores.*\nPara registrarte como supervisor usa: \`/rol supervisor\``,
        { parse_mode: 'Markdown' }
      );
    }

    const parts = content.split('|').map(s => s.trim());
    if (parts.length < 2) {
      return botInstance.sendMessage(
        chatId,
        `⚠️ *Formato:* \`/nuevo_proyecto CODIGO | NOMBRE | DESCRIPCION | UBICACION\`\n*Ejemplo:*\n\`/nuevo_proyecto PRJ-004 | Red Eléctrica Sur | Media tensión | Zona Industrial\``,
        { parse_mode: 'Markdown' }
      );
    }

    const [code, name, description = '', location = ''] = parts;

    try {
      const result = await run(
        `INSERT INTO projects (code, name, description, location, progress_percent) VALUES (?, ?, ?, ?, 0)`,
        [code.toUpperCase(), name, description, location]
      );

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
        `📲 *Los operadores ya pueden seleccionarlo en la Telegram Mini App.*`;

      botInstance.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Error al crear proyecto:', err);
      botInstance.sendMessage(chatId, '❌ Error al registrar el nuevo proyecto.');
    }
  });

  // Comando /ayuda
  botInstance.onText(/\/ayuda/, (msg) => {
    sendHelpMessage(msg.chat.id, botInstance);
  });
}

// Registrar rol de usuario
async function registerUserRole(chatId, username, firstName, role, botInstance) {
  let roleTitle = '';
  if (role === 'operador') roleTitle = '🛠️ *OPERADOR DE CAMPO*';
  else if (role === 'supervisor') roleTitle = '👷 *SUPERVISOR*';
  else roleTitle = '📊 *LÍDER DE PROYECTO*';

  try {
    await run(`
      INSERT INTO telegram_subscribers (chat_id, username, first_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(chat_id) DO UPDATE SET role = ?, is_active = 1, username = ?, first_name = ?
    `, [chatId, username, firstName, role, role, username, firstName]);

    let confirmation = `✅ *¡Registro exitoso como ${roleTitle}!* \n\n`;

    if (role === 'operador') {
      confirmation += `📲 *Para enviar reportes:*\n` +
                      `1. Abre la *Telegram Mini App* con el botón de abajo para trabajar *Offline-First* en campo.\n` +
                      `2. O envía reportes directos en este chat con:\n` +
                      `   \`/reportar CODIGO | AVANCE% | NOTAS\``;
    } else if (role === 'supervisor') {
      confirmation += `🔔 Recibirás *alertas instantáneas* con la hora real de campo vs la hora de sincronización.\n` +
                      `Puedes crear proyectos con:\n\`/nuevo_proyecto COD | NOMBRE | DESC\``;
    } else {
      confirmation += `📈 Consulta avances globales con \`/proyectos\` y fichas con \`/avance <CODIGO>\`.`;
    }

    const appUrl = getWebAppUrl();
    botInstance.sendMessage(chatId, confirmation, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 ABRIR TELEGRAM MINI APP', web_app: { url: appUrl } }]
        ]
      }
    });
  } catch (err) {
    console.error('Error registrando rol:', err);
    botInstance.sendMessage(chatId, '❌ Error al guardar tu rol.');
  }
}

// Enviar lista de proyectos
async function sendProjectsList(chatId, botInstance) {
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
                  `📍 *Ubicación:* ${p.location || 'N/A'}\n` +
                  `📈 *Avance:* ${bar} *${p.progress_percent || 0}%*\n` +
                  `📝 *Reportes:* ${p.total_reports}\n` +
                  `🔍 Ficha: \`/avance ${p.code}\`\n\n`;
    });

    const appUrl = getWebAppUrl();
    botInstance.sendMessage(chatId, response, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Abrir Mini App', web_app: { url: appUrl } }]
        ]
      }
    });
  } catch (err) {
    botInstance.sendMessage(chatId, '❌ Error al listar proyectos.');
  }
}

// Enviar mensaje de ayuda
function sendHelpMessage(chatId, botInstance) {
  const appUrl = getWebAppUrl();
  const helpText = 
    `📖 *GUÍA DE TELEGRAM MINI APP & BOT*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📱 *TELEGRAM MINI APP OFFLINE-FIRST*\n` +
    `Presiona el botón *Mini App* para abrir la app interactiva táctil. Funciona aunque pierdas señal en campo y sincroniza al volver a tener internet.\n\n` +
    `🛠️ *COMANDOS OPERADOR:*\n` +
    `• \`/reportar CODIGO | % | NOTAS\` - Registrar reporte directo en chat (Ej: \`/reportar PRJ-001 | 15 | Zanja terminada\`)\n\n` +
    `👷 *COMANDOS SUPERVISOR:*\n` +
    `• \`/rol supervisor\` - Activar alertas de reportes sincronizados.\n` +
    `• \`/nuevo_proyecto COD | NOM | DESC | UBIC\` - Crear proyecto.\n\n` +
    `📊 *COMANDOS LÍDER:*\n` +
    `• \`/rol lider\` - Registrarse como líder.\n` +
    `• \`/proyectos\` - Avance consolidado.\n` +
    `• \`/avance COD\` - Detalle y últimos reportes de un proyecto.`;

  botInstance.sendMessage(chatId, helpText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 ABRIR MINI APP AHORA', web_app: { url: appUrl } }]
      ]
    }
  });
}

// Función para notificar a los supervisores y líderes cuando se sincroniza un reporte
async function notifyReportSynced(reportData) {
  if (!bot) return { success: false, error: 'Bot no inicializado' };

  try {
    const subscribers = await all(`SELECT * FROM telegram_subscribers WHERE is_active = 1`);
    if (!subscribers || subscribers.length === 0) return { success: true, count: 0 };

    const message = 
      `🚨 *NUEVO REPORTE DE CAMPO (SINCRONIZADO)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📁 *Proyecto:* [${reportData.project_code || 'PRJ'}] ${reportData.project_name}\n` +
      `📌 *Actividad:* ${reportData.task_name || 'General'}\n` +
      `👷 *Operador:* *${reportData.operator_name}*\n` +
      `📈 *Avance Reportado:* *+${reportData.advance_percent}%* (Total: ${reportData.new_total_progress || reportData.advance_percent}%)\n\n` +
      `⏱️ *Capturado en campo (OFFLINE):*\n` +
      `   👉 \`${reportData.offline_created_at}\` *(Hora real inmutable)*\n\n` +
      `🔄 *Sincronizado en servidor:*\n` +
      `   👉 \`${reportData.synced_at || new Date().toISOString()}\`\n\n` +
      `💬 *Observaciones:* \n` +
      `_${reportData.notes || 'Sin observaciones adicionales'}_`;

    let sentCount = 0;
    for (const sub of subscribers) {
      try {
        await bot.sendMessage(sub.chat_id, message, { parse_mode: 'Markdown' });
        sentCount++;
      } catch (sendErr) {
        console.error(`Error enviando a chat ${sub.chat_id}:`, sendErr.message);
      }
    }

    return { success: true, count: sentCount };
  } catch (error) {
    console.error('Error al notificar reporte por telegram:', error);
    return { success: false, error: error.message };
  }
}

function createProgressBar(percent) {
  const totalBars = 10;
  const filled = Math.min(Math.max(Math.round((percent / 100) * totalBars), 0), totalBars);
  const empty = totalBars - filled;
  return '`[' + '█'.repeat(filled) + '░'.repeat(empty) + ']`';
}

function formatLocalTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getBotInstance() { return bot; }

function getBotStatus() {
  return {
    isConfigured: !!currentToken,
    hasActiveBot: !!bot,
    tokenMasked: currentToken ? currentToken.slice(0, 6) + '...' + currentToken.slice(-4) : null,
    webAppUrl: getWebAppUrl()
  };
}

module.exports = {
  initTelegramBot,
  notifyReportSynced,
  getBotInstance,
  getBotStatus
};
