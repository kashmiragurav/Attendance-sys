// src/services/attendanceService.js
// Complete attendance management service with business logic

import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { logger } from '../utils/logger';

/**
 * Attendance Service - Handles all attendance-related operations
 */

// Configuration (move to Firestore settings in production)
const OFFICE_START_TIME = '09:00'; // HH:MM format
const OFFICE_END_TIME = '18:00';
const GRACE_PERIOD_MINUTES = 15;
const MIN_WORKING_HOURS = 8;

/**
 * Check-in for the employee
 * @param {string} userId - Employee ID
 * @param {'face' | 'manual' | 'qr'} method - Check-in method
 * @param {object} location - GPS location { latitude, longitude }
 * @param {object} deviceInfo - Device information
 * @returns {object} Attendance record
 */
export async function checkIn(userId, method = 'face', location = null, deviceInfo = null) {
  try {
    if (!userId) throw new Error('User ID is required');

    logger.info('Checking in user:', userId);

    // Check if already checked in today
    const existingAttendance = await getAttendanceForToday(userId);
    if (existingAttendance && existingAttendance.checkInTime) {
      throw new Error('Already checked in today');
    }

    const now = new Date();
    const checkInTime = Timestamp.fromDate(now);

    // Determine attendance status
    const status = calculateAttendanceStatus(now, 'checkin');

    const attendanceData = {
      userId,
      companyId: getCurrentCompanyId(), // Get from user context
      date: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
      checkInTime,
      checkInMethod: method,
      status,
      workingHours: 0,
      isOvertime: false,
      overtimeHours: 0,
      manualEntry: false,
      approvalStatus: method === 'manual' ? 'pending' : 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Add optional fields
    if (location) {
      attendanceData.checkInLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
      };
    }

    if (deviceInfo) {
      attendanceData.deviceInfo = {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion,
      };
    }

    // Save to Firestore
    const attendanceRef = await addDoc(
      collection(db, 'attendance'),
      attendanceData
    );

    logger.info('Check-in successful:', attendanceRef.id);

    // Log activity
    logActivity(userId, 'CHECK_IN', 'attendance', attendanceRef.id, null, attendanceData);

    return {
      success: true,
      attendanceId: attendanceRef.id,
      status,
      checkInTime: now,
    };
  } catch (err) {
    logger.error('Check-in failed:', err.message);
    throw err;
  }
}

/**
 * Check-out for the employee
 * @param {string} userId - Employee ID
 * @param {'face' | 'manual'} method - Check-out method
 * @param {object} location - GPS location
 * @returns {object} Updated attendance record with working hours
 */
export async function checkOut(userId, method = 'face', location = null) {
  try {
    logger.info('Checking out user:', userId);

    // Get today's attendance
    const attendance = await getAttendanceForToday(userId);
    if (!attendance) {
      throw new Error('No check-in found for today');
    }

    if (attendance.checkOutTime) {
      throw new Error('Already checked out today');
    }

    const now = new Date();
    const checkOutTime = Timestamp.fromDate(now);

    // Calculate working hours
    const checkInDate = attendance.checkInTime.toDate();
    const workingMinutes = (now - checkInDate) / (1000 * 60);
    const workingHours = Math.round((workingMinutes / 60) * 100) / 100; // Round to 2 decimals

    // Determine final status
    let finalStatus = attendance.status;
    const isOvertime = workingHours > MIN_WORKING_HOURS;

    if (isOvertime) {
      finalStatus = 'present'; // Override if they stayed overtime
    }

    // Update attendance
    const attendanceRef = doc(db, 'attendance', attendance.id);
    await updateDoc(attendanceRef, {
      checkOutTime,
      checkOutMethod: method,
      workingHours,
      isOvertime,
      overtimeHours: isOvertime ? workingHours - MIN_WORKING_HOURS : 0,
      status: finalStatus,
      updatedAt: serverTimestamp(),
    });

    if (location) {
      await updateDoc(attendanceRef, {
        checkOutLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || null,
        },
      });
    }

    logger.info('Check-out successful. Working hours:', workingHours);

    // Log activity
    logActivity(userId, 'CHECK_OUT', 'attendance', attendance.id, 
      { checkInTime: attendance.checkInTime },
      { checkOutTime: now, workingHours }
    );

    return {
      success: true,
      attendanceId: attendance.id,
      workingHours,
      isOvertime,
      finalStatus,
      checkOutTime: now,
    };
  } catch (err) {
    logger.error('Check-out failed:', err.message);
    throw err;
  }
}

/**
 * Get attendance record for today
 */
export async function getAttendanceForToday(userId) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<', Timestamp.fromDate(endOfDay))
    );

    const snapshot = await getDocs(q);
    if (snapshot.docs.length === 0) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    logger.error('Error getting today attendance:', err);
    return null;
  }
}

/**
 * Get attendance history with pagination
 */
export async function getAttendanceHistory(userId, startDate, endDate, limit = 30) {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    logger.error('Error getting attendance history:', err);
    return [];
  }
}

/**
 * Calculate attendance status based on check-in time
 */
export function calculateAttendanceStatus(date, type = 'checkin') {
  const timeStr = date.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });

  const [hours, minutes] = timeStr.split(':').map(Number);
  const checkInMinutes = hours * 60 + minutes;

  const [officeHour, officeMin] = OFFICE_START_TIME.split(':').map(Number);
  const officeStartMinutes = officeHour * 60 + officeMin;
  const gracePeriodEnd = officeStartMinutes + GRACE_PERIOD_MINUTES;

  if (checkInMinutes <= gracePeriodEnd) {
    return 'present';
  } else {
    return 'late';
  }
}

/**
 * Request attendance correction/override
 */
export async function requestAttendanceCorrection(
  attendanceId,
  requestType,
  reason,
  requestedData
) {
  try {
    logger.info('Requesting attendance correction:', attendanceId);

    const correctionData = {
      attendanceId,
      userId: auth.currentUser.uid,
      requesterRole: 'employee', // Get from user context
      requestType, // 'adjustment' | 'deletion' | 'override'
      originalData: {}, // Fetch from attendance record
      requestedData,
      reason,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    const correctionRef = await addDoc(
      collection(db, 'attendance_corrections'),
      correctionData
    );

    logger.info('Correction requested:', correctionRef.id);

    return {
      success: true,
      correctionId: correctionRef.id,
    };
  } catch (err) {
    logger.error('Correction request failed:', err.message);
    throw err;
  }
}

/**
 * Get attendance statistics for employee
 */
export async function getAttendanceStats(userId, year, month) {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => doc.data());

    const stats = {
      totalDays: records.length,
      presentDays: records.filter(r => r.status === 'present').length,
      lateDays: records.filter(r => r.status === 'late').length,
      absentDays: records.filter(r => r.status === 'absent').length,
      halfDays: records.filter(r => r.status === 'half_day').length,
      leaveDays: records.filter(r => r.status === 'leave').length,
      totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
      averageWorkingHours: 0,
      attendancePercentage: 0,
    };

    if (stats.totalDays > 0) {
      stats.averageWorkingHours = Math.round(
        (stats.totalWorkingHours / stats.totalDays) * 100
      ) / 100;
      stats.attendancePercentage = Math.round(
        ((stats.presentDays + stats.lateDays) / stats.totalDays) * 100
      );
    }

    return stats;
  } catch (err) {
    logger.error('Error getting attendance stats:', err);
    throw err;
  }
}

/**
 * Manual attendance entry (HR/Admin only)
 */
export async function createManualAttendance(userId, date, checkInTime, checkOutTime, reason) {
  try {
    logger.info('Creating manual attendance for:', userId);

    // Calculate working hours
    const checkInDate = new Date(checkInTime);
    const checkOutDate = new Date(checkOutTime);
    const workingMinutes = (checkOutDate - checkInDate) / (1000 * 60);
    const workingHours = Math.round((workingMinutes / 60) * 100) / 100;

    const attendanceData = {
      userId,
      companyId: getCurrentCompanyId(),
      date: Timestamp.fromDate(new Date(date)),
      checkInTime: Timestamp.fromDate(checkInDate),
      checkOutTime: Timestamp.fromDate(checkOutDate),
      workingHours,
      status: 'present',
      manualEntry: true,
      manualEntryReason: reason,
      approvalStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'attendance'), attendanceData);
    logger.info('Manual attendance created:', ref.id);

    return {
      success: true,
      attendanceId: ref.id,
      workingHours,
    };
  } catch (err) {
    logger.error('Manual attendance creation failed:', err.message);
    throw err;
  }
}

/**
 * Get pending corrections for approval (HR/Admin)
 */
export async function getPendingCorrections(companyId) {
  try {
    const q = query(
      collection(db, 'attendance_corrections'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    logger.error('Error getting pending corrections:', err);
    return [];
  }
}

/**
 * Approve or reject correction
 */
export async function processCorrection(correctionId, status, comments = '') {
  try {
    const correctionRef = doc(db, 'attendance_corrections', correctionId);
    
    await updateDoc(correctionRef, {
      status, // 'approved' | 'rejected'
      approverComments: comments,
      approvedBy: auth.currentUser.uid,
      approvedAt: serverTimestamp(),
    });

    logger.info('Correction processed:', correctionId, status);

    return { success: true };
  } catch (err) {
    logger.error('Error processing correction:', err.message);
    throw err;
  }
}

// Helper functions
function getCurrentCompanyId() {
  // Get from user context or auth token
  return 'company_default';
}

function logActivity(userId, action, targetType, targetId, oldValue, newValue) {
  // Log to activity_logs collection (non-blocking)
  const logRef = collection(db, 'activity_logs');
  addDoc(logRef, {
    userId,
    action,
    actionType: 'attendance',
    targetType,
    targetId,
    oldValue: oldValue || {},
    newValue: newValue || {},
    timestamp: serverTimestamp(),
    status: 'success',
  }).catch(err => logger.error('Error logging activity:', err));
}

export default {
  checkIn,
  checkOut,
  getAttendanceForToday,
  getAttendanceHistory,
  calculateAttendanceStatus,
  requestAttendanceCorrection,
  getAttendanceStats,
  createManualAttendance,
  getPendingCorrections,
  processCorrection,
};
