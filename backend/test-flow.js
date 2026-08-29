// Script de prueba automatizada para verificar el flujo de sincronización de reportes offline
const { initDb, run, get, all } = require('./database');

async function runTests() {
  console.log('🧪 Iniciando prueba automatizada del flujo de sincronización Offline-First...');
  
  await initDb();
  console.log('✅ Base de datos inicializada.');

  // 1. Verificar proyectos
  const projects = await all('SELECT * FROM projects');
  console.log(`📁 Proyectos encontrados en BD: ${projects.length}`);
  if (projects.length === 0) throw new Error('No hay proyectos');

  const testProject = projects[0];
  console.log(`📌 Usando proyecto para la prueba: [${testProject.code}] ${testProject.name}`);

  // 2. Simular captura de reporte offline con fecha y hora anterior
  const offlineTimestamp = '2026-08-29 08:30:00'; // Hora real en campo
  const clientUuid = 'test-uuid-' + Date.now();
  const advancePercent = 15;
  const operatorName = 'Carlos Mendoza (Operador de Prueba)';
  const notes = 'Reporte offline de prueba con timestamp inmutable.';

  console.log(`⏱️ Registrando reporte offline simulado capturado a las: ${offlineTimestamp}`);

  const insertResult = await run(`
    INSERT INTO reports (
      client_uuid, project_id, project_name, task_id, task_name,
      operator_name, advance_percent, notes, offline_created_at, synced_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'SINCRONIZADO')
  `, [
    clientUuid,
    testProject.id,
    testProject.name,
    null,
    'General',
    operatorName,
    advancePercent,
    notes,
    offlineTimestamp
  ]);

  console.log(`✅ Reporte insertado con ID: ${insertResult.id}`);

  // 3. Verificar que el reporte retenga la hora offline exacta y la hora de sincronización
  const savedReport = await get('SELECT * FROM reports WHERE id = ?', [insertResult.id]);
  console.log('🔍 Reporte recuperado de base de datos:');
  console.log({
    id: savedReport.id,
    proyecto: savedReport.project_name,
    operador: savedReport.operator_name,
    avance: `+${savedReport.advance_percent}%`,
    hora_captura_offline: savedReport.offline_created_at,
    hora_sincronizacion_servidor: savedReport.synced_at,
    estado: savedReport.status
  });

  if (savedReport.offline_created_at !== offlineTimestamp) {
    throw new Error('❌ La fecha de captura offline no coincide!');
  }

  // 4. Actualizar avance del proyecto
  const newProgress = Math.min(100, (testProject.progress_percent || 0) + advancePercent);
  await run('UPDATE projects SET progress_percent = ? WHERE id = ?', [newProgress, testProject.id]);
  const updatedProject = await get('SELECT * FROM projects WHERE id = ?', [testProject.id]);
  console.log(`📈 Avance del proyecto actualizado: ${testProject.progress_percent}% -> ${updatedProject.progress_percent}%`);

  console.log('🎉 ¡Todas las pruebas del flujo offline-first pasaron exitosamente!');
}

runTests().catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
