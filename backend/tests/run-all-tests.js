/**
 * Test runner principal para ejecutar todos los tests de AGROK
 * Uso: npm test
 */

const { spawn } = require('child_process');
const path = require('path');

const testFiles = [
  'parser.test.js',
  'validators.test.js'
];

console.log('🚀 AGROK Complete Test Suite');
console.log('═'.repeat(70));
console.log('');

let currentTest = 0;
let failedTests = [];

function runNextTest() {
  if (currentTest >= testFiles.length) {
    // Todos los tests completados
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(70));
    
    if (failedTests.length === 0) {
      console.log('✅ Todos los tests pasaron exitosamente!');
      console.log(`   Total: ${testFiles.length} suites de tests`);
      process.exit(0);
    } else {
      console.log(`❌ ${failedTests.length} suite(s) de tests fallaron:`);
      failedTests.forEach(test => {
        console.log(`   - ${test}`);
      });
      console.log('');
      process.exit(1);
    }
    return;
  }

  const testFile = testFiles[currentTest];
  const testPath = path.join(__dirname, testFile);

  console.log(`\n▶️  Ejecutando: ${testFile}`);
  console.log('─'.repeat(70));

  const testProcess = spawn('node', [testPath], {
    stdio: 'inherit',
    shell: true
  });

  testProcess.on('close', (code) => {
    if (code !== 0) {
      failedTests.push(testFile);
    }
    
    currentTest++;
    runNextTest();
  });

  testProcess.on('error', (err) => {
    console.error(`❌ Error ejecutando ${testFile}:`, err.message);
    failedTests.push(testFile);
    currentTest++;
    runNextTest();
  });
}

// Iniciar ejecución de tests
runNextTest();
