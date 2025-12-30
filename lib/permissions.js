export const ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  SERVICE_MANAGER: 'service_manager',
  TECHNICIAN: 'technician',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager'
};

export const PERMISSIONS = {
  // Lead permissions
  VIEW_LEADS: ['admin', 'sales'],
  CREATE_LEADS: ['admin', 'sales'],
  EDIT_LEADS: ['admin', 'sales'],
  DELETE_LEADS: ['admin'],
  ASSIGN_LEADS: ['admin', 'sales'],
  
  // Customer permissions
  VIEW_CUSTOMERS: ['admin', 'sales', 'service_manager', 'accountant'],
  CREATE_CUSTOMERS: ['admin', 'sales'],
  EDIT_CUSTOMERS: ['admin', 'sales'],
  DELETE_CUSTOMERS: ['admin'],
  
  // Sales permissions
  VIEW_SALES: ['admin', 'sales', 'accountant'],
  CREATE_SALES: ['admin', 'sales'],
  EDIT_SALES: ['admin', 'sales'],
  APPROVE_SALES: ['admin'],
  DELETE_SALES: ['admin'],
  
  // Vehicle permissions
  VIEW_VEHICLES: ['admin', 'sales', 'inventory_manager'],
  CREATE_VEHICLES: ['admin', 'inventory_manager'],
  EDIT_VEHICLES: ['admin', 'inventory_manager'],
  DELETE_VEHICLES: ['admin', 'inventory_manager'],
  
  // Parts permissions
  VIEW_PARTS: ['admin', 'service_manager', 'technician', 'inventory_manager'],
  CREATE_PARTS: ['admin', 'inventory_manager'],
  EDIT_PARTS: ['admin', 'inventory_manager'],
  DELETE_PARTS: ['admin', 'inventory_manager'],
  
  // Service permissions
  VIEW_APPOINTMENTS: ['admin', 'service_manager', 'technician'],
  CREATE_APPOINTMENTS: ['admin', 'service_manager'],
  EDIT_APPOINTMENTS: ['admin', 'service_manager'],
  DELETE_APPOINTMENTS: ['admin', 'service_manager'],
  
  VIEW_REPAIR_ORDERS: ['admin', 'service_manager', 'technician', 'accountant'],
  CREATE_REPAIR_ORDERS: ['admin', 'service_manager'],
  EDIT_REPAIR_ORDERS: ['admin', 'service_manager', 'technician'],
  COMPLETE_REPAIR_ORDERS: ['admin', 'service_manager'],
  
  // Financial permissions
  VIEW_TRANSACTIONS: ['admin', 'accountant'],
  CREATE_TRANSACTIONS: ['admin', 'accountant'],
  APPROVE_TRANSACTIONS: ['admin'],
  
  // Communication permissions
  VIEW_COMMUNICATIONS: ['admin', 'sales', 'service_manager'],
  SEND_COMMUNICATIONS: ['admin', 'sales', 'service_manager'],
  
  // Document permissions
  VIEW_DOCUMENTS: ['admin', 'sales', 'service_manager', 'accountant'],
  UPLOAD_DOCUMENTS: ['admin', 'sales', 'service_manager'],
  DELETE_DOCUMENTS: ['admin'],
  
  // Audit permissions
  VIEW_AUDIT_LOGS: ['admin'],
  
  // User management
  VIEW_USERS: ['admin'],
  CREATE_USERS: ['admin'],
  EDIT_USERS: ['admin'],
  DELETE_USERS: ['admin']
};

export function hasPermission(userRole, permission) {
  if (!userRole || !permission) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
}

export function canAccessResource(userRole, resourceType, action) {
  const permissionKey = `${action.toUpperCase()}_${resourceType.toUpperCase()}`;
  return hasPermission(userRole, permissionKey);
}

export function checkPermission(user, permission) {
  if (!user || !user.role) {
    throw new Error('Unauthorized: No user or role found');
  }
  
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Forbidden: User does not have ${permission} permission`);
  }
  
  return true;
}

export function filterByPermission(items, user, checkFn) {
  if (!user) return [];
  return items.filter(item => {
    try {
      return checkFn(user, item);
    } catch {
      return false;
    }
  });
}