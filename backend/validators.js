/**
 * Validadores y sanitizadores de entrada para AGROK
 * Previene SQL injection, XSS y otros ataques
 */

/**
 * Sanitiza una cadena de texto removiendo caracteres peligrosos
 * @param {string} input - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Valida un nombre de usuario
 * @param {string} username - Nombre de usuario a validar
 * @returns {{valid: boolean, error?: string}}
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Nombre de usuario requerido' };
  }
  
  const clean = sanitizeInput(username);
  if (clean.length < 3) {
    return { valid: false, error: 'Nombre de usuario debe tener al menos 3 caracteres' };
  }
  if (clean.length > 50) {
    return { valid: false, error: 'Nombre de usuario demasiado largo (máx 50 caracteres)' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, error: 'Nombre de usuario solo puede contener letras, números, guiones y guiones bajos' };
  }
  
  return { valid: true, value: clean.toLowerCase() };
}

/**
 * Valida una contraseña
 * @param {string} password - Contraseña a validar
 * @returns {{valid: boolean, error?: string}}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Contraseña requerida' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }
  if (password.length > 100) {
    return { valid: false, error: 'Contraseña demasiado larga' };
  }
  
  return { valid: true };
}

/**
 * Valida un email (básico)
 * @param {string} email - Email a validar
 * @returns {{valid: boolean, error?: string}}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email requerido' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }
  
  return { valid: true, value: email.toLowerCase() };
}

/**
 * Valida un número positivo
 * @param {*} value - Valor a validar
 * @param {string} fieldName - Nombre del campo (para mensajes de error)
 * @returns {{valid: boolean, error?: string, value?: number}}
 */
function validatePositiveNumber(value, fieldName = 'Valor') {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} debe ser un número` };
  }
  if (num < 0) {
    return { valid: false, error: `${fieldName} debe ser positivo` };
  }
  return { valid: true, value: num };
}

/**
 * Valida una fecha en formato ISO
 * @param {string} dateStr - Fecha a validar
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateDate(dateStr) {
  if (!dateStr) {
    return { valid: false, error: 'Fecha requerida' };
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Fecha inválida' };
  }
  
  return { valid: true, value: date.toISOString().split('T')[0] };
}

/**
 * Valida un ID alfanumérico
 * @param {string} id - ID a validar
 * @param {string} fieldName - Nombre del campo
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateId(id, fieldName = 'ID') {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: `${fieldName} requerido` };
  }
  
  const clean = sanitizeInput(id);
  if (clean.length < 1 || clean.length > 100) {
    return { valid: false, error: `${fieldName} inválido` };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, error: `${fieldName} solo puede contener letras, números, guiones y guiones bajos` };
  }
  
  return { valid: true, value: clean };
}

/**
 * Valida un rol de usuario
 * @param {string} rol - Rol a validar
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateUserRole(rol) {
  const validRoles = ['campo', 'supervisor', 'direccion', 'it'];
  
  if (!rol) {
    return { valid: true, value: 'campo' }; // Default
  }
  
  if (!validRoles.includes(rol)) {
    return { valid: false, error: `Rol inválido. Debe ser: ${validRoles.join(', ')}` };
  }
  
  return { valid: true, value: rol };
}

/**
 * Escapa caracteres especiales de SQL para prevenir inyección
 * Nota: Se recomienda usar prepared statements en su lugar
 * @param {string} value - Valor a escapar
 * @returns {string} Valor escapado
 */
function escapeSql(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/'/g, "''");
}

module.exports = {
  sanitizeInput,
  validateUsername,
  validatePassword,
  validateEmail,
  validatePositiveNumber,
  validateDate,
  validateId,
  validateUserRole,
  escapeSql
};
