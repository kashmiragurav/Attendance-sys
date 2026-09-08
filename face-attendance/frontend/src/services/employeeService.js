// src/services/employeeService.js
// Employee management, user roles, and HR operations

import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { logger } from '../utils/logger';

/**
 * Employee Management Service
 */

// User role definitions
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// Default permissions for each role
const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [
    'manage_company',
    'manage_all_employees',
    'view_all_reports',
    'configure_system',
    'manage_roles',
    'view_activity_logs',
    'export_data',
    'system_settings',
  ],
  [USER_ROLES.HR]: [
    'manage_employees',
    'approve_attendance',
    'approve_leave',
    'view_reports',
    'export_attendance',
    'configure_shifts',
    'override_attendance',
    'approve_corrections',
  ],
  [USER_ROLES.MANAGER]: [
    'view_team_attendance',
    'mark_manual_attendance',
    'approve_team_leave',
    'view_team_reports',
    'manage_team',
  ],
  [USER_ROLES.EMPLOYEE]: [
    'check_in_out',
    'view_own_attendance',
    'request_correction',
    'apply_leave',
    'view_own_profile',
    'generate_own_reports',
  ],
};

/**
 * Create new employee
 */
export async function createEmployee(employeeData) {
  try {
    logger.info('Creating new employee:', employeeData.email);

    const {
      email,
      password,
      name,
      phone,
      departmentId,
      role = USER_ROLES.EMPLOYEE,
      employeeId,
      joiningDate,
      dateOfBirth,
    } = employeeData;

    // Validate required fields
    if (!email || !password || !name) {
      throw new Error('Email, password, and name are required');
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Create user document in Firestore
    const userData = {
      uid,
      email: email.toLowerCase(),
      name,
      phone: phone || '',
      departmentId: departmentId || '',
      role,
      employeeId: employeeId || generateEmployeeId(),
      status: 'active',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      profilePhoto: '',
      faceEmbeddingId: null,
      deviceIds: [],
      permissions: ROLE_PERMISSIONS[role] || [],
      metadata: {
        lastLogin: null,
        loginAttempts: 0,
        accountLocked: false,
        twoFactorEnabled: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, 'users', uid), userData);

    logger.info('Employee created successfully:', uid);

    // Log activity
    logActivity('CREATE_EMPLOYEE', 'employee', uid, null, userData);

    return {
      success: true,
      uid,
      employeeId: userData.employeeId,
    };
  } catch (err) {
    logger.error('Employee creation failed:', err.message);
    throw err;
  }
}

/**
 * Update employee information
 */
export async function updateEmployee(userId, updates) {
  try {
    logger.info('Updating employee:', userId);

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('Employee not found');
    }

    const oldData = userDoc.data();
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, updateData);

    logger.info('Employee updated:', userId);

    // Log activity
    logActivity('UPDATE_EMPLOYEE', 'employee', userId, oldData, updateData);

    return { success: true };
  } catch (err) {
    logger.error('Employee update failed:', err.message);
    throw err;
  }
}

/**
 * Get employee by ID
 */
export async function getEmployee(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  } catch (err) {
    logger.error('Error getting employee:', err);
    return null;
  }
}

/**
 * Get all employees with filtering
 */
export async function getEmployees(filters = {}) {
  try {
    logger.info('Fetching employees with filters:', filters);

    let q = collection(db, 'users');
    const constraints = [];

    if (filters.departmentId) {
      constraints.push(where('departmentId', '==', filters.departmentId));
    }

    if (filters.role) {
      constraints.push(where('role', '==', filters.role));
    }

    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints, orderBy('name'));
    } else {
      q = query(q, orderBy('name'));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    logger.error('Error getting employees:', err);
    return [];
  }
}

/**
 * Search employees by name or email
 */
export async function searchEmployees(searchTerm) {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    logger.info('Searching employees:', searchTerm);

    const q = query(
      collection(db, 'users'),
      where('status', '==', 'active'),
      orderBy('name')
    );

    const snapshot = await getDocs(q);
    const allEmployees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const searchLower = searchTerm.toLowerCase();
    return allEmployees.filter(emp =>
      emp.name.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      emp.employeeId.includes(searchTerm)
    );
  } catch (err) {
    logger.error('Error searching employees:', err);
    return [];
  }
}

/**
 * Deactivate employee account
 */
export async function deactivateEmployee(userId, reason = '') {
  try {
    logger.info('Deactivating employee:', userId);

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('Employee not found');
    }

    const oldData = userDoc.data();

    await updateDoc(userRef, {
      status: 'inactive',
      deactivatedAt: serverTimestamp(),
      deactivationReason: reason,
      updatedAt: serverTimestamp(),
    });

    logger.info('Employee deactivated:', userId);

    // Log activity
    logActivity('DEACTIVATE_EMPLOYEE', 'employee', userId, oldData, {
      status: 'inactive',
      reason,
    });

    return { success: true };
  } catch (err) {
    logger.error('Employee deactivation failed:', err.message);
    throw err;
  }
}

/**
 * Reactivate deactivated employee
 */
export async function reactivateEmployee(userId) {
  try {
    logger.info('Reactivating employee:', userId);

    await updateDoc(doc(db, 'users', userId), {
      status: 'active',
      deactivatedAt: null,
      deactivationReason: '',
      updatedAt: serverTimestamp(),
    });

    logger.info('Employee reactivated:', userId);

    return { success: true };
  } catch (err) {
    logger.error('Employee reactivation failed:', err.message);
    throw err;
  }
}

/**
 * Delete employee (soft delete in Firestore)
 */
export async function deleteEmployee(userId) {
  try {
    logger.info('Deleting employee:', userId);

    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      status: 'deleted',
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Note: Auth user deletion requires separate handling
    // await deleteUser(auth.currentUser) if needed

    logger.info('Employee deleted:', userId);

    return { success: true };
  } catch (err) {
    logger.error('Employee deletion failed:', err.message);
    throw err;
  }
}

/**
 * Get employees by department
 */
export async function getEmployeesByDepartment(departmentId) {
  try {
    const q = query(
      collection(db, 'users'),
      where('departmentId', '==', departmentId),
      where('status', '==', 'active'),
      orderBy('name')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    logger.error('Error getting department employees:', err);
    return [];
  }
}

/**
 * Update employee role and permissions
 */
export async function updateEmployeeRole(userId, newRole) {
  try {
    if (!ROLE_PERMISSIONS[newRole]) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    logger.info('Updating employee role:', userId, newRole);

    const updateData = {
      role: newRole,
      permissions: ROLE_PERMISSIONS[newRole],
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, 'users', userId), updateData);

    logger.info('Employee role updated:', userId, newRole);

    return { success: true };
  } catch (err) {
    logger.error('Role update failed:', err.message);
    throw err;
  }
}

/**
 * Get employee's current permissions
 */
export async function getEmployeePermissions(userId) {
  try {
    const employee = await getEmployee(userId);
    if (!employee) {
      return [];
    }

    return employee.permissions || ROLE_PERMISSIONS[employee.role] || [];
  } catch (err) {
    logger.error('Error getting permissions:', err);
    return [];
  }
}

/**
 * Check if employee has specific permission
 */
export async function hasPermission(userId, permission) {
  try {
    const permissions = await getEmployeePermissions(userId);
    return permissions.includes(permission);
  } catch (err) {
    logger.error('Error checking permission:', err);
    return false;
  }
}

/**
 * Get department information
 */
export async function getDepartment(departmentId) {
  try {
    const deptDoc = await getDoc(doc(db, 'departments', departmentId));

    if (!deptDoc.exists()) {
      return null;
    }

    return {
      id: deptDoc.id,
      ...deptDoc.data(),
    };
  } catch (err) {
    logger.error('Error getting department:', err);
    return null;
  }
}

/**
 * Get all departments
 */
export async function getDepartments() {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'departments'), orderBy('name'))
    );

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    logger.error('Error getting departments:', err);
    return [];
  }
}

/**
 * Get team members for a manager
 */
export async function getManagerTeam(managerId) {
  try {
    const q = query(
      collection(db, 'users'),
      where('managerId', '==', managerId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    logger.error('Error getting manager team:', err);
    return [];
  }
}

/**
 * Register device for attendance
 */
export async function registerDevice(userId, deviceInfo) {
  try {
    logger.info('Registering device for user:', userId);

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const deviceIds = userDoc.data().deviceIds || [];
    if (!deviceIds.includes(deviceInfo.deviceId)) {
      deviceIds.push(deviceInfo.deviceId);

      await updateDoc(userRef, {
        deviceIds,
        updatedAt: serverTimestamp(),
      });
    }

    logger.info('Device registered:', deviceInfo.deviceId);

    return { success: true };
  } catch (err) {
    logger.error('Device registration failed:', err.message);
    throw err;
  }
}

// Helper functions

function generateEmployeeId() {
  const prefix = 'EMP';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}${timestamp}${random}`;
}

function logActivity(action, targetType, targetId, oldValue, newValue) {
  const logRef = collection(db, 'activity_logs');
  addDoc(logRef, {
    userId: auth.currentUser?.uid || 'system',
    action,
    actionType: 'employee_management',
    targetType,
    targetId,
    oldValue: oldValue || {},
    newValue: newValue || {},
    timestamp: serverTimestamp(),
    status: 'success',
  }).catch(err => logger.error('Error logging activity:', err));
}

export default {
  createEmployee,
  updateEmployee,
  getEmployee,
  getEmployees,
  searchEmployees,
  deactivateEmployee,
  reactivateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
  updateEmployeeRole,
  getEmployeePermissions,
  hasPermission,
  getDepartment,
  getDepartments,
  getManagerTeam,
  registerDevice,
  USER_ROLES,
};
