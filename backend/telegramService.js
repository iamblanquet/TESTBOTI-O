const TelegramBot = require('node-telegram-bot-api');
const { run, get, all } = require('./database');
const { parseDailyReport } = require('./parser');

let bot = null;
let currentToken = null;
let isWebhookMode = false;

function getWebAppUrl() {
  return process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || 'https://testboti-o.onrender.com';
}

// Inicializar el bot (soporta Webhook en Render y Polling en Local)
async function initTelegramBot(token, expressApp = null) {
  if (!token || token.trim() === '' || token.includes('TU_TELEGRAM_BOT_TOKEN_AQUI')) {
    console.log('⚠️ [Telegram Bot AGROK] Sin token configurado.');
    return null;
  }

  try {
    if (bot) {
      try {
        if (!isWebhookMode) bot.stopPolling();
      } catch (e) {}
      bot = null;
    }

    currentToken = token.trim();
    const appUrl = getWebAppUrl();
    const isProduction = process.env.NODE_ENV === 'production' || (appUrl && appUrl.startsWith('https://'));

    if (isProduction) {
      // MODO WEBHOOK PARA RENDER (Evita 409 Conflict)
      console.log('🌐 [Telegram Bot AGROK] Configurando en MODO WEBHOOK para:', appUrl);
      isWebhookMode = true;
      bot = new TelegramBot(currentToken);

      const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
      try {
        await bot.setWebHook(webhookUrl);
        console.log(`✅ [Telegram Bot AGROK] Webhook activo en: ${webhookUrl}`);
      } catch (whErr) {
        console.error('⚠️ [Telegram Bot AGROK] Error configurando Webhook:', whErr.message);
      }
    } else {
      // MODO POLLING PARA LOCAL
      console.log('🔄 [Telegram Bot AGROK] Configurando en MODO POLLING local...');
      isWebhookMode = false;
      bot = new TelegramBot(currentToken, { polling: false });

      // Eliminar webhook previo para evitar error 409
      try {
        await bot.deleteWebHook();
      } catch (e) {}

      bot.startPolling();
      console.log('🤖 [Telegram Bot AGROK] Polling local iniciado.');
    }

    bot.on('polling_error', (error) => {
      // Ignorar o silenciar conflicto 409 temporal de reconexión
      if (error.message && error.message.includes('409 Conflict')) {
        console.warn('ℹ️ [Telegram Bot AGROK] 409 Conflict temporal resuelto.');
      } else {
        console.error('❌ [Telegram Bot AGROK] Error de polling:', error.code, error.message);
      }
    });

    setupBotHandlers(bot);

    bot.getMe().then((me) => {
      console.log(`✅ [Telegram Bot AGROK] Conectado como @${me.username} (${me.first_name})`);
      
      // Configurar Botón de Menú de Mini App
      if (appUrl && appUrl.startsWith('https://')) {
        bot.setChatMenuButton({
          menu_button: {
            type: 'web_app',
            text: '🌾 AGROK App',
            web_app: { url: appUrl }
          }
        }).catch(() => {});
      }
    }).catch(err => {
      console.error('❌ [Telegram Bot AGROK] Error getMe:', err.message);
    });

    return bot;
  } catch (error) {
    console.error('❌ [Telegram Bot AGROK] Error init:', error.message);
    return null;
  }
}

// Configurar Comandos y Respuestas del Bot
function setupBotHandlers(botInstance) {
  // 1. /start
  botInstance.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const firstName = msg.chat.first_name || 'Colega';
    const appUrl = getWebAppUrl();

    const welcomeMsg = 
      `🌾 *¡Hola, ${firstName}! Bienvenido a AGROK · Sistema de Campo.*\n\n` +
      `📱 *Toda la plataforma vive dentro de la nueva Telegram Mini App*:\n` +
      `• 🛠️ *Cuadrilla / Operadores:* Captura de avances con soporte Offline-First.\n` +
      `• 📋 *Tablero de Supervisión:* 4 widgets canónicos en tiempo real.\n` +
      `• 🚜 *Maquinaria & Horómetros:* Alertas y control de combustible.\n` +
      `• ⚠️ *Incidencias:* Registro y cierre con Causa Raíz.\n\n` +
      `👇 *Toca el botón abajo para abrir la Mini App:*`;

    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌾 ABRIR MINI APP AGROK', web_app: { url: appUrl } }],
          [
            { text: '🛠️ Rol Campo', callback_data: 'role_campo' },
            { text: '👷 Rol Supervisor', callback_data: 'role_supervisor' },
            { text: '📊 Rol Dirección', callback_data: 'role_gerencia' }
          ],
          [
            { text: '📌 Tablero Hoy (/tablero)', callback_data: 'cmd_tablero' },
            { text: '📖 Ayuda (/ayuda)', callback_data: 'cmd_ayuda' }
          ]
        ]
      }
    };

    botInstance.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown', ...inlineKeyboard });
  });

  // 2. Callbacks de botones inline
  botInstance.on('callback_query', async (cq) => {
    const chatId = cq.message.chat.id.toString();
    const data = cq.data;
    const username = cq.from.username || '';
    const firstName = cq.from.first_name || '';

    if (data.startsWith('role_')) {
      const role = data.replace('role_', '');
      await registerSubscriber(chatId, username, firstName, role, botInstance);
    } else if (data === 'cmd_tablero') {
      sendTableroMessage(chatId, botInstance);
    } else if (data === 'cmd_ayuda') {
      sendHelpMessage(chatId, botInstance);
    } else if (data.startsWith('confirm_rep_')) {
      const repId = data.replace('confirm_rep_', '');
      await run("UPDATE reporte SET estado = 'confirmado' WHERE id = ?", [repId]);
      botInstance.editMessageText(`✅ *Reporte #${repId} confirmado exitosamente.*`, {
        chat_id: chatId,
        message_id: cq.message.message_id,
        parse_mode: 'Markdown'
      });
    }

    botInstance.answerCallbackQuery(cq.id);
  });

  // 3. /rol [campo | supervisor | gerencia | direccion | it]
  botInstance.onText(/\/rol\s+(.+)/i, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const roleInput = match[1].toLowerCase().trim();
    const username = msg.chat.username || '';
    const firstName = msg.chat.first_name || '';

    let role = 'campo';
    if (roleInput.includes('super')) role = 'supervisor';
    else if (roleInput.includes('geren') || roleInput.includes('lid')) role = 'gerencia';
    else if (roleInput.includes('direc')) role = 'direccion';
    else if (roleInput.includes('it')) role = 'it';

    await registerSubscriber(chatId, username, firstName, role, botInstance);
  });

  // 4. /reporte o Bloque de Texto Diario del 11 de Mayo
  botInstance.onText(/(?:\/reporte\s*([\s\S]*)|(?:\*?Obra:\*?[\s\S]+))/i, async (msg, match) => {
    const textToParse = match[1] ? match[1] : msg.text;
    if (!textToParse || textToParse.trim().length < 10) return;
    await handleDailyReportMessage(msg, textToParse, botInstance);
  });

  // 5. /sin_actividad [motivo]
  botInstance.onText(/\/sin_actividad(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const threadId = msg.message_thread_id;
    const motivo = match[1] ? match[1].trim().toLowerCase() : 'lluvia';
    const authorName = getAuthorName(msg);

    let obra = null;
    if (threadId) obra = await get('SELECT * FROM obra WHERE tg_thread_id = ?', [threadId]);
    if (!obra) obra = await get('SELECT * FROM obra WHERE estado = "operacion" LIMIT 1');

    const now = new Date();
    const nowIso = now.toISOString();
    const fechaOp = formatYMD(now);

    await run(`
      INSERT INTO reporte (
        client_uuid, obra_id, recibido_en, fecha_operativa, autor_nombre,
        texto_original, nota, estado, es_sin_actividad, motivo_sin_actividad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmado', 1, ?)
    `, [
      `tg-sin-act-${Date.now()}`,
      obra ? obra.id : 'guayeme',
      nowIso,
      fechaOp,
      authorName,
      `/sin_actividad ${motivo}`,
      `Sin actividad: ${motivo}`,
      motivo
    ]);

    const reply = `🌧️ *Sin actividad registrada*\n` +
                  `📁 *Obra:* ${obra ? obra.nombre : 'Guayeme'}\n` +
                  `📅 *Fecha:* ${fechaOp}\n` +
                  `⚠️ *Motivo:* ${motivo}\n` +
                  `👤 *Registrado por:* ${authorName}`;

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      message_thread_id: threadId,
      reply_markup: {
        inline_keyboard: [[{ text: '🌾 Ver en Mini App', web_app: { url: getWebAppUrl() } }]]
      }
    });
  });

  // 6. /incidencia [tipo] [descripcion]
  botInstance.onText(/\/incidencia(?:\s+(\w+)\s+([\s\S]+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const threadId = msg.message_thread_id;
    const authorName = getAuthorName(msg);

    if (!match[1] || !match[2]) {
      return botInstance.sendMessage(
        chatId,
        `⚠️ *Formato:* \`/incidencia [TIPO] [DESCRIPCIÓN]\`\n*Ejemplo:* \`/incidencia falla_mecanica Bulldozer D6 se sobrecalienta\``,
        { parse_mode: 'Markdown', message_thread_id: threadId }
      );
    }

    const tipo = match[1].toLowerCase();
    const descripcion = match[2].trim();

    let obra = null;
    if (threadId) obra = await get('SELECT * FROM obra WHERE tg_thread_id = ?', [threadId]);
    if (!obra) obra = await get('SELECT * FROM obra WHERE estado = "operacion" LIMIT 1');

    const countInc = (await get('SELECT COUNT(*) as c FROM incidencia')).c + 15;
    const folio = `F-${countInc}`;
    const nowIso = new Date().toISOString();

    await run(`
      INSERT INTO incidencia (folio, tipo, obra_id, estado, abierta_en, descripcion)
      VALUES (?, ?, ?, 'abierta', ?, ?)
    `, [folio, tipo, obra ? obra.id : 'guayeme', nowIso, descripcion]);

    await run(`
      INSERT INTO incidencia_evento (folio, fecha, autor_nombre, texto, estado_resultante)
      VALUES (?, ?, ?, ?, 'abierta')
    `, [folio, nowIso, authorName, descripcion]);

    const reply = `🚨 *INCIDENCIA REGISTRADA [${folio}]*\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `📁 *Obra:* ${obra ? obra.nombre : 'Guayeme'}\n` +
                  `🏷️ *Tipo:* \`${tipo}\`\n` +
                  `📝 *Detalle:* ${descripcion}\n` +
                  `👤 *Reportó:* ${authorName}\n\n` +
                  `_Para cerrar cuando se solucione:_\n\`/cerrar ${folio} [Causa raíz obligatoria]\``;

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      message_thread_id: threadId,
      reply_markup: {
        inline_keyboard: [[{ text: '🌾 Ver en Mini App', web_app: { url: getWebAppUrl() } }]]
      }
    });
  });

  // 7. /cerrar [folio] [causa_raiz]
  botInstance.onText(/\/cerrar\s+([A-Za-z0-9\-]+)\s+([\s\S]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const threadId = msg.message_thread_id;
    const folio = match[1].toUpperCase();
    const causaRaiz = match[2].trim();
    const authorName = getAuthorName(msg);

    const inc = await get('SELECT * FROM incidencia WHERE folio = ?', [folio]);
    if (!inc) return botInstance.sendMessage(chatId, `❌ Incidencia \`${folio}\` no encontrada.`);

    if (!causaRaiz || causaRaiz.length < 5) {
      return botInstance.sendMessage(chatId, `⚠️ *Regla AGROK:* Se requiere especificar la *Causa Raíz* para cerrar.`);
    }

    const nowIso = new Date().toISOString();
    await run("UPDATE incidencia SET estado = 'cerrada', cerrada_en = ?, causa_raiz = ? WHERE folio = ?", [nowIso, causaRaiz, folio]);
    await run("INSERT INTO incidencia_evento (folio, fecha, autor_nombre, texto, estado_resultante) VALUES (?, ?, ?, ?, 'cerrada')", [folio, nowIso, authorName, `Cierre: ${causaRaiz}`]);

    botInstance.sendMessage(chatId, `✅ *INCIDENCIA CERRADA [${folio}]*\n🔍 *Causa Raíz:* ${causaRaiz}\n👤 *Cerrada por:* ${authorName}`, {
      parse_mode: 'Markdown',
      message_thread_id: threadId
    });
  });

  // 8. /horometro [maquina] [inicio] [fin] [litros]
  botInstance.onText(/\/horometro(?:\s+([\s\S]+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const threadId = msg.message_thread_id;
    const content = match[1] ? match[1].trim() : '';

    if (!content) {
      return botInstance.sendMessage(
        chatId,
        `🚜 *Formato:* \`/horometro [MAQUINA] [INICIO] [FIN] [LITROS]\`\n*Ejemplo:* \`/horometro Puma 1280.5 1288.2 60\``,
        { parse_mode: 'Markdown', message_thread_id: threadId }
      );
    }

    const parts = content.split(/\s+/);
    const maqQuery = parts[0];
    const hInicio = parseFloat(parts[1]) || 0;
    const hFin = parseFloat(parts[2]) || 0;
    const litros = parts[3] ? parseFloat(parts[3]) : 0;
    const horas = Math.max(0, Math.round((hFin - hInicio) * 10) / 10);
    const authorName = getAuthorName(msg);

    const maquina = await get('SELECT * FROM maquina WHERE id LIKE ? OR nombre LIKE ? LIMIT 1', [`%${maqQuery}%`, `%${maqQuery}%`]);
    if (!maquina) return botInstance.sendMessage(chatId, `❌ Máquina "*${maqQuery}*" no encontrada.`);

    const nowIso = new Date().toISOString();
    await run(`
      INSERT INTO lectura_maquina (maquina_id, fecha, autor_nombre, horometro_inicio, horometro_fin, horas_trabajadas, litros)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [maquina.id, nowIso, authorName, hInicio, hFin, horas, litros]);

    await run('UPDATE maquina SET horometro_actual = ? WHERE id = ?', [hFin, maquina.id]);
    const horasParaServicio = Math.max(0, Math.round(((maquina.umbral_servicio_hrs || 300) - (hFin % 300)) * 10) / 10);

    let reply = `🚜 *LECTURA REGISTRADA*\n` +
                `🚜 *Máquina:* ${maquina.nombre}\n` +
                `⏱️ *Horas:* ${hInicio} ➔ ${hFin} (*${horas} hrs*)\n` +
                `⛽ *Combustible:* ${litros} L\n` +
                `🔧 *Mantenimiento:* ${horasParaServicio} hrs para servicio`;

    if (horasParaServicio <= 20) reply += `\n⚠️ *ALERTA: Próximo a umbral de servicio.*`;

    botInstance.sendMessage(chatId, reply, { parse_mode: 'Markdown', message_thread_id: threadId });
  });

  // 9. /tablero
  botInstance.onText(/\/tablero/, (msg) => {
    sendTableroMessage(msg.chat.id, botInstance);
  });

  // 10. /avance [obra]
  botInstance.onText(/\/avance(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1] ? match[1].trim() : null;

    let obra = null;
    if (query) {
      obra = await get('SELECT * FROM obra WHERE id LIKE ? OR nombre LIKE ? LIMIT 1', [`%${query}%`, `%${query}%`]);
    } else if (msg.message_thread_id) {
      obra = await get('SELECT * FROM obra WHERE tg_thread_id = ?', [msg.message_thread_id]);
    }

    if (!obra) {
      const obras = await all('SELECT * FROM obra WHERE estado = "operacion"');
      let resp = `📊 *AVANCE DE OBRAS ACTIVAS*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      for (const o of obras) {
        const campoHa = (await get(`
          SELECT COALESCE(SUM(l.cantidad_ha), 0) as total FROM reporte_linea l 
          JOIN reporte r ON l.reporte_id = r.id WHERE r.obra_id = ?
        `, [o.id])).total;
        resp += `📁 *${o.nombre}:* ${campoHa} ha (Fase: \`${o.fase_actual}\`)\n`;
      }
      return botInstance.sendMessage(chatId, resp, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🌾 Ver en Mini App', web_app: { url: getWebAppUrl() } }]] }
      });
    }

    const predios = await all(`
      SELECT p.* FROM predio p JOIN obra_predio op ON p.id = op.predio_id WHERE op.obra_id = ?
    `, [obra.id]);

    let reply = `📁 *AVANCE: ${obra.nombre}*\n📍 *Fase:* \`${obra.fase_actual}\`\n\n`;
    for (const p of predios) {
      const campoHa = (await get(`
        SELECT COALESCE(SUM(l.cantidad_ha), 0) as total FROM reporte_linea l 
        JOIN reporte r ON l.reporte_id = r.id WHERE r.obra_id = ? AND l.predio_id = ?
      `, [obra.id, p.id])).total;
      reply += `• *${p.nombre}:* ${campoHa} ha\n`;
    }

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🌾 Ver en Mini App', web_app: { url: getWebAppUrl() } }]] }
    });
  });

  // 11. /pendientes y /hoy
  botInstance.onText(/\/pendientes/, async (msg) => {
    const chatId = msg.chat.id;
    const abiertas = await all(`
      SELECT i.*, o.nombre as obra_nombre FROM incidencia i 
      JOIN obra o ON i.obra_id = o.id WHERE i.estado != 'cerrada'
    `);
    if (abiertas.length === 0) return botInstance.sendMessage(chatId, '✅ No hay incidencias abiertas.');

    let resp = `⚠️ *INCIDENCIAS ABIERTAS (${abiertas.length})*\n\n`;
    abiertas.forEach(i => {
      resp += `• *[${i.folio}]* ${i.descripcion} (${i.obra_nombre})\n`;
    });
    botInstance.sendMessage(chatId, resp, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🌾 Ver en Mini App', web_app: { url: getWebAppUrl() } }]] }
    });
  });

  botInstance.onText(/\/hoy/, async (msg) => {
    const chatId = msg.chat.id;
    const today = formatYMD(new Date());
    const reportesHoy = await all('SELECT * FROM reporte WHERE fecha_operativa = ?', [today]);
    botInstance.sendMessage(chatId, `📅 *Reportes del día (${today}):* ${reportesHoy.length} registrados.`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🌾 Ver en Mini App', web_app: { url: getWebAppUrl() } }]] }
    });
  });

  // 12. /ayuda
  botInstance.onText(/\/ayuda/, (msg) => {
    sendHelpMessage(msg.chat.id, botInstance);
  });
}

// Procesar Reporte Diario de Campo
async function handleDailyReportMessage(msg, text, botInstance) {
  const chatId = msg.chat.id;
  const threadId = msg.message_thread_id;
  const authorName = getAuthorName(msg);
  const receivedDate = new Date(msg.date * 1000);

  let threadObraId = null;
  if (threadId) {
    const ob = await get('SELECT id FROM obra WHERE tg_thread_id = ?', [threadId]);
    if (ob) threadObraId = ob.id;
  }

  const parsed = parseDailyReport(text, receivedDate, threadObraId);
  const obraId = parsed.obra_id || 'guayeme';
  const obra = await get('SELECT * FROM obra WHERE id = ?', [obraId]) || { nombre: 'Guayeme' };

  const insertRep = await run(`
    INSERT INTO reporte (
      client_uuid, obra_id, recibido_en, fecha_operativa, autor_nombre,
      tg_chat_id, tg_message_id, texto_original, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado')
  `, [
    `tg-rep-${Date.now()}-${msg.message_id}`,
    obraId,
    receivedDate.toISOString(),
    parsed.fecha_operativa,
    authorName,
    chatId,
    msg.message_id,
    text
  ]);

  const reporteId = insertRep.id;

  for (const c of parsed.cuadrilla) {
    await run("INSERT INTO reporte_cuadrilla (reporte_id, rol_id, headcount) VALUES (?, ?, ?)", [reporteId, c.rol_id, c.headcount]);
  }

  for (const a of parsed.avances) {
    await run(`
      INSERT INTO reporte_linea (reporte_id, predio_id, actividad_id, texto, cantidad, unidad, cantidad_ha, fuente)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'campo')
    `, [reporteId, a.predio_id || 'guayeme', parsed.actividades[0]?.actividad_id || 'siembra', a.texto, a.cantidad, a.unidad, a.cantidad_ha]);
  }

  const confirmMsg = 
    `✅ *Reporte · ${obra.nombre} · ${parsed.fecha_operativa} · ${authorName}*\n\n` +
    `👥 *Cuadrilla:* ${parsed.cuadrilla.map(c => `${c.rol_texto || c.rol_id} ${c.headcount}`).join(' · ') || 'N/A'}\n` +
    `🌾 *Actividades:* ${parsed.actividades.map(a => a.actividad_id).join(' · ') || 'N/A'}\n` +
    `📈 *Avance:* ${parsed.avances.map(a => `${a.predio_id || 'Predio'} ${a.cantidad} ${a.unidad}`).join(' · ') || 'Registrado'}\n\n` +
    `_Guardado en la base de datos central AGROK._`;

  botInstance.sendMessage(chatId, confirmMsg, {
    parse_mode: 'Markdown',
    message_thread_id: threadId,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌾 Ver en Mini App', web_app: { url: getWebAppUrl() } }]
      ]
    }
  });
}

async function sendTableroMessage(chatId, botInstance) {
  const today = formatYMD(new Date());
  const obrasOperacion = await all('SELECT * FROM obra WHERE estado = "operacion"');
  const reportesHoy = await all('SELECT obra_id FROM reporte WHERE fecha_operativa = ?', [today]);
  const reportedIds = new Set(reportesHoy.map(r => r.obra_id));
  const sinReporte = obrasOperacion.filter(o => !reportedIds.has(o.id));

  const incidenciasAbiertas = await all("SELECT * FROM incidencia WHERE estado != 'cerrada'");
  const materialesFaltantes = await all("SELECT * FROM material WHERE (requerido - en_sitio) > 0");

  let msg = `🌾 *AGROK · TABLERO GENERAL · ${today}*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `🔴 *Sin reporte hoy:* ${sinReporte.length} obra(s)\n`;
  msg += `⚠️ *Incidencias abiertas:* ${incidenciasAbiertas.length}\n`;
  msg += `📦 *Bloqueado por material:* ${materialesFaltantes.length} insumos\n\n` +
         `_Toca abajo para abrir el Tablero Interactivo con los 4 widgets:_`;

  botInstance.sendMessage(chatId, msg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌾 ABRIR TABLERO EN MINI APP', web_app: { url: getWebAppUrl() } }]
      ]
    }
  });
}

function sendHelpMessage(chatId, botInstance) {
  botInstance.sendMessage(
    chatId,
    `📖 *AGROK · MINI APP & BOT*\n\nToda la plataforma vive dentro de la Mini App. Puedes abrirla directamente con el botón de abajo o usar comandos rápidos: \`/reporte\`, \`/sin_actividad\`, \`/incidencia\`, \`/cerrar\`, \`/horometro\`, \`/tablero\`.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🌾 ABRIR MINI APP AGROK', web_app: { url: getWebAppUrl() } }]]
      }
    }
  );
}

async function registerSubscriber(chatId, username, firstName, role, botInstance) {
  try {
    await run(`
      INSERT INTO telegram_subscribers (chat_id, username, first_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(chat_id) DO UPDATE SET role = ?, is_active = 1, username = ?, first_name = ?
    `, [chatId, username, firstName, role, role, username, firstName]);

    botInstance.sendMessage(chatId, `✅ *Registrado como ${role.toUpperCase()}*.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🌾 ABRIR MINI APP AGROK', web_app: { url: getWebAppUrl() } }]]
      }
    });
  } catch (e) {}
}

function getAuthorName(msg) {
  return [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(' ') || msg.chat.username || 'Operador AGROK';
}

function formatYMD(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getBotInstance() { return bot; }

function getBotStatus() {
  return {
    isConfigured: !!currentToken,
    hasActiveBot: !!bot,
    isWebhookMode,
    tokenMasked: currentToken ? currentToken.slice(0, 6) + '...' + currentToken.slice(-4) : null,
    webAppUrl: getWebAppUrl()
  };
}

module.exports = {
  initTelegramBot,
  getBotInstance,
  getBotStatus
};
