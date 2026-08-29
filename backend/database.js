const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos SQLite:', err.message);
  } else {
    console.log('✅ Base de datos SQLite conectada en:', dbPath);
  }
});

// Helper para ejecutar consultas con Promises
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

// Inicialización de esquemas
async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      status TEXT DEFAULT 'EN_PROCESO',
      progress_percent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'PENDIENTE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_uuid TEXT UNIQUE,
      project_id INTEGER NOT NULL,
      project_name TEXT,
      task_id INTEGER,
      task_name TEXT,
      operator_name TEXT NOT NULL,
      advance_percent INTEGER NOT NULL,
      notes TEXT,
      offline_created_at TEXT NOT NULL,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'SINCRONIZADO',
      FOREIGN KEY (project_id) REFERENCES projects (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS telegram_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      role TEXT NOT NULL, -- 'supervisor', 'lider', 'general'
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

  // Sembrar datos iniciales si no existen proyectos
  const existingProjects = await all('SELECT COUNT(*) as count FROM projects');
  if (existingProjects[0].count === 0) {
    console.log('🌱 Sembrando proyectos de prueba iniciales...');
    
    const p1 = await run(
      `INSERT INTO projects (code, name, description, location, progress_percent) VALUES (?, ?, ?, ?, ?)`,
      ['PRJ-001', 'Instalación de Fibra Óptica Sector Norte', 'Tendido de cable troncal y empalmes subterráneos.', 'Distrito Norte - Zona 4', 35]
    );

    await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [p1.id, 'Excavación y ductería tramo A', 'Apertura de zanjas y colocación de tubos']);
    await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [p1.id, 'Tendido de cable de 48 hilos', 'Tendido y fijación en postes y canalizaciones']);
    await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [p1.id, 'Fusionado y pruebas OTDR', 'Empalmes por fusión y certificación']);

    const p2 = await run(
      `INSERT INTO projects (code, name, description, location, progress_percent) VALUES (?, ?, ?, ?, ?)`,
      ['PRJ-002', 'Mantenimiento de Torres Celulares Base 12', 'Revisión estructural, pintura y calibración de antenas.', 'Cerro Azul - Sitio 12', 15]
    );

    await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [p2.id, 'Inspección de anclajes y vientos', 'Torque de pernos y revisión de tensión']);
    await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [p2.id, 'Cambio de conectores RF', 'Reemplazo preventivo en sector Alpha']);

    const p3 = await run(
      `INSERT INTO projects (code, name, description, location, progress_percent) VALUES (?, ?, ?, ?, ?)`,
      ['PRJ-003', 'Adecuación Eléctrica Planta Central', 'Instalación de banco de baterías e inversor híbrido.', 'Sede Principal - Sala UPS', 60]
    );

    await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [p3.id, 'Montaje de racks de baterías', 'Armado mecánico de gabinetes']);
    await run(`INSERT INTO tasks (project_id, name, description) VALUES (?, ?, ?)`, [p3.id, 'Cableado de fuerza 48V DC', 'Conexión con terminales ponchados']);
    
    console.log('✅ Proyectos iniciales creados con éxito.');
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
