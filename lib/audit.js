import { query } from './db';

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  ipAddress = null
}) {
  try {
    const result = await query(
      `INSERT INTO audit_logs (
        log_id, user_id, action, entity_type, entity_id, 
        old_values, new_values, timestamp, ip_address
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING *`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error - audit logging should not break main functionality
    return null;
  }
}

export function getIpAddress(request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const real = request.headers.get('x-real-ip');
    if (real) {
      return real;
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error getting IP address:', error);
    return 'unknown';
  }
}

export async function logCreate(userId, entityType, entityId, newValues, request) {
  return createAuditLog({
    userId,
    action: 'CREATE',
    entityType,
    entityId,
    oldValues: null,
    newValues,
    ipAddress: getIpAddress(request)
  });
}

export async function logUpdate(userId, entityType, entityId, oldValues, newValues, request) {
  return createAuditLog({
    userId,
    action: 'UPDATE',
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress: getIpAddress(request)
  });
}

export async function logDelete(userId, entityType, entityId, oldValues, request) {
  return createAuditLog({
    userId,
    action: 'DELETE',
    entityType,
    entityId,
    oldValues,
    newValues: null,
    ipAddress: getIpAddress(request)
  });
}

export async function logLogin(userId, request) {
  return createAuditLog({
    userId,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: userId,
    oldValues: null,
    newValues: null,
    ipAddress: getIpAddress(request)
  });
}

export async function logLogout(userId, request) {
  return createAuditLog({
    userId,
    action: 'LOGOUT',
    entityType: 'USER',
    entityId: userId,
    oldValues: null,
    newValues: null,
    ipAddress: getIpAddress(request)
  });
}