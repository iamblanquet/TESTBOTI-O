const TelegramBot = require('node-telegram-bot-api');
const { run, get, all } = require('./database');
const { parseDailyReport } = require('./parser');

let bot = null;
let currentToken = null;

function getWebAppUrl() {
  return process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || 'https://testboti-o.onrender.com';
}

function getPersistentMenuKeyboard(appUrl) {
  return {
    keyboard: [
      [{ text: '🌾 ABRIR MINI APP AGROK', web_app: { url: appUrl } }],
      [{ text: '📊 Tablero Hoy' }, { text: '⚠️ Incidencias' }],
      [{ text: '🚜 Horómetro' }, { text: '🌧️ Sin Actividad' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

function getInlineWebAppButton(appUrl) {
  return {
    inline_keyboard: [
      [{ text: '🌾 ABRIR MINI APP AGROK', web_app: { url: appUrl } }]
    ]
  };
}

async function initTelegramBot(token, expressApp = null) {
  if (!token || token.trim() === '' || token.includes('TU_TELEGRAM_BOT_TOKEN_AQUI')) {
    console.log('⚠️ [Telegram Bot AGROK] Sin token configurado.');
    return null;
  }

  try {
    if (bot) {
      try {
        bot.stopPolling();
      } catch (e) {}
      bot = null;
    }

    currentToken = token.trim();
    console.log('🤖 [Telegram Bot AGROK] Inicializando bot con Mini App oficial...');

    bot = new TelegramBot(currentToken, {
      polling: {
        autoStart: false,
        params: { timeout: 10 }
      }
    });

    try {
      await bot.deleteWebHook();
      console.log('🧹 [Telegram Bot AGROK] Webhook previo limpiado.');
    } catch (whErr) {
      console.log('ℹ️ [Telegram Bot AGROK] Info webhook:', whErr.message);
    }

    bot.startPolling();
    console.log('✅ [Telegram Bot AGROK] Polling iniciado activamente.');

    bot.on('polling_error', (error) => {
      if (error.message && error.message.includes('409 Conflict')) return;
      console.error('⚠️ [Telegram Bot AGROK] Polling error:', error.code, error.message);
    });

    setupBotHandlers(bot);

    bot.getMe().then(async (me) => {
      console.log(`🎉 [Telegram Bot AGROK] Conectado como @${me.username} (${me.first_name})`);
      
      const appUrl = getWebAppUrl();
      if (appUrl && appUrl.startsWith('https://')) {
        try {
          await bot.setChatMenuButton({
            menu_button: {
              type: 'web_app',
              text: '🌾 AGROK Mini App',
              web_app: { url: appUrl }
            }
          });
          console.log('📱 [Telegram Bot AGROK] Menu Button oficial configurado.');
        } catch (e) {}
      }
    }).catch(err => {
      console.error('❌ [Telegram Bot AGROK] Error conectando a Telegram:', err.message);
    });

    return bot;
  } catch (error) {
    console.error('❌ [Telegram Bot AGROK] Error en initTelegramBot:', error.message);
    return null;
  }
}

function setupBotHandlers(botInstance) {
  const appUrl = getWebAppUrl();

  // 1. /start y /menu
  botInstance.onText(/\/(?:start|menu)/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const firstName = msg.chat.first_name || 'Colega';

    try {
      await botInstance.setChatMenuButton({
        chat_id: msg.chat.id,
        menu_button: {
          type: 'web_app',
          text: '🌾 AGROK Mini App',
          web_app: { url: appUrl }
        }
      });
    } catch (e) {}

    const welcomeMsg = 
      `🌾 *¡Hola, ${firstName}! Bienvenido a AGROK · Sistema de Campo.*\n\n` +
      `📱 *La aplicación completa está disponible en tu Telegram:*\n` +
      `• 🛠️ *Campo:* Reportes con Hitos y Tareas (100% Offline-First).\n` +
      `• 📋 *Gerencia:* Tablero Operativo de 4 widgets en tiempo real.\n` +
      `• 📊 *Dirección:* Avance consolidado vs Mediciones de Dron.\n\n` +
      `👇 *Toca el botón abajo para abrir la Mini App:*`;

    botInstance.sendMessage(chatId, welcomeMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌾 ABRIR MINI APP AGROK', web_app: { url: appUrl } }]
        ]
      }
    });

    // Enviar teclado persistente de soporte
    botInstance.sendMessage(chatId, `_Usa el menú rápido en tu teclado o el botón de menú para navegar:_`, {
      parse_mode: 'Markdown',
      reply_markup: getPersistentMenuKeyboard(appUrl)
    });
  });

  // 2. Acciones del menú persistente en texto
  botInstance.onText(/📊 Tablero Hoy/i, (msg) => {
    sendTableroMessage(msg.chat.id, botInstance);
  });

  botInstance.onText(/⚠️ Incidencias/i, async (msg) => {
    const chatId = msg.chat.id;
    const abiertas = await all("SELECT i.*, o.nombre as obra_nombre FROM incidencia i JOIN obra o ON i.obra_id = o.id WHERE i.estado != 'cerrada'");
    if (abiertas.length === 0) {
      return botInstance.sendMessage(chatId, '✅ *Cero incidencias abiertas en este momento.*', {
        parse_mode: 'Markdown',
        reply_markup: getInlineWebAppButton(appUrl)
      });
    }

    let resp = `⚠️ *INCIDENCIAS ABIERTAS (${abiertas.length})*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    abiertas.forEach(i => {
      resp += `• *[${i.folio}]* ${i.descripcion} (${i.obra_nombre})\n`;
    });
    resp += `\n_Para cerrar con causa raíz obligatoria:_\n\`/cerrar [FOLIO] [Causa raíz]\``;

    botInstance.sendMessage(chatId, resp, {
      parse_mode: 'Markdown',
      reply_markup: getInlineWebAppButton(appUrl)
    });
  });

  botInstance.onText(/🚜 Horómetro/i, (msg) => {
    botInstance.sendMessage(
      msg.chat.id,
      `🚜 *Registro de Horómetro Rápido*\n\nUsa el formato:\n\`/horometro [MAQUINA] [INICIO] [FIN] [LITROS]\`\n\n*Ejemplo:* \`/horometro Puma 1280.5 1288.2 60\``,
      { parse_mode: 'Markdown', reply_markup: getInlineWebAppButton(appUrl) }
    );
  });

  botInstance.onText(/🌧️ Sin Actividad/i, (msg) => {
    botInstance.sendMessage(
      msg.chat.id,
      `🌧️ *Registrar Día Sin Actividad*\n\nUsa el formato:\n\`/sin_actividad [MOTIVO]\`\n\n*Motivos válidos:* \`lluvia\`, \`sin_material\`, \`sin_cuadrilla\`, \`sin_maquina\`, \`descanso\``,
      { parse_mode: 'Markdown', reply_markup: getInlineWebAppButton(appUrl) }
    );
  });

  // 3. /reporte o Bloque de Texto Diario
  botInstance.onText(/(?:\/reporte\s*([\s\S]*)|(?:\*?Obra:\*?[\s\S]+))/i, async (msg, match) => {
    const textToParse = match[1] ? match[1] : msg.text;
    if (!textToParse || textToParse.trim().length < 10) return;
    await handleDailyReportMessage(msg, textToParse, botInstance);
  });

  // 4. /sin_actividad [motivo]
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
      reply_markup: getInlineWebAppButton(appUrl)
    });
  });

  // 5. /incidencia [tipo] [descripcion]
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
                  `_Para cerrar:_\n\`/cerrar ${folio} [Causa raíz obligatoria]\``;

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      message_thread_id: threadId,
      reply_markup: getInlineWebAppButton(appUrl)
    });
  });

  // 6. /cerrar [folio] [causa_raiz]
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
      message_thread_id: threadId,
      reply_markup: getInlineWebAppButton(appUrl)
    });
  });

  // 7. /horometro [maquina] [inicio] [fin] [litros]
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

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      message_thread_id: threadId,
      reply_markup: getInlineWebAppButton(appUrl)
    });
  });

  // 8. /tablero
  botInstance.onText(/\/tablero/, (msg) => {
    sendTableroMessage(msg.chat.id, botInstance);
  });

  // 9. /avance [obra]
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
        reply_markup: getInlineWebAppButton(appUrl)
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
      reply_markup: getInlineWebAppButton(appUrl)
    });
  });

  // 10. /ayuda
  botInstance.onText(/\/ayuda/, (msg) => {
    sendHelpMessage(msg.chat.id, botInstance);
  });
}

async function handleDailyReportMessage(msg, text, botInstance) {
  const chatId = msg.chat.id;
  const threadId = msg.message_thread_id;
  const authorName = getAuthorName(msg);
  const receivedDate = new Date(msg.date * 1000);
  const appUrl = getWebAppUrl();

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
    reply_markup: getInlineWebAppButton(appUrl)
  });
}

async function sendTableroMessage(chatId, botInstance) {
  const appUrl = getWebAppUrl();
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
         `_Abre la Mini App para ver el tablero interactivo:_`;

  botInstance.sendMessage(chatId, msg, {
    parse_mode: 'Markdown',
    reply_markup: getInlineWebAppButton(appUrl)
  });
}

function sendHelpMessage(chatId, botInstance) {
  const appUrl = getWebAppUrl();
  botInstance.sendMessage(
    chatId,
    `📖 *AGROK · COMANDOS RÁPIDOS*\n\n• \`/reporte\` - Enviar reporte diario\n• \`/sin_actividad [motivo]\` - Registrar lluvia/descanso\n• \`/incidencia [tipo] [desc]\` - Reportar problema\n• \`/cerrar [folio] [causa]\` - Cerrar incidencia con causa raíz\n• \`/horometro [maq] [ini] [fin] [L]\` - Registrar horas de máquina\n• \`/tablero\` - Ver resumen del día\n\n_O toca "🌾 ABRIR MINI APP AGROK" abajo:_`,
    { parse_mode: 'Markdown', reply_markup: getInlineWebAppButton(appUrl) }
  );
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
    tokenMasked: currentToken ? currentToken.slice(0, 6) + '...' + currentToken.slice(-4) : null,
    webAppUrl: getWebAppUrl()
  };
}

module.exports = {
  initTelegramBot,
  getBotInstance,
  getBotStatus
};
