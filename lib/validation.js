export function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone) {
  if (!phone) return false;
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function validateVIN(vin) {
  if (!vin) return false;
  return vin.length === 17 && /^[A-HJ-NPR-Z0-9]+$/i.test(vin);
}

export function validateZipCode(zip) {
  if (!zip) return false;
  return /^\d{5}(-\d{4})?$/.test(zip);
}

export function validateDate(date) {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
}

export function validatePositiveNumber(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

export function validateRequiredFields(data, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  return missing.length === 0 ? null : missing;
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

export function validateLeadStatus(status) {
  const validStatuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];
  return validStatuses.includes(status);
}

export function validateSaleStatus(status) {
  const validStatuses = ['Pending', 'Approved', 'Delivered', 'Completed', 'Cancelled'];
  return validStatuses.includes(status);
}

export function validateServiceStatus(status) {
  const validStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
  return validStatuses.includes(status);
}

export function validateRole(role) {
  const validRoles = ['admin', 'sales', 'service_manager', 'technician', 'accountant', 'inventory_manager'];
  return validRoles.includes(role);
}