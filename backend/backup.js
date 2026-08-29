/**
 * Script de backup para la base de datos SQLite de AGROK
 * Uso: node backup.js
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const BACKUP_DIR = path.join(__dirname, 'backups');

/**
 * Crea un backup de la base de datos
 */
function createBackup() {
  try {
    // Crear directorio de backups si no existe
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('📁 Directorio de backups creado');
    }

    // Verificar que existe la base de datos
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ Error: No se encontró la base de datos en:', DB_PATH);
      process.exit(1);
    }

    // Generar nombre del archivo de backup con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `agrok-backup-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Copiar el archivo
    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ Backup creado exitosamente:');
    console.log(`   📄 Archivo: ${backupFileName}`);
    console.log(`   📊 Tamaño: ${fileSizeMB} MB`);
    console.log(`   📍 Ubicación: ${backupPath}`);

    // Limpiar backups antiguos (mantener solo los últimos 10)
    cleanOldBackups();

    return backupPath;
  } catch (error) {
    console.error('❌ Error al crear backup:', error.message);
    process.exit(1);
  }
}

/**
 * Limpia backups antiguos, manteniendo solo los últimos N
 */
function cleanOldBackups(keepCount = 10) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('agrok-backup-') && f.endsWith('.sqlite'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > keepCount) {
      console.log(`\n🧹 Limpiando backups antiguos (manteniendo ${keepCount} más recientes)...`);
      const toDelete = files.slice(keepCount);
      
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`   🗑️  Eliminado: ${file.name}`);
      });

      console.log(`✅ Limpieza completada. ${toDelete.length} backup(s) eliminado(s).`);
    }
  } catch (error) {
    console.warn('⚠️ Error al limpiar backups antiguos:', error.message);
  }
}

/**
 * Lista todos los backups disponibles
 */
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('📁 No hay backups disponibles');
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('agrok-backup-') && f.endsWith('.sqlite'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          path: path.join(BACKUP_DIR, f),
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (files.length === 0) {
      console.log('📁 No hay backups disponibles');
      return [];
    }

    console.log(`\n📋 Backups disponibles (${files.length}):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    files.forEach((file, idx) => {
      console.log(`${idx + 1}. ${file.name}`);
      console.log(`   📅 ${new Date(file.date).toLocaleString()}`);
      console.log(`   📊 ${file.size}`);
      console.log('');
    });

    return files;
  } catch (error) {
    console.error('❌ Error al listar backups:', error.message);
    return [];
  }
}

/**
 * Restaura un backup
 */
function restoreBackup(backupName) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);

    if (!fs.existsSync(backupPath)) {
      console.error('❌ Error: Backup no encontrado:', backupName);
      process.exit(1);
    }

    // Crear backup del estado actual antes de restaurar
    console.log('🔄 Creando backup de seguridad del estado actual...');
    const safetyBackupName = `agrok-backup-before-restore-${Date.now()}.sqlite`;
    const safetyBackupPath = path.join(BACKUP_DIR, safetyBackupName);
    fs.copyFileSync(DB_PATH, safetyBackupPath);
    console.log(`✅ Backup de seguridad creado: ${safetyBackupName}`);

    // Restaurar el backup seleccionado
    console.log(`\n🔄 Restaurando backup: ${backupName}...`);
    fs.copyFileSync(backupPath, DB_PATH);

    console.log('✅ Base de datos restaurada exitosamente');
    console.log('⚠️  Recuerda reiniciar el servidor para que los cambios surtan efecto');

  } catch (error) {
    console.error('❌ Error al restaurar backup:', error.message);
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list' || command === 'ls') {
  listBackups();
} else if (command === 'restore' || command === 'r') {
  const backupName = args[1];
  if (!backupName) {
    console.error('❌ Error: Especifica el nombre del backup a restaurar');
    console.log('Uso: node backup.js restore <nombre-del-backup>');
    listBackups();
    process.exit(1);
  }
  restoreBackup(backupName);
} else if (command === 'help' || command === 'h') {
  console.log('📘 AGROK Database Backup Tool');
  console.log('\nComandos disponibles:');
  console.log('  node backup.js              - Crear un nuevo backup');
  console.log('  node backup.js list         - Listar backups disponibles');
  console.log('  node backup.js restore <nombre> - Restaurar un backup');
  console.log('  node backup.js help         - Mostrar esta ayuda');
} else if (!command) {
  // Sin comando = crear backup
  createBackup();
} else {
  console.error('❌ Comando desconocido:', command);
  console.log('Usa "node backup.js help" para ver los comandos disponibles');
  process.exit(1);
}
