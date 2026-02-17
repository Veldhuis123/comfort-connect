/**
 * Gedeelde input validatie helpers
 * Centralisatie van alle validatielogica voor consistentie en veiligheid
 */

const validateString = (value, fieldName, { min = 0, max = 255, required = false } = {}) => {
  if (required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
    return `${fieldName} is verplicht`;
  }
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return `${fieldName} moet tekst zijn`;
  if (value.trim().length < min) return `${fieldName} moet minimaal ${min} tekens zijn`;
  if (value.length > max) return `${fieldName} mag maximaal ${max} tekens bevatten`;
  return null;
};

const validateEmail = (value, { required = false } = {}) => {
  if (required && !value) return 'E-mailadres is verplicht';
  if (!value) return null;
  if (typeof value !== 'string' || value.length > 255) return 'E-mail mag maximaal 255 tekens bevatten';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ongeldig e-mailadres';
  return null;
};

const validatePhone = (value) => {
  if (!value) return null;
  if (typeof value !== 'string' || value.length > 20) return 'Telefoonnummer mag maximaal 20 tekens bevatten';
  // Only allow digits, spaces, +, -, (, )
  if (!/^[0-9\s\+\-\(\)]+$/.test(value)) return 'Telefoonnummer bevat ongeldige tekens';
  return null;
};

const validateNumber = (value, fieldName, { min, max, required = false } = {}) => {
  if (required && (value === null || value === undefined)) return `${fieldName} is verplicht`;
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || isNaN(value)) return `${fieldName} moet een getal zijn`;
  if (min !== undefined && value < min) return `${fieldName} moet minimaal ${min} zijn`;
  if (max !== undefined && value > max) return `${fieldName} mag maximaal ${max} zijn`;
  return null;
};

const validateEnum = (value, fieldName, allowedValues, { required = false } = {}) => {
  if (required && !value) return `${fieldName} is verplicht`;
  if (!value) return null;
  if (!allowedValues.includes(value)) return `Ongeldige waarde voor ${fieldName}`;
  return null;
};

const validateId = (value) => {
  if (!value) return 'ID is verplicht';
  const id = parseInt(value, 10);
  if (isNaN(id) || id < 1) return 'Ongeldig ID';
  return null;
};

/**
 * Sanitize a string value (trim whitespace)
 */
const sanitize = (value) => {
  if (!value || typeof value !== 'string') return null;
  return value.trim();
};

/**
 * Sanitize email (trim + lowercase)
 */
const sanitizeEmail = (value) => {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase();
};

/**
 * Run multiple validations at once, return first error or null
 */
const validate = (validations) => {
  for (const error of validations) {
    if (error) return error;
  }
  return null;
};

/**
 * Express middleware: validate req.params.id as integer
 */
const validateParamId = (req, res, next) => {
  const error = validateId(req.params.id);
  if (error) return res.status(400).json({ error });
  req.params.id = parseInt(req.params.id, 10);
  next();
};

module.exports = {
  validateString,
  validateEmail,
  validatePhone,
  validateNumber,
  validateEnum,
  validateId,
  sanitize,
  sanitizeEmail,
  validate,
  validateParamId
};
