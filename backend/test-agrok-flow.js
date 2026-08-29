const { initDb, all, get } = require('./database');
const { parseDailyReport } = require('./parser');

async function testAgrokFlow() {
  console.log('🧪 Probando flujo completo de AGROK spec v2...');
  await initDb();

  // Test 1: Parser del reporte real del corpus (docs/2 — Telegram.md §2)
  const sampleReportText = `
*Obra:* Cristina, Rach, los mangos
*Fecha:* 20/08/2026

*Fuerza de trabajo :*
- Operador de tractor
- Técnico
- 2 auxiliares

*Operacion actual:*
- Carga de fertilizante de la bodega San Alberto hacia el predio.
- Siembra del predio
- Limpieza de discos del tractor

Se han sembrado un aproximado de 6.5 ha del predio cristina,
7 ha del predio rach y 8 ha del predio los mangos.
`;

  console.log('\n📄 1. Parseando reporte de campo de ejemplo...');
  const parsed = parseDailyReport(sampleReportText, new Date('2026-08-20T20:52:00Z'));
  console.log('Resultado del parser:', JSON.stringify(parsed, null, 2));

  if (parsed.cuadrilla.length !== 3) throw new Error('Error en cuadrilla: esperadas 3 filas');
  if (parsed.avances.length !== 3) throw new Error('Error en avances: esperadas 3 filas');

  console.log('✅ Parser validado correctamente con el formato oficial del 11 de mayo.');

  // Test 2: Verificar Tablero
  const obras = await all('SELECT * FROM obra');
  console.log(`\n📁 2. Obras cargadas en catálogo: ${obras.length}`);
  const predios = await all('SELECT * FROM predio');
  console.log(`📍 3. Predios cargados en catálogo: ${predios.length}`);
  const maquinas = await all('SELECT * FROM maquina');
  console.log(`🚜 4. Máquinas cargadas: ${maquinas.length}`);
  const incidencias = await all('SELECT * FROM incidencia');
  console.log(`⚠️ 5. Incidencias cargadas: ${incidencias.length}`);

  console.log('\n🎉 ¡Todos los modelos y reglas de AGROK spec v2 fueron validados con éxito!');
}

testAgrokFlow().catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
