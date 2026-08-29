/**
 * Parser de Reporte Diario de Campo AGROK según docs/2 — Telegram.md §2
 * Extrae información estructurada de reportes de campo en texto libre
 * @module parser
 */

const ACTIVIDAD_KEYWORDS = [
  { id: 'desmonte', regex: /desmont/i },
  { id: 'despalme', regex: /despalm/i },
  { id: 'destronque', regex: /destronq/i },
  { id: 'desenraizado', regex: /desenraiz/i },
  { id: 'quema', regex: /quema/i },
  { id: 'guardaraya', regex: /guardaray/i },
  { id: 'rastreo_1', regex: /rastre.*1|primer.*rastre/i },
  { id: 'rastreo_2', regex: /rastre.*2|segundo.*rastre/i },
  { id: 'rastreo_1', regex: /rastre/i },
  { id: 'nivelacion', regex: /nivelac/i },
  { id: 'terraceo', regex: /terrace/i },
  { id: 'posteo', regex: /poste/i },
  { id: 'cercado', regex: /cerca/i },
  { id: 'siembra', regex: /siembr|sembr/i },
  { id: 'fertilizacion', regex: /fertiliz|abono/i },
  { id: 'fumigacion', regex: /fumig|herbicida|insecticida/i },
  { id: 'monitoreo', regex: /monitore|inspecc/i },
  { id: 'chapeo', regex: /chape/i },
  { id: 'acarreo', regex: /acarre|carga.*hacia/i },
  { id: 'mantenimiento_maquinaria', regex: /mantenimiento.*maquin|limpieza.*disco|engras/i },
  { id: 'limpieza', regex: /limpiez/i },
  { id: 'obra_civil', regex: /obra.*civil|albañil|colado/i }
];

const ROL_KEYWORDS = [
  { id: 'operador_bulldozer', regex: /bulldozer|d6/i },
  { id: 'operador_retro', regex: /retro|new holland/i },
  { id: 'operador_tractor', regex: /tractor|puma/i },
  { id: 'lider_posteo', regex: /lider.*poste|encargado.*poste/i },
  { id: 'tecnico', regex: /tecnico|técnico|ing/i },
  { id: 'auxiliar', regex: /auxiliar|peon|peón|jornalero/i },
  { id: 'encargada', regex: /encargad|coordinador/i }
];

const PREDIO_ALIAS_MAP = {
  'san alberto': 'san_alberto',
  'san_alberto': 'san_alberto',
  'san luis': 'san_luis',
  'san_luis': 'san_luis',
  'los mangos': 'los_mangos',
  'los_mangos': 'los_mangos',
  'mangos': 'los_mangos',
  'guayeme': 'guayeme',
  'rach': 'rach',
  'cristina': 'cristina',
  'la asuncion': 'la_asuncion',
  'asuncion': 'la_asuncion',
  'san pedro': 'san_pedro',
  'santa teresita': 'sta_teresita',
  'teresita': 'sta_teresita',
  'magdalena': 'sta_teresita',
  'arceo': 'arceo',
  'xpicob': 'xpicob',
  'zavala': 'zavala',
  'trece': 'trece',
  'maria': 'maria',
  'parque jabin': 'parque_jabin',
  'jabin': 'parque_jabin',
  'potrero yeguas': 'potrero_yeguas',
  'potrero': 'potrero_yeguas'
};

/**
 * Parsea un reporte diario de campo desde texto libre
 * @param {string} rawText - Texto del reporte a parsear
 * @param {Date} receivedDate - Fecha de recepción del reporte
 * @param {string|null} threadObraId - ID de la obra desde el thread de Telegram
 * @returns {Object} Objeto estructurado con la información del reporte
 */
function parseDailyReport(rawText, receivedDate = new Date(), threadObraId = null) {
  const result = {
    obra_id: threadObraId || null,
    obra_nombre_pista: null,
    fecha_escrita: null,
    fecha_operativa: formatYMD(receivedDate),
    cuadrilla: [],
    actividades: [],
    avances: [],
    maquina_lectura: null,
    activo_lectura: null,
    notas: [],
    sin_clasificar: []
  };

  // Validación de entrada
  if (!rawText || typeof rawText !== 'string') {
    console.warn('Parser: texto de entrada inválido');
    return result;
  }

  if (rawText.length > 10000) {
    console.warn('Parser: texto demasiado largo, truncando a 10000 caracteres');
    rawText = rawText.substring(0, 10000);
  }

  try {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    let currentSection = 'general';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.replace(/[*_~`]/g, '').trim();

      // 1. Detectar Cabeceras
      if (/^obra\s*:/i.test(cleanLine)) {
        const val = cleanLine.replace(/^obra\s*:/i, '').trim();
        result.obra_nombre_pista = val;
        if (!result.obra_id) {
          result.obra_id = inferObraId(val);
        }
        currentSection = 'obra';
        continue;
      }

      if (/^(fecha|hora)\s*:/i.test(cleanLine)) {
        const val = cleanLine.replace(/^(fecha|hora)\s*:/i, '').trim();
        result.fecha_escrita = val;
        result.fecha_operativa = calculateFechaOperativa(val, receivedDate);
        currentSection = 'fecha';
        continue;
      }

      if (/^(fuerza de trabajo|cuadrilla|personal)\s*:/i.test(cleanLine)) {
        currentSection = 'cuadrilla';
        continue;
      }

      if (/^(operaci[oó]n actual|actividades|actividades realizadas|trabajo realizado)\s*:/i.test(cleanLine)) {
        currentSection = 'actividades';
        continue;
      }

      if (/^(avance|avance diario|avance aprox|[aá]rea ejecutada|[aá]rea semanal acumulada)\s*:/i.test(cleanLine)) {
        currentSection = 'avance';
        continue;
      }

      if (/^(hor[oó]metro|diesel|combustible)\s*:/i.test(cleanLine)) {
        currentSection = 'horometro';
        continue;
      }

      if (/^(nota|observaciones|novedades)\s*:/i.test(cleanLine)) {
        currentSection = 'nota';
        const val = cleanLine.replace(/^(nota|observaciones|novedades)\s*:/i, '').trim();
        if (val) result.notas.push(val);
        continue;
      }

      // 2. Procesar Contenido según Sección Activa
      if (currentSection === 'cuadrilla') {
        const cItem = parseCuadrillaLine(cleanLine);
        if (cItem) {
          result.cuadrilla.push(cItem);
          continue;
        }
      }

      if (currentSection === 'actividades') {
        if (cleanLine.startsWith('-') || cleanLine.startsWith('•') || cleanLine.startsWith('*')) {
          const actItem = parseActividadLine(cleanLine);
          result.actividades.push(actItem);
          continue;
        }
      }

      // 3. Parser de Avances (Detectar números con ha/m2/ml en cualquier parte del texto o sección)
      const avanceMatches = parseAvanceInLine(cleanLine);
      if (avanceMatches && avanceMatches.length > 0) {
        result.avances.push(...avanceMatches);
        continue;
      }

      // Si no cayó en sección específica
      if (currentSection === 'nota') {
        result.notas.push(cleanLine);
      } else if (cleanLine.startsWith('-') || cleanLine.startsWith('•')) {
        // Viñeta suelta, clasificar como actividad
        const act = parseActividadLine(cleanLine);
        result.actividades.push(act);
      } else if (cleanLine.length > 0) {
        result.sin_clasificar.push(cleanLine);
      }
    }

    // Normalizar avances con predio por defecto si no se detectó y la obra tiene predio único
    result.avances = resolvePrediosForAvances(result.avances, result.obra_id);

  } catch (error) {
    console.error('Error durante el parseo del reporte:', error);
  }

  return result;
}

function parseCuadrillaLine(line) {
  if (!line || typeof line !== 'string') return null;
  
  const match = line.match(/^[-•*]?\s*(\d+)?\s*(.+?)\s*(?:[x×]\s*(\d+))?$/);
  if (!match) return null;

  const countStr = match[1] || match[3] || '1';
  const headcount = parseInt(countStr, 10);
  
  // Validar que el headcount sea razonable (1-100 personas)
  if (isNaN(headcount) || headcount < 1 || headcount > 100) {
    return null;
  }
  
  const roleText = match[2].trim();
  if (roleText.length < 2 || roleText.length > 100) {
    return null;
  }

  let matchedRol = 'auxiliar';
  for (const r of ROL_KEYWORDS) {
    if (r.regex.test(roleText)) {
      matchedRol = r.id;
      break;
    }
  }

  return {
    rol_id: matchedRol,
    rol_texto: roleText,
    headcount
  };
}

function parseActividadLine(line) {
  const clean = line.replace(/^[-•*]\s*/, '').trim();
  let matchedAct = 'otro';

  for (const a of ACTIVIDAD_KEYWORDS) {
    if (a.regex.test(clean)) {
      matchedAct = a.id;
      break;
    }
  }

  return {
    actividad_id: matchedAct,
    texto: clean
  };
}

function parseAvanceInLine(line) {
  if (!line || typeof line !== 'string' || line.length > 500) {
    return [];
  }
  
  const results = [];
  // Regex: busca "6.5 ha del predio cristina", "10 m2", "50 ml", etc.
  const regex = /(\d+[.,]?\d*)\s*(ha|hect[aá]reas?|has|m2|m²|ml|metros lineales|%)/gi;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const rawVal = match[1].replace(',', '.');
    const val = parseFloat(rawVal);
    const unit = match[2].toLowerCase();

    // Validar que el valor sea razonable
    if (isNaN(val) || val < 0 || val > 10000) {
      continue;
    }

    let standardUnit = 'ha';
    let cantidad_ha = val;

    if (unit.includes('m2') || unit.includes('m²')) {
      standardUnit = 'm2';
      cantidad_ha = val / 10000;
    } else if (unit.includes('ml') || unit.includes('metro')) {
      standardUnit = 'ml';
      cantidad_ha = null;
    } else if (unit.includes('%')) {
      standardUnit = 'pct';
      cantidad_ha = null;
    }

    // Buscar predio mencionado antes o después de la cifra en la línea
    const predioFound = findPredioInText(line, match.index);

    results.push({
      texto: line.substring(0, 100), // Limitar longitud
      cantidad: val,
      unidad: standardUnit,
      cantidad_ha: cantidad_ha !== null ? Math.round(cantidad_ha * 100) / 100 : null,
      predio_id: predioFound
    });
  }

  return results;
}

function findPredioInText(text, matchIndex) {
  const lower = text.toLowerCase();
  for (const [alias, id] of Object.entries(PREDIO_ALIAS_MAP)) {
    if (lower.includes(alias)) {
      return id;
    }
  }
  return null;
}

function resolvePrediosForAvances(avances, obraId) {
  const defaultPredioMap = {
    'guayeme': 'guayeme',
    'sta_teresita': 'santa_teresita',
    'san_alberto': 'san_alberto',
    'san_luis': 'san_luis',
    'jabin': 'parque_jabin',
    'potrero_yeguas': 'potrero_yeguas'
  };

  return avances.map(a => {
    if (!a.predio_id && obraId && defaultPredioMap[obraId]) {
      return { ...a, predio_id: defaultPredioMap[obraId] };
    }
    return a;
  });
}

function inferObraId(text) {
  const lower = text.toLowerCase();
  if (lower.includes('guayeme')) return 'guayeme';
  if (lower.includes('teresita') || lower.includes('magdalena') || lower.includes('desmonte')) return 'sta_teresita';
  if (lower.includes('mangos') || lower.includes('cristina') || lower.includes('rach')) return 'cluster_mangos';
  if (lower.includes('alberto')) return 'san_alberto';
  if (lower.includes('luis')) return 'san_luis';
  if (lower.includes('jabin') || lower.includes('jabín')) return 'jabin';
  if (lower.includes('potrero') || lower.includes('yeguas')) return 'potrero_yeguas';
  return null;
}

function calculateFechaOperativa(writtenDateStr, receivedDate) {
  // Regla spec v2 §6: si la fecha escrita está a ±1 día de received_en, usarla; si no, usar receivedDate
  if (!writtenDateStr || typeof writtenDateStr !== 'string') {
    return formatYMD(receivedDate);
  }

  try {
    // Intentar varios formatos de fecha
    const parts = writtenDateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (parts) {
      let day = parseInt(parts[1], 10);
      let month = parseInt(parts[2], 10) - 1;
      let year = parseInt(parts[3], 10);
      
      // Validaciones básicas
      if (day < 1 || day > 31 || month < 0 || month > 11) {
        console.warn('Parser: fecha inválida detectada', writtenDateStr);
        return formatYMD(receivedDate);
      }
      
      if (year < 100) year += 2000;
      if (year < 2020 || year > 2030) {
        console.warn('Parser: año fuera de rango razonable', year);
        return formatYMD(receivedDate);
      }

      const parsedDate = new Date(year, month, day);
      
      // Verificar que la fecha es válida
      if (isNaN(parsedDate.getTime())) {
        return formatYMD(receivedDate);
      }
      
      const diffDays = Math.abs((parsedDate - receivedDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1.5) {
        return formatYMD(parsedDate);
      }
    }
  } catch (error) {
    console.warn('Parser: error al calcular fecha operativa', error.message);
  }

  return formatYMD(receivedDate);
}

function formatYMD(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

module.exports = {
  parseDailyReport,
  calculateFechaOperativa,
  ACTIVIDAD_KEYWORDS,
  ROL_KEYWORDS,
  PREDIO_ALIAS_MAP
};
