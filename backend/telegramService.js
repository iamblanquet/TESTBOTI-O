const TelegramBot = require('node-telegram-bot-api');
const { run, get, all } = require('./database');
const { parseDailyReport } = require('./parser');

let bot = null;
let currentToken = null;

function getWebAppUrl() {
  return process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || 'https://testboti-o.onrender.com';
}

function initTelegramBot(token) {
  if (!token || token.trim() === '' || token.includes('TU_TELEGRAM_BOT_TOKEN_AQUI')) {
    console.log('⚠️ [Telegram Bot AGROK] Sin token configurado.');
    return null;
  }

  try {
    if (bot) {
      bot.stopPolling();
      bot = null;
    }

    currentToken = token.trim();
    bot = new TelegramBot(currentToken, { polling: true });

    console.log('🤖 [Telegram Bot AGROK] Polling iniciado con éxito...');

    bot.on('polling_error', (error) => {
      console.error('❌ [Telegram Bot AGROK] Error de polling:', error.code, error.message);
    });

    setupBotHandlers(bot);

    bot.getMe().then((me) => {
      console.log(`✅ [Telegram Bot AGROK] Conectado como @${me.username} (${me.first_name})`);
      
      const appUrl = getWebAppUrl();
      if (appUrl && appUrl.startsWith('https://')) {
        bot.setChatMenuButton({
          menu_button: {
            type: 'web_app',
            text: '📱 AGROK App',
            web_app: { url: appUrl }
          }
        }).catch(err => {
          console.log('ℹ️ MenuButton:', err.message);
        });
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

function setupBotHandlers(botInstance) {
  // 1. /start
  botInstance.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const firstName = msg.chat.first_name || 'Colega';
    const appUrl = getWebAppUrl();

    const welcomeMsg = 
      `🌾 *¡Hola, ${firstName}! Bienvenido a AGROK · Sistema de Campo.*\n\n` +
      `Este bot gestiona los reportes diarios de campo, cuadrillas, maquinaria, incidencias y tableros operativos de las obras.\n\n` +
      `📱 *Puedes usar la Telegram Mini App* para capturar reportes con soporte *Offline-First* en campo, o enviar comandos por aquí.`;

    const inlineKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 ABRIR MINI APP AGROK', web_app: { url: appUrl } }],
          [
            { text: '🛠️ Soy Cuadrilla/Campo', callback_data: 'role_campo' },
            { text: '👷 Soy Supervisor', callback_data: 'role_supervisor' },
            { text: '📊 Soy Gerencia/Dirección', callback_data: 'role_gerencia' }
          ],
          [
            { text: '📌 Ver Tablero Hoy (/tablero)', callback_data: 'cmd_tablero' },
            { text: '📖 Guía de Comandos (/ayuda)', callback_data: 'cmd_ayuda' }
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

  // 4. /reporte o Pegado del Reporte Diario
  botInstance.onText(/(?:\/reporte\s*([\s\S]*)|(?:\*?Obra:\*?[\s\S]+))/i, async (msg, match) => {
    const textToParse = match[1] ? match[1] : msg.text;
    if (!textToParse || textToParse.trim().length < 10) return;

    await handleDailyReportMessage(msg, textToParse, botInstance);
  });

  // 5. /sin_actividad [motivo] (lluvia, sin_material, sin_cuadrilla, sin_maquina, descanso)
  botInstance.onText(/\/sin_actividad(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const threadId = msg.message_thread_id;
    const motivo = match[1] ? match[1].trim().toLowerCase() : 'lluvia';
    const authorName = getAuthorName(msg);

    let obra = null;
    if (threadId) {
      obra = await get('SELECT * FROM obra WHERE tg_thread_id = ?', [threadId]);
    }
    if (!obra) {
      obra = await get('SELECT * FROM obra WHERE estado = "operacion" LIMIT 1');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const fechaOp = formatYMD(now);

    const res = await run(`
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
      message_thread_id: threadId
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
        `⚠️ *Formato de incidencia:*\n\`/incidencia [TIPO] [DESCRIPCIÓN]\`\n\n` +
        `*Tipos válidos:* \`falla_mecanica\`, \`plaga\`, \`fuego\`, \`clima\`, \`conflicto_terceros\`, \`personal\`, \`seguridad_epp\`, \`desabasto_material\`\n\n` +
        `*Ejemplo:* \`/incidencia falla_mecanica Bulldozer D6 se sobrecalienta en jornada extendida\``,
        { parse_mode: 'Markdown', message_thread_id: threadId }
      );
    }

    const tipo = match[1].toLowerCase();
    const descripcion = match[2].trim();

    let obra = null;
    if (threadId) obra = await get('SELECT * FROM obra WHERE tg_thread_id = ?', [threadId]);
    if (!obra) obra = await get('SELECT * FROM obra WHERE estado = "operacion" LIMIT 1');

    // Generar Folio secuencial F-XX
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
                  `👤 *Reportó:* ${authorName}\n` +
                  `⏱️ *Estado:* \`abierta\`\n\n` +
                  `_Para cerrar cuando se solucione:_\n\`/cerrar ${folio} [Causa raíz obligatoria]\``;

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      message_thread_id: threadId
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
    if (!inc) {
      return botInstance.sendMessage(chatId, `❌ No se encontró la incidencia \`${folio}\`.`, {
        parse_mode: 'Markdown',
        message_thread_id: threadId
      });
    }

    if (!causaRaiz || causaRaiz.length < 5) {
      return botInstance.sendMessage(chatId, `⚠️ *Regla AGROK:* Se requiere especificar la *Causa Raíz* para poder cerrar una incidencia.`, {
        parse_mode: 'Markdown',
        message_thread_id: threadId
      });
    }

    const nowIso = new Date().toISOString();
    await run(`
      UPDATE incidencia 
      SET estado = 'cerrada', cerrada_en = ?, causa_raiz = ? 
      WHERE folio = ?
    `, [nowIso, causaRaiz, folio]);

    await run(`
      INSERT INTO incidencia_evento (folio, fecha, autor_nombre, texto, estado_resultante)
      VALUES (?, ?, ?, ?, 'cerrada')
    `, [folio, nowIso, authorName, `Cierre: ${causaRaiz}`]);

    const reply = `✅ *INCIDENCIA CERRADA [${folio}]*\n` +
                  `━━━━━━━━━━━━━━━━━━━━\n` +
                  `📁 *Obra:* ${inc.obra_id}\n` +
                  `🔍 *Causa Raíz:* ${causaRaiz}\n` +
                  `👤 *Cerrada por:* ${authorName}\n` +
                  `⏱️ *Fecha:* \`${formatYMD(new Date())}\``;

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      message_thread_id: threadId
    });
  });

  // 8. /verificar [folio]
  botInstance.onText(/\/verificar\s+([A-Za-z0-9\-]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const folio = match[1].toUpperCase();
    const inc = await get('SELECT * FROM incidencia WHERE folio = ?', [folio]);
    if (!inc) return botInstance.sendMessage(chatId, `❌ Incidencia \`${folio}\` no encontrada.`);

    await run("UPDATE incidencia SET estado = 'verificacion' WHERE folio = ?", [folio]);
    botInstance.sendMessage(chatId, `🔍 Incidencia *${folio}* pasada a estado \`verificación\`. El bot recordará en 7 días si sigue abierta.`, { parse_mode: 'Markdown' });
  });

  // 9. /horometro [maquina] [inicio] [fin] [litros]
  botInstance.onText(/\/horometro(?:\s+([\s\S]+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const threadId = msg.message_thread_id;
    const content = match[1] ? match[1].trim() : '';

    if (!content) {
      return botInstance.sendMessage(
        chatId,
        `🚜 *Formato de lectura de horómetro:*\n\`/horometro [MAQUINA] [HOROMETRO_INICIO] [HOROMETRO_FIN] [LITROS_DIESEL]\`\n\n*Ejemplo:* \`/horometro Puma 1280.5 1288.2 60\``,
        { parse_mode: 'Markdown', message_thread_id: threadId }
      );
    }

    const parts = content.split(/\s+/);
    if (parts.length < 3) {
      return botInstance.sendMessage(chatId, '⚠️ Se requieren al menos máquina, horómetro inicio y fin.');
    }

    const maqQuery = parts[0];
    const hInicio = parseFloat(parts[1]);
    const hFin = parseFloat(parts[2]);
    const litros = parts[3] ? parseFloat(parts[3]) : 0;
    const horasTrabajadas = Math.max(0, Math.round((hFin - hInicio) * 10) / 10);
    const authorName = getAuthorName(msg);

    const maquina = await get('SELECT * FROM maquina WHERE id LIKE ? OR nombre LIKE ? LIMIT 1', [`%${maqQuery}%`, `%${maqQuery}%`]);
    if (!maquina) return botInstance.sendMessage(chatId, `❌ No se encontró la máquina "*${maqQuery}*".`);

    const nowIso = new Date().toISOString();
    await run(`
      INSERT INTO lectura_maquina (maquina_id, fecha, autor_nombre, horometro_inicio, horometro_fin, horas_trabajadas, litros)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [maquina.id, nowIso, authorName, hInicio, hFin, horasTrabajadas, litros]);

    await run('UPDATE maquina SET horometro_actual = ? WHERE id = ?', [hFin, maquina.id]);

    const horasParaServicio = Math.max(0, Math.round(((maquina.umbral_servicio_hrs || 300) - (hFin % 300)) * 10) / 10);

    let reply = `🚜 *LECTURA DE MAQUINARIA*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🚜 *Máquina:* ${maquina.nombre}\n` +
                `⏱️ *Horómetro:* ${hInicio} ➔ ${hFin} (*${horasTrabajadas} hrs* trabajadas)\n` +
                `⛽ *Combustible:* ${litros} L diesel\n` +
                `🔧 *Mantenimiento:* Faltan *${horasParaServicio} hrs* para servicio`;

    if (horasParaServicio <= 20) {
      reply += `\n\n⚠️ *ALERTA:* Próximo a umbral de servicio preventivo (<20 hrs).`;
    }

    botInstance.sendMessage(chatId, reply, {
      parse_mode: 'Markdown',
      message_thread_id: threadId
    });
  });

  // 10. /material [insumo] [req] [sitio] [pedido] [eta]
  botInstance.onText(/\/material(?:\s+([\s\S]+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const threadId = msg.message_thread_id;
    const content = match[1] ? match[1].trim() : '';

    if (!content) {
      // Listar faltantes
      const faltantes = await all(`
        SELECT m.*, o.nombre as obra_nombre 
        FROM material m 
        JOIN obra o ON m.obra_id = o.id 
        WHERE (m.requerido - m.en_sitio) > 0
      `);

      if (faltantes.length === 0) {
        return botInstance.sendMessage(chatId, '✅ No hay materiales bloqueantes en este momento.');
      }

      let resp = `📦 *MATERIALES PENDIENTES / BLOQUEANTES*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      faltantes.forEach(f => {
        const falta = f.requerido - f.en_sitio;
        resp += `📁 *${f.obra_nombre}:* ${f.insumo}\n` +
                `   Faltan *${falta} ${f.unidad}* (Req: ${f.requerido} | En sitio: ${f.en_sitio} | Pedido: ${f.pedido}) • ETA: \`${f.eta || 'sin fecha'}\`\n\n`;
      });
      return botInstance.sendMessage(chatId, resp, { parse_mode: 'Markdown' });
    }

    const parts = content.split(/\s+/);
    const insumo = parts[0];
    const req = parseFloat(parts[1]) || 0;
    const sitio = parseFloat(parts[2]) || 0;
    const pedido = parseFloat(parts[3]) || 0;
    const eta = parts[4] || 'sin_fecha';
    const authorName = getAuthorName(msg);

    let obra = null;
    if (threadId) obra = await get('SELECT * FROM obra WHERE tg_thread_id = ?', [threadId]);
    if (!obra) obra = await get('SELECT * FROM obra WHERE estado = "operacion" LIMIT 1');

    await run(`
      INSERT INTO material (obra_id, insumo, requerido, en_sitio, pedido, eta, actualizado_en, autor_nombre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [obra ? obra.id : 'guayeme', insumo, req, sitio, pedido, eta, new Date().toISOString(), authorName]);

    const falta = req - sitio;
    let reply = `📦 *MATERIAL REGISTRADO*\n` +
                `📁 *Obra:* ${obra ? obra.nombre : 'Guayeme'}\n` +
                `🧱 *Insumo:* ${insumo}\n` +
                `📊 *Estado:* ${req} req · ${sitio} en sitio · ${pedido} pedidos · ETA: \`${eta}\``;

    if (falta > 0) {
      reply += `\n⚠️ *Faltan ${falta} unidades en sitio.*`;
    }

    botInstance.sendMessage(chatId, reply, { parse_mode: 'Markdown', message_thread_id: threadId });
  });

  // 11. /medicion [predio] [ha]
  botInstance.onText(/\/medicion(?:\s+([\s\S]+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const content = match[1] ? match[1].trim() : '';

    if (!content) {
      return botInstance.sendMessage(
        chatId,
        `📐 *Formato medición oficial:*\n\`/medicion [PREDIO] [HECTAREAS]\`\n\n*Ejemplo:* \`/medicion Teresita 12.3\``,
        { parse_mode: 'Markdown' }
      );
    }

    const parts = content.split(/\s+/);
    const predioQuery = parts[0];
    const has = parseFloat(parts[1]);
    const authorName = getAuthorName(msg);

    if (isNaN(has)) return botInstance.sendMessage(chatId, '❌ Debes ingresar una cantidad válida de hectáreas.');

    const predio = await get('SELECT * FROM predio WHERE id LIKE ? OR nombre LIKE ? LIMIT 1', [`%${predioQuery}%`, `%${predioQuery}%`]);
    if (!predio) return botInstance.sendMessage(chatId, `❌ Predio "*${predioQuery}*" no encontrado.`);

    const obraPredio = await get('SELECT obra_id FROM obra_predio WHERE predio_id = ? LIMIT 1', [predio.id]);
    const obraId = obraPredio ? obraPredio.obra_id : 'guayeme';

    await run(`
      INSERT INTO medicion (obra_id, predio_id, fecha, hectareas, fuente, autor_nombre)
      VALUES (?, ?, ?, ?, 'dron', ?)
    `, [obraId, predio.id, formatYMD(new Date()), has, authorName]);

    botInstance.sendMessage(
      chatId,
      `🛰️ *MEDICIÓN OFICIAL REGISTRADA (DRON)*\n` +
      `📁 *Predio:* ${predio.nombre}\n` +
      `📈 *Hectáreas validadas:* *${has} ha*\n` +
      `📅 *Fecha:* ${formatYMD(new Date())}\n` +
      `👤 *Registró:* ${authorName}\n\n` +
      `_Esta cifra constituye el avance oficial de referencia._`,
      { parse_mode: 'Markdown' }
    );
  });

  // 12. /avance [obra]
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
      // Listar avance de todas las obras activas
      const obras = await all('SELECT * FROM obra WHERE estado = "operacion"');
      let resp = `📊 *AVANCE DE OBRAS ACTIVAS*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      for (const o of obras) {
        const campoHa = (await get(`
          SELECT COALESCE(SUM(l.cantidad_ha), 0) as total 
          FROM reporte_linea l 
          JOIN reporte r ON l.reporte_id = r.id 
          WHERE r.obra_id = ?
        `, [o.id])).total;

        const ultMedicion = await get('SELECT * FROM medicion WHERE obra_id = ? ORDER BY id DESC LIMIT 1', [o.id]);
        const oficialHa = ultMedicion ? ultMedicion.hectareas : campoHa;

        resp += `📁 *${o.nombre}*\n` +
                `   🌾 *Avance campo:* ${campoHa} ha\n` +
                `   🛰️ *Oficial (Dron):* ${ultMedicion ? `${ultMedicion.hectareas} ha (${ultMedicion.fecha})` : 'Sin medición dron'}\n` +
                `   📍 *Fase:* \`${o.fase_actual}\`\n\n`;
      }

      return botInstance.sendMessage(chatId, resp, { parse_mode: 'Markdown' });
    }

    // Detalle de la obra específica
    const predios = await all(`
      SELECT p.* FROM predio p 
      JOIN obra_predio op ON p.id = op.predio_id 
      WHERE op.obra_id = ?
    `, [obra.id]);

    let reply = `📁 *AVANCE DETALLADO: ${obra.nombre}*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📍 *Fase actual:* \`${obra.fase_actual}\`\n` +
                `🏷️ *Estado:* \`${obra.estado}\`\n\n` +
                `🌾 *Desglose por Predio:*\n`;

    for (const p of predios) {
      const campoHa = (await get(`
        SELECT COALESCE(SUM(l.cantidad_ha), 0) as total 
        FROM reporte_linea l 
        JOIN reporte r ON l.reporte_id = r.id 
        WHERE r.obra_id = ? AND l.predio_id = ?
      `, [obra.id, p.id])).total;

      const ultMed = await get('SELECT * FROM medicion WHERE obra_id = ? AND predio_id = ? ORDER BY id DESC LIMIT 1', [obra.id, p.id]);

      reply += `• *${p.nombre}:*\n` +
               `  - Campo: *${campoHa} ha*\n` +
               `  - Oficial (Dron): *${ultMed ? `${ultMed.hectareas} ha` : 'Pendiente'}*\n` +
               `  - Superficie legal: ${p.superficie_legal_ha || 'N/A'} ha\n`;
    }

    botInstance.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
  });

  // 13. /pendientes
  botInstance.onText(/\/pendientes/, async (msg) => {
    const chatId = msg.chat.id;
    const abiertas = await all(`
      SELECT i.*, o.nombre as obra_nombre 
      FROM incidencia i 
      JOIN obra o ON i.obra_id = o.id 
      WHERE i.estado != 'cerrada' 
      ORDER BY i.abierta_en ASC
    `);

    if (abiertas.length === 0) {
      return botInstance.sendMessage(chatId, '✅ No hay incidencias abiertas actualmente.');
    }

    let resp = `⚠️ *INCIDENCIAS ABIERTAS / EN CURSO*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    abiertas.forEach(inc => {
      const dias = Math.max(0, Math.floor((new Date() - new Date(inc.abierta_en)) / (1000 * 60 * 60 * 24)));
      resp += `🔸 *[${inc.folio}] ${inc.descripcion}*\n` +
              `   📁 ${inc.obra_nombre} • 🏷️ \`${inc.tipo}\`\n` +
              `   ⏱️ *${dias} días* abierta • Estado: \`${inc.estado}\`\n` +
              `   👉 Cerrar: \`/cerrar ${inc.folio} [Causa raíz]\`\n\n`;
    });

    botInstance.sendMessage(chatId, resp, { parse_mode: 'Markdown' });
  });

  // 14. /hoy
  botInstance.onText(/\/hoy/, async (msg) => {
    const chatId = msg.chat.id;
    const today = formatYMD(new Date());

    const obrasOperacion = await all('SELECT * FROM obra WHERE estado = "operacion"');
    const reportesHoy = await all('SELECT * FROM reporte WHERE fecha_operativa = ?', [today]);

    const reportedObrasIds = new Set(reportesHoy.map(r => r.obra_id));

    let resp = `📅 *REPORTE DE OPERACIONES · ${today}*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    resp += `✅ *OBRAS QUE REPORTARON HOY (${reportesHoy.length}):*\n`;
    if (reportesHoy.length === 0) {
      resp += `  _Ninguna obra ha reportado hoy aún._\n`;
    } else {
      reportesHoy.forEach(r => {
        const tipoStr = r.es_sin_actividad ? `(Sin actividad: ${r.motivo_sin_actividad})` : `(Avance registrado)`;
        resp += `  • *${r.obra_id}* — ${r.autor_nombre} ${tipoStr}\n`;
      });
    }

    resp += `\n❌ *OBRAS SIN REPORTE HOY:*\n`;
    const sinReporte = obrasOperacion.filter(o => !reportedObrasIds.has(o.id));
    if (sinReporte.length === 0) {
      resp += `  _¡Todas las obras activas han reportado hoy!_\n`;
    } else {
      sinReporte.forEach(o => {
        resp += `  • *${o.nombre}* (#${o.id})\n`;
      });
    }

    botInstance.sendMessage(chatId, resp, { parse_mode: 'Markdown' });
  });

  // 15. /tablero (Mensaje fijado canónico según docs/2 — Telegram.md §5)
  botInstance.onText(/\/tablero/, (msg) => {
    sendTableroMessage(msg.chat.id, botInstance);
  });

  // 16. /ayuda
  botInstance.onText(/\/ayuda/, (msg) => {
    sendHelpMessage(msg.chat.id, botInstance);
  });
}

// Procesador de bloque de reporte diario con el Parser AGROK
async function handleDailyReportMessage(msg, text, botInstance) {
  const chatId = msg.chat.id;
  const threadId = msg.message_thread_id;
  const authorName = getAuthorName(msg);
  const receivedDate = new Date(msg.date * 1000);

  // Inferir obra del thread si existe
  let threadObraId = null;
  if (threadId) {
    const ob = await get('SELECT id FROM obra WHERE tg_thread_id = ?', [threadId]);
    if (ob) threadObraId = ob.id;
  }

  // Parsear texto con el Parser
  const parsed = parseDailyReport(text, receivedDate, threadObraId);
  const obraId = parsed.obra_id || 'guayeme';
  const obra = await get('SELECT * FROM obra WHERE id = ?', [obraId]) || { nombre: 'Guayeme' };

  // Guardar en Base de Datos
  const nowIso = receivedDate.toISOString();
  const insertRep = await run(`
    INSERT INTO reporte (
      client_uuid, obra_id, recibido_en, fecha_operativa, autor_nombre,
      tg_chat_id, tg_message_id, texto_original, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado')
  `, [
    `tg-rep-${Date.now()}-${msg.message_id}`,
    obraId,
    nowIso,
    parsed.fecha_operativa,
    authorName,
    chatId,
    msg.message_id,
    text
  ]);

  const reporteId = insertRep.id;

  // Insertar Cuadrilla
  for (const c of parsed.cuadrilla) {
    await run(`
      INSERT INTO reporte_cuadrilla (reporte_id, rol_id, headcount)
      VALUES (?, ?, ?)
    `, [reporteId, c.rol_id, c.headcount]);
  }

  // Insertar Líneas de Avance
  for (const a of parsed.avances) {
    const predioId = a.predio_id || 'guayeme';
    const actId = parsed.actividades.length > 0 ? parsed.actividades[0].actividad_id : 'otro';

    await run(`
      INSERT INTO reporte_linea (reporte_id, predio_id, actividad_id, texto, cantidad, unidad, cantidad_ha, fuente)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'campo')
    `, [reporteId, predioId, actId, a.texto, a.cantidad, a.unidad, a.cantidad_ha]);
  }

  // Formatear Mensaje de Confirmación según spec v2 §2
  const cuadrillaStr = parsed.cuadrilla.length > 0
    ? parsed.cuadrilla.map(c => `${c.rol_texto || c.rol_id} ${c.headcount}`).join(' · ')
    : 'No especificada';

  const actividadesStr = parsed.actividades.length > 0
    ? parsed.actividades.map(a => a.actividad_id).join(' · ')
    : 'No especificadas';

  const avancesStr = parsed.avances.length > 0
    ? parsed.avances.map(a => `${a.predio_id || 'Predio'} ${a.cantidad} ${a.unidad}`).join(' · ')
    : 'Sin cifras numéricas de avance';

  const sinClasificarStr = parsed.sin_clasificar.length > 0
    ? parsed.sin_clasificar.join('; ')
    : '—';

  const confirmMsg = 
    `✅ *Reporte · ${obra.nombre} · ${parsed.fecha_operativa} · ${authorName}*\n\n` +
    `👥 *Cuadrilla:* ${cuadrillaStr}\n` +
    `🌾 *Actividades:* ${actividadesStr}\n` +
    `📈 *Avance:* ${avancesStr}\n` +
    `❓ *Sin clasificar:* ${sinClasificarStr}\n\n` +
    `_Reporte guardado en la base central AGROK._`;

  const inlineKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Confirmar', callback_data: `confirm_rep_${reporteId}` },
          { text: '📱 Ver en Mini App', web_app: { url: getWebAppUrl() } }
        ]
      ]
    }
  };

  botInstance.sendMessage(chatId, confirmMsg, {
    parse_mode: 'Markdown',
    message_thread_id: threadId,
    ...inlineKeyboard
  });
}

// Mensaje de Tablero Fijado según docs/2 — Telegram.md §5
async function sendTableroMessage(chatId, botInstance) {
  const today = formatYMD(new Date());
  
  // 1. Obras sin reporte hoy
  const obrasOperacion = await all('SELECT * FROM obra WHERE estado = "operacion"');
  const reportesHoy = await all('SELECT obra_id FROM reporte WHERE fecha_operativa = ?', [today]);
  const reportedIds = new Set(reportesHoy.map(r => r.obra_id));
  const sinReporte = obrasOperacion.filter(o => !reportedIds.has(o.id));

  // 2. Avances acumulados
  const avances = await all(`
    SELECT o.nombre as obra_nombre, p.nombre as predio_nombre, SUM(l.cantidad_ha) as total_ha 
    FROM reporte_linea l 
    JOIN reporte r ON l.reporte_id = r.id 
    JOIN obra o ON r.obra_id = o.id 
    JOIN predio p ON l.predio_id = p.id 
    GROUP BY o.id, p.id
  `);

  // 3. Incidencias abiertas
  const incidenciasAbiertas = await all(`
    SELECT i.*, o.nombre as obra_nombre 
    FROM incidencia i 
    JOIN obra o ON i.obra_id = o.id 
    WHERE i.estado != 'cerrada'
  `);

  // 4. Bloqueado por material
  const materialesFaltantes = await all(`
    SELECT m.*, o.nombre as obra_nombre 
    FROM material m 
    JOIN obra o ON m.obra_id = o.id 
    WHERE (m.requerido - m.en_sitio) > 0
  `);

  let msg = `🌾 *AGROK · TABLERO GENERAL · ${today}*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `🔴 *SIN REPORTE HOY:*\n`;
  if (sinReporte.length === 0) {
    msg += `  _Ninguna (100% de obras reportadas)_\n`;
  } else {
    sinReporte.forEach(o => {
      msg += `  • ${o.nombre}\n`;
    });
  }

  msg += `\n📈 *AVANCE ACUMULADO:*\n`;
  if (avances.length === 0) {
    msg += `  _Sin registros de avance acumulado._\n`;
  } else {
    avances.forEach(a => {
      msg += `  • *${a.obra_nombre}* (${a.predio_nombre}): ${a.total_ha} ha\n`;
    });
  }

  msg += `\n⚠️ *INCIDENCIAS ABIERTAS (${incidenciasAbiertas.length}):*\n`;
  if (incidenciasAbiertas.length === 0) {
    msg += `  _Cero incidencias activas._\n`;
  } else {
    incidenciasAbiertas.forEach(i => {
      const dias = Math.max(0, Math.floor((new Date() - new Date(i.abierta_en)) / (1000 * 60 * 60 * 24)));
      msg += `  • *${i.folio}* ${i.descripcion} (${dias}d · \`${i.estado}\`)\n`;
    });
  }

  msg += `\n📦 *BLOQUEADO POR MATERIAL:*\n`;
  if (materialesFaltantes.length === 0) {
    msg += `  _Sin materiales críticos pendientes._\n`;
  } else {
    materialesFaltantes.forEach(m => {
      const falta = m.requerido - m.en_sitio;
      msg += `  • *${m.obra_nombre}:* ${m.insumo} faltan ${falta} ${m.unidad} (ETA: ${m.eta || 'sin fecha'})\n`;
    });
  }

  const appUrl = getWebAppUrl();
  botInstance.sendMessage(chatId, msg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 ABRIR TABLERO EN MINI APP', web_app: { url: appUrl } }]
      ]
    }
  });
}

function sendHelpMessage(chatId, botInstance) {
  const appUrl = getWebAppUrl();
  const helpText = 
    `📖 *GUÍA DE COMANDOS AGROK (spec v2)*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📝 *REPORTES DIARIOS:*\n` +
    `• Pega tu reporte diario en el tema de la obra con cabeceras (*Obra:*, *Fuerza de trabajo:*, *Actividades:*, *Avance:*).\n` +
    `• \`/sin_actividad [motivo]\` — Reportar día sin labores (lluvia, descanso, etc.).\n\n` +
    `🚨 *INCIDENCIAS:*\n` +
    `• \`/incidencia [tipo] [texto]\` — Abrir incidencia (Ej: \`/incidencia falla_mecanica Bulldozer sobrecalentado\`).\n` +
    `• \`/cerrar [folio] [causa_raiz]\` — Cerrar con causa raíz obligatoria.\n` +
    `• \`/verificar [folio]\` — Pasar a verificación.\n\n` +
    `🚜 *MAQUINARIA Y MATERIALES:*\n` +
    `• \`/horometro Puma 1280.5 1288.2 60\` — Registrar horas y combustible.\n` +
    `• \`/material varengas 90 40 50 sin_fecha\` — Registrar insumos.\n` +
    `• \`/medicion Teresita 12.3\` — Medición oficial con Dron.\n\n` +
    `📊 *CONSULTAS:*\n` +
    `• \`/tablero\` — Resumen ejecutivo consolidado.\n` +
    `• \`/avance [obra]\` — Avance por predio.\n` +
    `• \`/pendientes\` — Incidencias abiertas.\n` +
    `• \`/hoy\` — Estado de reportes del día.`;

  botInstance.sendMessage(chatId, helpText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 ABRIR MINI APP OFFLINE-FIRST', web_app: { url: appUrl } }]
      ]
    }
  });
}

async function registerSubscriber(chatId, username, firstName, role, botInstance) {
  try {
    await run(`
      INSERT INTO telegram_subscribers (chat_id, username, first_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(chat_id) DO UPDATE SET role = ?, is_active = 1, username = ?, first_name = ?
    `, [chatId, username, firstName, role, role, username, firstName]);

    botInstance.sendMessage(
      chatId,
      `✅ *Registrado con rol: ${role.toUpperCase()}*\nYa puedes interactuar con el sistema AGROK.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 ABRIR AGROK MINI APP', web_app: { url: getWebAppUrl() } }]
          ]
        }
      }
    );
  } catch (err) {
    console.error('Error registrando rol:', err);
  }
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
