/**
 * Tests unitarios para los validadores de AGROK
 * Ejecutar con: node tests/validators.test.js
 */

const {
  sanitizeInput,
  validateUsername,
  validatePassword,
  validateEmail,
  validatePositiveNumber,
  validateDate,
  validateId,
  validateUserRole
} = require('../validators');

const { TestRunner } = require('./parser.test');

// Tests para sanitizeInput
const sanitizeTests = new TestRunner('Sanitize Input Tests');

sanitizeTests.test('Debe remover caracteres peligrosos', (t) => {
  const result = sanitizeInput('<script>alert("xss")</script>');
  t.assert(!result.includes('<'), 'No debe contener <');
  t.assert(!result.includes('>'), 'No debe contener >');
});

sanitizeTests.test('Debe mantener texto normal', (t) => {
  const result = sanitizeInput('Operador Juan Pérez');
  t.assertEqual(result, 'Operador Juan Pérez', 'Debe mantener texto normal');
});

sanitizeTests.test('Debe hacer trim del texto', (t) => {
  const result = sanitizeInput('  texto con espacios  ');
  t.assertEqual(result, 'texto con espacios', 'Debe hacer trim');
});

sanitizeTests.test('Debe manejar tipos no string', (t) => {
  t.assertEqual(sanitizeInput(123), 123, 'Debe devolver números sin cambios');
  t.assertEqual(sanitizeInput(null), null, 'Debe devolver null sin cambios');
});

// Tests para validateUsername
const usernameTests = new TestRunner('Username Validation Tests');

usernameTests.test('Debe aceptar username válido', (t) => {
  const result = validateUsername('usuario123');
  t.assert(result.valid, 'Username válido debe ser aceptado');
  t.assertEqual(result.value, 'usuario123', 'Debe devolver el username');
});

usernameTests.test('Debe rechazar username muy corto', (t) => {
  const result = validateUsername('ab');
  t.assert(!result.valid, 'Username muy corto debe ser rechazado');
  t.assert(result.error, 'Debe incluir mensaje de error');
});

usernameTests.test('Debe rechazar username muy largo', (t) => {
  const result = validateUsername('a'.repeat(100));
  t.assert(!result.valid, 'Username muy largo debe ser rechazado');
});

usernameTests.test('Debe rechazar username con caracteres inválidos', (t) => {
  const result = validateUsername('usuario@test.com');
  t.assert(!result.valid, 'Username con @ debe ser rechazado');
});

usernameTests.test('Debe aceptar username con guiones', (t) => {
  const result = validateUsername('usuario-123_test');
  t.assert(result.valid, 'Username con guiones y guiones bajos debe ser aceptado');
});

usernameTests.test('Debe convertir a minúsculas', (t) => {
  const result = validateUsername('Usuario123');
  t.assert(result.valid, 'Debe ser válido');
  t.assertEqual(result.value, 'usuario123', 'Debe convertir a minúsculas');
});

// Tests para validatePassword
const passwordTests = new TestRunner('Password Validation Tests');

passwordTests.test('Debe aceptar password válido', (t) => {
  const result = validatePassword('password123');
  t.assert(result.valid, 'Password válido debe ser aceptado');
});

passwordTests.test('Debe rechazar password muy corto', (t) => {
  const result = validatePassword('12345');
  t.assert(!result.valid, 'Password muy corto debe ser rechazado');
});

passwordTests.test('Debe rechazar password vacío', (t) => {
  const result = validatePassword('');
  t.assert(!result.valid, 'Password vacío debe ser rechazado');
});

passwordTests.test('Debe rechazar password null', (t) => {
  const result = validatePassword(null);
  t.assert(!result.valid, 'Password null debe ser rechazado');
});

passwordTests.test('Debe rechazar password extremadamente largo', (t) => {
  const result = validatePassword('a'.repeat(200));
  t.assert(!result.valid, 'Password extremadamente largo debe ser rechazado');
});

// Tests para validateEmail
const emailTests = new TestRunner('Email Validation Tests');

emailTests.test('Debe aceptar email válido', (t) => {
  const result = validateEmail('usuario@ejemplo.com');
  t.assert(result.valid, 'Email válido debe ser aceptado');
});

emailTests.test('Debe rechazar email sin @', (t) => {
  const result = validateEmail('usuario.ejemplo.com');
  t.assert(!result.valid, 'Email sin @ debe ser rechazado');
});

emailTests.test('Debe rechazar email sin dominio', (t) => {
  const result = validateEmail('usuario@');
  t.assert(!result.valid, 'Email sin dominio debe ser rechazado');
});

emailTests.test('Debe convertir email a minúsculas', (t) => {
  const result = validateEmail('Usuario@Ejemplo.COM');
  t.assert(result.valid, 'Debe ser válido');
  t.assertEqual(result.value, 'usuario@ejemplo.com', 'Debe convertir a minúsculas');
});

// Tests para validatePositiveNumber
const numberTests = new TestRunner('Positive Number Validation Tests');

numberTests.test('Debe aceptar número positivo válido', (t) => {
  const result = validatePositiveNumber(42);
  t.assert(result.valid, 'Número positivo debe ser aceptado');
  t.assertEqual(result.value, 42, 'Debe devolver el número');
});

numberTests.test('Debe aceptar cero', (t) => {
  const result = validatePositiveNumber(0);
  t.assert(result.valid, 'Cero debe ser aceptado');
});

numberTests.test('Debe rechazar número negativo', (t) => {
  const result = validatePositiveNumber(-10);
  t.assert(!result.valid, 'Número negativo debe ser rechazado');
});

numberTests.test('Debe rechazar texto', (t) => {
  const result = validatePositiveNumber('texto');
  t.assert(!result.valid, 'Texto debe ser rechazado');
});

numberTests.test('Debe aceptar string numérico', (t) => {
  const result = validatePositiveNumber('42.5');
  t.assert(result.valid, 'String numérico debe ser aceptado');
  t.assertEqual(result.value, 42.5, 'Debe convertir a número');
});

// Tests para validateDate
const dateValidationTests = new TestRunner('Date Validation Tests');

dateValidationTests.test('Debe aceptar fecha válida', (t) => {
  const result = validateDate('2026-08-28');
  t.assert(result.valid, 'Fecha válida debe ser aceptada');
});

dateValidationTests.test('Debe rechazar fecha inválida', (t) => {
  const result = validateDate('fecha-invalida');
  t.assert(!result.valid, 'Fecha inválida debe ser rechazada');
});

dateValidationTests.test('Debe formatear fecha correctamente', (t) => {
  const result = validateDate('2026-08-28T10:30:00.000Z');
  t.assert(result.valid, 'Fecha ISO debe ser válida');
  t.assertEqual(result.value, '2026-08-28', 'Debe formatear como YYYY-MM-DD');
});

// Tests para validateId
const idTests = new TestRunner('ID Validation Tests');

idTests.test('Debe aceptar ID válido', (t) => {
  const result = validateId('proyecto-123');
  t.assert(result.valid, 'ID válido debe ser aceptado');
});

idTests.test('Debe rechazar ID vacío', (t) => {
  const result = validateId('');
  t.assert(!result.valid, 'ID vacío debe ser rechazado');
});

idTests.test('Debe rechazar ID con caracteres especiales', (t) => {
  const result = validateId('proyecto@123');
  t.assert(!result.valid, 'ID con @ debe ser rechazado');
});

// Tests para validateUserRole
const roleTests = new TestRunner('User Role Validation Tests');

roleTests.test('Debe aceptar rol válido', (t) => {
  const result = validateUserRole('supervisor');
  t.assert(result.valid, 'Rol supervisor debe ser válido');
});

roleTests.test('Debe rechazar rol inválido', (t) => {
  const result = validateUserRole('admin');
  t.assert(!result.valid, 'Rol no existente debe ser rechazado');
});

roleTests.test('Debe usar default si no se provee rol', (t) => {
  const result = validateUserRole('');
  t.assert(result.valid, 'Debe aceptar vacío con default');
  t.assertEqual(result.value, 'campo', 'Debe usar campo como default');
});

roleTests.test('Debe aceptar todos los roles válidos', (t) => {
  const validRoles = ['campo', 'supervisor', 'direccion', 'it'];
  
  validRoles.forEach(rol => {
    const result = validateUserRole(rol);
    t.assert(result.valid, `Rol ${rol} debe ser válido`);
  });
});

// Ejecutar todos los tests
async function runAllTests() {
  console.log('\n🚀 AGROK Validators Test Suite');
  console.log('═'.repeat(60));
  
  const results = await Promise.all([
    sanitizeTests.run(),
    usernameTests.run(),
    passwordTests.run(),
    emailTests.run(),
    numberTests.run(),
    dateValidationTests.run(),
    idTests.run(),
    roleTests.run()
  ]);
  
  const allPassed = results.every(r => r === true);
  
  if (allPassed) {
    console.log('✅ All validator tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some validator tests failed!');
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
