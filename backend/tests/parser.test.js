/**
 * Tests unitarios para el parser de reportes de AGROK
 * Ejecutar con: node tests/parser.test.js
 */

const { parseDailyReport, calculateFechaOperativa, formatYMD } = require('../parser');

// Framework de testing simple
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
  }

  assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(message || `Expected ${expectedStr} but got ${actualStr}`);
    }
  }

  async run() {
    console.log(`\n🧪 Running ${this.name}`);
    console.log('━'.repeat(60));

    for (const test of this.tests) {
      try {
        await test.fn(this);
        console.log(`✅ ${test.description}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.description}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log('━'.repeat(60));
    console.log(`Results: ${this.passed} passed, ${this.failed} failed\n`);
    return this.failed === 0;
  }
}

// Tests para parseDailyReport
const parserTests = new TestRunner('Parser Tests');

parserTests.test('Debe parsear reporte básico con obra', (t) => {
  const text = `
Obra: Guayeme
Fecha: 28/08/2026
Cuadrilla:
- 2 Operadores de tractor
- 5 Auxiliares
Actividades:
- Siembra de maíz
Avance: 10 ha
`;
  const result = parseDailyReport(text, new Date('2026-08-28'));
  
  t.assert(result.obra_id === 'guayeme', 'Debe identificar obra Guayeme');
  t.assert(result.cuadrilla.length === 2, 'Debe identificar 2 roles de cuadrilla');
  t.assert(result.actividades.length === 1, 'Debe identificar 1 actividad');
  t.assert(result.avances.length === 1, 'Debe identificar 1 avance');
  t.assertEqual(result.avances[0].cantidad, 10, 'Cantidad debe ser 10');
});

parserTests.test('Debe manejar texto vacío sin errores', (t) => {
  const result = parseDailyReport('');
  t.assert(result !== null, 'No debe devolver null');
  t.assert(result.obra_id === null, 'Obra debe ser null');
  t.assertEqual(result.cuadrilla.length, 0, 'Cuadrilla debe estar vacía');
});

parserTests.test('Debe manejar texto muy largo truncándolo', (t) => {
  const longText = 'A'.repeat(15000);
  const result = parseDailyReport(longText);
  t.assert(result !== null, 'No debe fallar con texto largo');
});

parserTests.test('Debe parsear múltiples avances en hectáreas', (t) => {
  const text = `
Avances:
- Predio Cristina: 5.5 ha
- Predio Rach: 2 ha
- Predio Los Mangos: 12.4 ha
`;
  const result = parseDailyReport(text);
  t.assert(result.avances.length >= 3, 'Debe identificar al menos 3 avances');
});

parserTests.test('Debe parsear avances en diferentes unidades', (t) => {
  const text = `
Avances:
- Obra civil: 50 m2
- Cercado: 120 ml
- Siembra: 8 ha
`;
  const result = parseDailyReport(text);
  t.assert(result.avances.length === 3, 'Debe identificar 3 avances con diferentes unidades');
  
  const unidades = result.avances.map(a => a.unidad);
  t.assert(unidades.includes('m2'), 'Debe incluir m2');
  t.assert(unidades.includes('ml'), 'Debe incluir ml');
  t.assert(unidades.includes('ha'), 'Debe incluir ha');
});

parserTests.test('Debe identificar predios por alias', (t) => {
  const text = `
Avance: 10 ha en Santa Teresita
Otro avance: 5 ha en Los Mangos
`;
  const result = parseDailyReport(text);
  t.assert(result.avances.length >= 2, 'Debe identificar 2 avances');
  
  const predios = result.avances.map(a => a.predio_id).filter(Boolean);
  t.assert(predios.length > 0, 'Debe identificar al menos un predio');
});

parserTests.test('Debe parsear cuadrilla con diferentes formatos', (t) => {
  const text = `
Cuadrilla:
- 3 Auxiliares
- Operador de bulldozer x 1
- 2 Técnicos agrícolas
`;
  const result = parseDailyReport(text);
  t.assert(result.cuadrilla.length === 3, 'Debe identificar 3 roles');
  t.assertEqual(result.cuadrilla[0].headcount, 3, 'Primer rol debe tener 3 personas');
});

parserTests.test('Debe detectar día sin actividad', (t) => {
  const text = `
Obra: Guayeme
Fecha: 28/08/2026
Sin actividad por lluvia
`;
  const result = parseDailyReport(text);
  t.assert(result !== null, 'Debe parsear reporte sin actividad');
});

// Tests para calculateFechaOperativa
const dateTests = new TestRunner('Date Calculation Tests');

dateTests.test('Debe usar fecha escrita si está cerca de fecha recibida', (t) => {
  const receivedDate = new Date('2026-08-28');
  const result = calculateFechaOperativa('28/08/2026', receivedDate);
  t.assertEqual(result, '2026-08-28', 'Debe usar la fecha escrita');
});

dateTests.test('Debe rechazar fecha muy antigua', (t) => {
  const receivedDate = new Date('2026-08-28');
  const result = calculateFechaOperativa('01/01/2010', receivedDate);
  t.assertEqual(result, '2026-08-28', 'Debe usar fecha recibida si la escrita es muy antigua');
});

dateTests.test('Debe manejar formato de fecha inválido', (t) => {
  const receivedDate = new Date('2026-08-28');
  const result = calculateFechaOperativa('fecha inválida', receivedDate);
  t.assertEqual(result, '2026-08-28', 'Debe usar fecha recibida si formato es inválido');
});

dateTests.test('Debe manejar fechas con día/mes fuera de rango', (t) => {
  const receivedDate = new Date('2026-08-28');
  const result = calculateFechaOperativa('32/13/2026', receivedDate);
  t.assertEqual(result, '2026-08-28', 'Debe usar fecha recibida si día/mes son inválidos');
});

// Tests de validación de entrada
const validationTests = new TestRunner('Input Validation Tests');

validationTests.test('Debe manejar null como entrada', (t) => {
  const result = parseDailyReport(null);
  t.assert(result !== null, 'No debe devolver null');
  t.assertEqual(result.cuadrilla.length, 0, 'Debe devolver estructura vacía');
});

validationTests.test('Debe manejar undefined como entrada', (t) => {
  const result = parseDailyReport(undefined);
  t.assert(result !== null, 'No debe devolver null');
});

validationTests.test('Debe manejar números como entrada', (t) => {
  const result = parseDailyReport(12345);
  t.assert(result !== null, 'No debe fallar con número');
});

validationTests.test('Debe rechazar headcount inválido', (t) => {
  const text = `
Cuadrilla:
- 999 Operadores
- -5 Auxiliares
`;
  const result = parseDailyReport(text);
  // Los valores inválidos deben ser rechazados o corregidos
  const headcounts = result.cuadrilla.map(c => c.headcount);
  t.assert(headcounts.every(h => h >= 1 && h <= 100), 'Headcounts deben estar en rango válido');
});

validationTests.test('Debe rechazar cantidades de hectáreas negativas', (t) => {
  const text = `Avance: -10 ha`;
  const result = parseDailyReport(text);
  // No debe parsear cantidades negativas
  const negativeCantidades = result.avances.filter(a => a.cantidad < 0);
  t.assertEqual(negativeCantidades.length, 0, 'No debe aceptar cantidades negativas');
});

// Ejecutar todos los tests
async function runAllTests() {
  console.log('\n🚀 AGROK Parser Test Suite');
  console.log('═'.repeat(60));
  
  const results = await Promise.all([
    parserTests.run(),
    dateTests.run(),
    validationTests.run()
  ]);
  
  const allPassed = results.every(r => r === true);
  
  if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!');
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Error running tests:', err);
    process.exit(1);
  });
}

module.exports = { TestRunner };
