const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos SQLite:', err.message);
  } else {
    console.log('✅ Base de datos SQLite AGROK conectada en:', dbPath);
  }
});

// Helper para hash de contraseñas con crypto nativo
function hashPassword(password) {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

// Helpers de Promesas
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Inicialización de esquemas según Modelo de Datos AGROK
async function initDb() {
  // 1. Usuarios con Autenticación y Roles
  await run(`
    CREATE TABLE IF NOT EXISTS usuario (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'campo', -- campo, supervisor, direccion, it
      tg_user_id TEXT UNIQUE,
      tg_chat_id TEXT,
      puede_cerrar_incidencias INTEGER DEFAULT 0,
      puede_registrar_medicion INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      creado_en TEXT
    )
  `);

  // 2. Entidades (Empresas del grupo)
  await run(`
    CREATE TABLE IF NOT EXISTS entidad (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      odoo_company_id INTEGER
    )
  `);

  // 3. Proyectos
  await run(`
    CREATE TABLE IF NOT EXISTS proyecto (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL, -- maiz, papaya, ganaderia, infraestructura, reforestacion
      ciclo TEXT NOT NULL, -- "Maíz 2026"
      superficie_meta_ha REAL DEFAULT 0,
      fase_catalogo TEXT,
      inicio DATE,
      fin DATE
    )
  `);

  // 4. Predios
  await run(`
    CREATE TABLE IF NOT EXISTS predio (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      alias TEXT, -- JSON array
      superficie_legal_ha REAL,
      superficie_util_ha REAL,
      regimen TEXT DEFAULT 'propio', -- propio, rentado, en_tramite, patrimonial
      restricciones TEXT,
      odoo_partner_id INTEGER
    )
  `);

  // 5. Obras
  await run(`
    CREATE TABLE IF NOT EXISTS obra (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      alias TEXT, -- JSON array de alias
      proyecto_id TEXT,
      entidad_id TEXT,
      fase_actual TEXT,
      estado TEXT DEFAULT 'operacion', -- prospeccion, habilitacion, operacion, mantenimiento, standby, cerrada
      tg_thread_id INTEGER,
      responsable_id TEXT,
      FOREIGN KEY (proyecto_id) REFERENCES proyecto(id),
      FOREIGN KEY (entidad_id) REFERENCES entidad(id)
    )
  `);

  // 6. Relación Obra - Predio (N:M)
  await run(`
    CREATE TABLE IF NOT EXISTS obra_predio (
      obra_id TEXT NOT NULL,
      predio_id TEXT NOT NULL,
      PRIMARY KEY (obra_id, predio_id),
      FOREIGN KEY (obra_id) REFERENCES obra(id) ON DELETE CASCADE,
      FOREIGN KEY (predio_id) REFERENCES predio(id) ON DELETE CASCADE
    )
  `);

  // 7. Catálogo Dinámico de Actividades
  await run(`
    CREATE TABLE IF NOT EXISTS actividad_catalogo (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      unidad_default TEXT DEFAULT 'ha',
      categoria TEXT DEFAULT 'campo'
    )
  `);

  // 8. Catálogo Dinámico de Roles de Cuadrilla
  await run(`
    CREATE TABLE IF NOT EXISTS rol_cuadrilla_catalogo (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      categoria TEXT DEFAULT 'campo'
    )
  `);

  // 9. Reportes Diarios
  await run(`
    CREATE TABLE IF NOT EXISTS reporte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_uuid TEXT UNIQUE,
      obra_id TEXT NOT NULL,
      recibido_en TEXT NOT NULL,
      fecha_operativa TEXT NOT NULL,
      autor_id TEXT,
      autor_nombre TEXT,
      tg_chat_id INTEGER,
      tg_message_id INTEGER,
      texto_original TEXT,
      nota TEXT,
      estado TEXT DEFAULT 'confirmado',
      es_sin_actividad INTEGER DEFAULT 0,
      motivo_sin_actividad TEXT,
      adjuntos TEXT,
      FOREIGN KEY (obra_id) REFERENCES obra(id)
    )
  `);

  // 10. Líneas de Reporte
  await run(`
    CREATE TABLE IF NOT EXISTS reporte_linea (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporte_id INTEGER NOT NULL,
      predio_id TEXT NOT NULL,
      actividad_id TEXT NOT NULL,
      texto TEXT,
      cantidad REAL DEFAULT 0,
      unidad TEXT DEFAULT 'ha',
      cantidad_ha REAL DEFAULT 0,
      subzona TEXT,
      fuente TEXT DEFAULT 'campo',
      FOREIGN KEY (reporte_id) REFERENCES reporte(id) ON DELETE CASCADE,
      FOREIGN KEY (predio_id) REFERENCES predio(id)
    )
  `);

  // 11. Cuadrilla del Reporte
  await run(`
    CREATE TABLE IF NOT EXISTS reporte_cuadrilla (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporte_id INTEGER NOT NULL,
      rol_id TEXT NOT NULL,
      headcount INTEGER DEFAULT 1,
      FOREIGN KEY (reporte_id) REFERENCES reporte(id) ON DELETE CASCADE
    )
  `);

  // 12. Maquinaria y Lecturas
  await run(`
    CREATE TABLE IF NOT EXISTS maquina (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL, -- tractor, bulldozer, retro, dron, sembradora, rastra
      propietaria_id TEXT,
      operadora_id TEXT,
      umbral_servicio_hrs REAL DEFAULT 300,
      horometro_actual REAL DEFAULT 0,
      operador_habitual TEXT,
      odoo_fleet_id INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS lectura_maquina (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maquina_id TEXT NOT NULL,
      obra_id TEXT,
      fecha TEXT NOT NULL,
      autor_id TEXT,
      autor_nombre TEXT,
      horometro_inicio REAL,
      horometro_fin REAL,
      horas_trabajadas REAL,
      litros REAL,
      foto_file_id TEXT,
      FOREIGN KEY (maquina_id) REFERENCES maquina(id) ON DELETE CASCADE
    )
  `);

  // 13. Activos Fijos
  await run(`
    CREATE TABLE IF NOT EXISTS activo (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      predio_id TEXT NOT NULL,
      tipo TEXT NOT NULL, -- veleta, bomba, pozo, cerco, cisterna, riego, cabaña
      umbral_dias_sin_lectura INTEGER DEFAULT 30,
      ultima_lectura_fecha TEXT,
      ultimo_estado TEXT DEFAULT 'ok',
      FOREIGN KEY (predio_id) REFERENCES predio(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS lectura_activo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activo_id TEXT NOT NULL,
      estado TEXT NOT NULL,
      nota TEXT,
      fecha TEXT NOT NULL,
      autor_id TEXT,
      FOREIGN KEY (activo_id) REFERENCES activo(id) ON DELETE CASCADE
    )
  `);

  // 14. Incidencias y Eventos
  await run(`
    CREATE TABLE IF NOT EXISTS incidencia (
      folio TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      obra_id TEXT NOT NULL,
      maquina_id TEXT,
      activo_id TEXT,
      estado TEXT DEFAULT 'abierta',
      abierta_en TEXT NOT NULL,
      cerrada_en TEXT,
      descripcion TEXT,
      causa_raiz TEXT,
      responsable_id TEXT,
      FOREIGN KEY (obra_id) REFERENCES obra(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS incidencia_evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT NOT NULL,
      fecha TEXT NOT NULL,
      autor_id TEXT,
      autor_nombre TEXT,
      texto TEXT NOT NULL,
      foto_file_id TEXT,
      estado_resultante TEXT,
      FOREIGN KEY (folio) REFERENCES incidencia(folio) ON DELETE CASCADE
    )
  `);

  // 15. Materiales
  await run(`
    CREATE TABLE IF NOT EXISTS material (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id TEXT NOT NULL,
      insumo TEXT NOT NULL,
      requerido REAL DEFAULT 0,
      en_sitio REAL DEFAULT 0,
      pedido REAL DEFAULT 0,
      unidad TEXT DEFAULT 'unidad',
      eta TEXT,
      odoo_po_id INTEGER,
      actualizado_en TEXT,
      autor_nombre TEXT,
      FOREIGN KEY (obra_id) REFERENCES obra(id) ON DELETE CASCADE
    )
  `);

  // 16. Mediciones Oficiales
  await run(`
    CREATE TABLE IF NOT EXISTS medicion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id TEXT NOT NULL,
      predio_id TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hectareas REAL NOT NULL,
      fuente TEXT DEFAULT 'dron',
      archivo_file_id TEXT,
      autor_id TEXT,
      autor_nombre TEXT,
      FOREIGN KEY (obra_id) REFERENCES obra(id),
      FOREIGN KEY (predio_id) REFERENCES predio(id)
    )
  `);

  // 17. Suscriptores Telegram y Configuración
  await run(`
    CREATE TABLE IF NOT EXISTS telegram_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sembrado Inicial
  await seedInitialData();
}

async function seedInitialData() {
  // 1. Usuarios del Sistema con Roles y Contraseñas
  const userCount = (await get('SELECT COUNT(*) as c FROM usuario')).c;
  if (userCount === 0) {
    console.log('👤 Creando usuarios base con roles y contraseñas...');
    const now = new Date().toISOString();

    const users = [
      ['usr-admin', 'admin', hashPassword('admin123'), 'Administrador AGROK', 'it', 1, 1, now],
      ['usr-super', 'supervisor', hashPassword('super123'), 'Ing. Carlos Supervisor', 'supervisor', 1, 1, now],
      ['usr-lider', 'direccion', hashPassword('lider123'), 'Dirección General AGROK', 'direccion', 1, 1, now],
      ['usr-campo', 'operador', hashPassword('campo123'), 'Abner Operador de Campo', 'campo', 0, 0, now],
      ['usr-armando', 'armando', hashPassword('armando123'), 'Armando Operador Tractor', 'campo', 0, 0, now]
    ];

    for (const [id, username, passHash, nombre, rol, puedeCerrar, puedeMedir, creado] of users) {
      await run(`
        INSERT INTO usuario (id, username, password_hash, nombre, rol, puede_cerrar_incidencias, puede_registrar_medicion, creado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, username, passHash, nombre, rol, puedeCerrar, puedeMedir, creado]);
    }
  }

  // 2. Catálogo Dinámico de Actividades
  const actCount = (await get('SELECT COUNT(*) as c FROM actividad_catalogo')).c;
  if (actCount === 0) {
    const actividades = [
      ['siembra', 'Siembra', 'ha', 'agricola'],
      ['rastreo_1', 'Rastreo 1er paso', 'ha', 'preparacion'],
      ['rastreo_2', 'Rastreo 2do paso', 'ha', 'preparacion'],
      ['despalme', 'Despalme con maquinaria', 'ha', 'preparacion'],
      ['desmonte', 'Desmonte de terreno', 'ha', 'preparacion'],
      ['destronque', 'Destronque', 'ha', 'preparacion'],
      ['desenraizado', 'Desenraizado', 'ha', 'preparacion'],
      ['fumigacion', 'Fumigación y control fitosanitario', 'ha', 'agricola'],
      ['fertilizacion', 'Aplicación de fertilizante', 'ha', 'agricola'],
      ['monitoreo', 'Monitoreo de plagas / cultivo', 'ha', 'agricola'],
      ['posteo', 'Colocación de postes', 'pieza', 'infraestructura'],
      ['cercado', 'Cercado perimetral', 'ml', 'infraestructura'],
      ['chapeo', 'Chapeo manual / mecánico', 'ha', 'mantenimiento'],
      ['acarreo', 'Acarreo de insumos / piedra', 'viaje', 'logistica'],
      ['mantenimiento_maquinaria', 'Mantenimiento de maquinaria', 'servicio', 'taller'],
      ['obra_civil', 'Obra civil / bodega / pozo', 'm2', 'infraestructura'],
      ['limpieza', 'Limpieza general', 'ha', 'campo'],
      ['otro', 'Otra actividad', 'ha', 'general']
    ];
    for (const [id, nombre, unidad, cat] of actividades) {
      await run('INSERT INTO actividad_catalogo (id, nombre, unidad_default, categoria) VALUES (?, ?, ?, ?)', [id, nombre, unidad, cat]);
    }
  }

  // 3. Catálogo Dinámico de Roles de Cuadrilla
  const rolCuadCount = (await get('SELECT COUNT(*) as c FROM rol_cuadrilla_catalogo')).c;
  if (rolCuadCount === 0) {
    const roles = [
      ['operador_tractor', 'Operador de tractor', 'maquinaria'],
      ['operador_retro', 'Operador de retroexcavadora', 'maquinaria'],
      ['operador_bulldozer', 'Operador de bulldozer', 'maquinaria'],
      ['tecnico', 'Técnico / Ingeniero de campo', 'tecnico'],
      ['auxiliar', 'Auxiliar de campo / Peón', 'campo'],
      ['lider_posteo', 'Líder de posteo / cercado', 'infraestructura'],
      ['encargada', 'Encargada de obra / bodega', 'logistica']
    ];
    for (const [id, nombre, cat] of roles) {
      await run('INSERT INTO rol_cuadrilla_catalogo (id, nombre, categoria) VALUES (?, ?, ?)', [id, nombre, cat]);
    }
  }

  // 4. Catálogos base de Entidades, Proyectos, Predios, Obras y Maquinaria
  const entidadCount = (await get('SELECT COUNT(*) as c FROM entidad')).c;
  if (entidadCount === 0) {
    console.log('🌱 Sembrando catálogos base...');
    
    // Entidades
    const entidades = [
      ['ITZ', 'ITZ', 1],
      ['McClick', 'McClick', 2],
      ['Aspromex', 'Aspromex', 3],
      ['Balam', 'Balam', 4],
      ['Aquario', 'Aquario Transportes', 5],
      ['AQRS', 'AQR Services', 6],
      ['Agrokool', 'Agrokool', 7]
    ];
    for (const [id, nombre, odooId] of entidades) {
      await run('INSERT INTO entidad (id, nombre, odoo_company_id) VALUES (?, ?, ?)', [id, nombre, odooId]);
    }

    // Proyectos
    await run(`
      INSERT INTO proyecto (id, nombre, tipo, ciclo, superficie_meta_ha, fase_catalogo, inicio, fin)
      VALUES 
        ('PRJ-MAIZ-2026', 'Proyecto Maíz 2026', 'maiz', 'Maíz 2026', 120.0, 'V0_V2', '2026-05-01', '2026-11-30'),
        ('PRJ-REFOR-2026', 'Reforestación Parque Jabin', 'reforestacion', 'Reforestación 2026', 45.0, 'mantenimiento', '2026-01-01', '2026-12-31'),
        ('PRJ-INFRA-2026', 'Infraestructura y Cercado Ganadero', 'infraestructura', 'Infraestructura 2026', 30.0, 'cercado y corral', '2026-03-01', '2026-10-31')
    `);

    // 17 Predios
    const predios = [
      ['san_alberto', 'San Alberto', JSON.stringify(['Predio San Alberto', 'Cabaña-Cultivo']), 11.04, 11.04, 'propio', ''],
      ['san_luis', 'San Luis', JSON.stringify(['Predio San Luis']), 16.03, 16.03, 'propio', '5 postes CFE'],
      ['los_mangos', 'Los Mangos', JSON.stringify(['Los mangos', 'Hacienda Nueva']), 12.47, 10.47, 'propio', 'tubería CAPAE'],
      ['guayeme', 'Guayeme', JSON.stringify(['Predio Guayeme']), 37.67, 37.67, 'propio', ''],
      ['rach', 'Rach', JSON.stringify(['Predio R', 'Rach p2']), 1.83, 1.83, 'propio', ''],
      ['cristina', 'Cristina', JSON.stringify(['Predio C', 'Crisitna']), 5.51, 5.51, 'propio', ''],
      ['la_asuncion', 'La Asunción', JSON.stringify(['Asunción']), 146.48, 140.0, 'propio', ''],
      ['san_pedro', 'San Pedro', JSON.stringify(['San Pedro Sur', 'San Pedro Norte']), 180.41, 175.0, 'en_tramite', 'Pago pendiente RPP'],
      ['santa_teresita', 'Santa Teresita', JSON.stringify(['Rancho Teresita', 'La Magdalena']), 521.0, 500.0, 'propio', 'apiarios y corral'],
      ['arceo', 'Arceo', JSON.stringify(['Arceo 1', 'Arceo 2']), 332.0, 320.0, 'propio', ''],
      ['xpicob', 'Xpicob', JSON.stringify(['Ixpicob']), 5.37, 5.0, 'propio', 'acuícola'],
      ['zavala', 'Zavala', JSON.stringify(['Predio Zavala']), 49.37, 45.0, 'propio', ''],
      ['trece', 'Trece', JSON.stringify(['Predio 13']), 24.86, 24.0, 'propio', ''],
      ['maria', 'María', JSON.stringify(['Predio María']), 0.32, 0.32, 'propio', ''],
      ['vivero', 'Vivero Sembrando Vida', JSON.stringify(['Vivero']), 0.16, 0.16, 'propio', ''],
      ['parque_jabin', 'Parque Jabin', JSON.stringify(['Parque El Jabín', 'Jabin']), 45.0, 45.0, 'patrimonial', '9 postes CFE'],
      ['potrero_yeguas', 'Potrero Yeguas', JSON.stringify(['Potrero', 'WY', 'Perrera']), 30.0, 30.0, 'patrimonial', '']
    ];
    for (const [id, nombre, alias, supLegal, supUtil, regimen, restr] of predios) {
      await run('INSERT INTO predio (id, nombre, alias, superficie_legal_ha, superficie_util_ha, regimen, restricciones) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, nombre, alias, supLegal, supUtil, regimen, restr]);
    }

    // Obras
    const obras = [
      ['guayeme', 'Maíz Guayeme', JSON.stringify(['Guayeme']), 'PRJ-MAIZ-2026', 'Agrokool', 'monitoreo y control de plaga', 'operacion', 101, 'Karen / Abner'],
      ['sta_teresita', 'Desmonte Santa Teresita', JSON.stringify(['Santa Teresita', 'Magdalena']), 'PRJ-MAIZ-2026', 'Agrokool', 'despalme con retro', 'operacion', 102, 'Beche / Dorantes'],
      ['cluster_mangos', 'Siembra Clúster Mangos', JSON.stringify(['Clúster Mangos', 'Mangos']), 'PRJ-MAIZ-2026', 'Agrokool', 'siembra y fumigación', 'operacion', 103, 'Abner'],
      ['san_alberto', 'Maíz San Alberto', JSON.stringify(['San Alberto']), 'PRJ-MAIZ-2026', 'Agrokool', 'post-siembra', 'operacion', 104, 'Karen / Abner'],
      ['san_luis', 'San Luis', JSON.stringify(['San Luis']), 'PRJ-MAIZ-2026', 'Agrokool', 'siembra pospuesta por lluvia', 'standby', 105, 'Karen'],
      ['jabin', 'Reforestación Jabin', JSON.stringify(['Jabin']), 'PRJ-REFOR-2026', 'Agrokool', 'mantenimiento', 'mantenimiento', 106, 'Karen'],
      ['potrero_yeguas', 'Cercado Potrero Yeguas', JSON.stringify(['Potrero Yeguas']), 'PRJ-INFRA-2026', 'Agrokool', 'cercado y corral', 'operacion', 107, 'Karen']
    ];
    for (const [id, nombre, alias, projId, entidadId, fase, estado, threadId, resp] of obras) {
      await run('INSERT INTO obra (id, nombre, alias, proyecto_id, entidad_id, fase_actual, estado, tg_thread_id, responsable_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, nombre, alias, projId, entidadId, fase, estado, threadId, resp]);
    }

    // Asignar Predios
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('guayeme', 'guayeme')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('sta_teresita', 'santa_teresita')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('cluster_mangos', 'los_mangos')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('cluster_mangos', 'rach')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('cluster_mangos', 'cristina')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('san_alberto', 'san_alberto')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('san_luis', 'san_luis')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('jabin', 'parque_jabin')");
    await run("INSERT INTO obra_predio (obra_id, predio_id) VALUES ('potrero_yeguas', 'potrero_yeguas')");

    // Máquinas
    const maquinas = [
      ['puma', 'Puma (CASE IH 155)', 'tractor', 'Aspromex', 'Agrokool', 300, 288.0, 'Armando'],
      ['bulldozer_d6', 'Bulldozer D6', 'bulldozer', 'Aspromex', 'Agrokool', 300, 1420.5, 'Operador D6'],
      ['retro_new_holland', 'Retroexcavadora New Holland', 'retro', 'Aspromex', 'Agrokool', 300, 286.5, 'Alfredo'],
      ['dron_t70p', 'Dron DJI Agras T70P', 'dron', 'Aspromex', 'Agrokool', 100, 45.0, 'Abner'],
      ['sembradora_case', 'Sembradora Case PRO 6', 'sembradora', 'Madisa', 'Agrokool', 200, 80.0, 'Armando'],
      ['rastra_agricola', 'Rastra agrícola semipesada', 'rastra', 'Aspromex', 'Agrokool', 200, 110.0, 'Armando']
    ];
    for (const [id, nombre, tipo, prop, op, umbral, horo, opHab] of maquinas) {
      await run('INSERT INTO maquina (id, nombre, tipo, propietaria_id, operadora_id, umbral_servicio_hrs, horometro_actual, operador_habitual) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, nombre, tipo, prop, op, umbral, horo, opHab]);
    }

    // Activos
    const activos = [
      ['veleta_jabin', 'Veleta Parque Jabin', 'parque_jabin', 'veleta', 30, '2026-04-01', 'ok'],
      ['bomba_san_alberto', 'Bomba de pozo Rodase', 'san_alberto', 'bomba', 30, '2026-03-17', 'ok'],
      ['cisterna_san_alberto', 'Cisterna / Pileta', 'san_alberto', 'cisterna', 30, '2026-04-15', 'alerta'],
      ['cabana_san_alberto', 'Cabaña / Bodega', 'san_alberto', 'cabaña', 30, '2026-06-30', 'alerta'],
      ['cerco_san_alberto', 'Cerco perimetral', 'san_alberto', 'cerco', 30, '2026-06-30', 'ok']
    ];
    for (const [id, nombre, predioId, tipo, umbral, ultFec, ultEst] of activos) {
      await run('INSERT INTO activo (id, nombre, predio_id, tipo, umbral_dias_sin_lectura, ultima_lectura_fecha, ultimo_estado) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, nombre, predioId, tipo, umbral, ultFec, ultEst]);
    }

    // Incidencias
    await run(`
      INSERT INTO incidencia (folio, tipo, obra_id, maquina_id, estado, abierta_en, descripcion, causa_raiz)
      VALUES 
        ('F-14', 'falla_mecanica', 'sta_teresita', 'bulldozer_d6', 'verificacion', '2026-07-17 10:00:00', 'Bulldozer D6 sobrecalienta en jornada extendida', ''),
        ('F-21', 'plaga', 'guayeme', NULL, 'abierta', '2026-08-25 09:30:00', 'Brote de gusano cogollero detectado en lote 1', '')
    `);

    // Materiales
    await run(`
      INSERT INTO material (obra_id, insumo, requerido, en_sitio, pedido, unidad, eta, actualizado_en, autor_nombre)
      VALUES 
        ('potrero_yeguas', 'Varengas de madera', 90, 40, 50, 'pieza', 'sin_fecha', '2026-08-28 14:00:00', 'Karen'),
        ('potrero_yeguas', 'Postes de concreto', 50, 30, 20, 'pieza', 'sin_fecha', '2026-08-28 14:00:00', 'Karen'),
        ('guayeme', 'Fertilizante Triple 16', 40, 40, 0, 'bulto', '2026-08-20', '2026-08-28 14:00:00', 'Abner')
    `);

    // Mediciones
    await run(`
      INSERT INTO medicion (obra_id, predio_id, fecha, hectareas, fuente, autor_nombre)
      VALUES ('sta_teresita', 'santa_teresita', '2026-07-14', 12.3, 'dron', 'Abner (DJI T70P)')
    `);

    console.log('✅ Base de datos AGROK y catálogos inicializados.');
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb,
  hashPassword
};
