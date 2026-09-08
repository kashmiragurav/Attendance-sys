// src/services/reportService.js
// Reports, analytics, and data export functionality

import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { logger } from '../utils/logger';

/**
 * Reports & Analytics Service
 * Generates reports, analytics dashboards, and exports
 */

/**
 * Generate monthly attendance report
 */
export async function generateMonthlyReport(userId, year, month) {
  try {
    logger.info('Generating monthly report:', userId, year, month);

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // Get all attendance records for the month
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate metrics
    const metrics = calculateMonthlyMetrics(records);

    const report = {
      userId,
      reportType: 'monthly',
      period: {
        startDate,
        endDate,
        month: month + 1,
        year,
      },
      metrics,
      records,
      generatedAt: new Date(),
    };

    logger.info('Monthly report generated:', metrics);
    return report;
  } catch (err) {
    logger.error('Error generating monthly report:', err);
    throw err;
  }
}

/**
 * Generate yearly attendance report
 */
export async function generateYearlyReport(userId, year) {
  try {
    logger.info('Generating yearly report:', userId, year);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => doc.data());

    // Calculate metrics
    const metrics = calculateYearlyMetrics(records);

    // Break down by month
    const monthlyBreakdown = {};
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      const monthRecords = records.filter(r => {
        const recordDate = r.date.toDate?.();
        return recordDate >= monthStart && recordDate <= monthEnd;
      });

      monthlyBreakdown[month + 1] = calculateMonthlyMetrics(monthRecords);
    }

    const report = {
      userId,
      reportType: 'yearly',
      period: {
        year,
        startDate,
        endDate,
      },
      metrics,
      monthlyBreakdown,
      generatedAt: new Date(),
    };

    logger.info('Yearly report generated:', metrics);
    return report;
  } catch (err) {
    logger.error('Error generating yearly report:', err);
    throw err;
  }
}

/**
 * Generate department-wise attendance report
 */
export async function generateDepartmentReport(departmentId, year, month) {
  try {
    logger.info('Generating department report:', departmentId, year, month);

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // Get all employees in department
    const employeesQuery = query(
      collection(db, 'users'),
      where('departmentId', '==', departmentId),
      where('status', '==', 'active')
    );

    const employeesSnapshot = await getDocs(employeesQuery);
    const employees = employeesSnapshot.docs.map(doc => doc.id);

    // Get attendance for all employees
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('userId', 'in', employees),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const allRecords = attendanceSnapshot.docs.map(doc => doc.data());

    // Group by employee
    const employeeReports = {};
    employees.forEach(empId => {
      const empRecords = allRecords.filter(r => r.userId === empId);
      employeeReports[empId] = calculateMonthlyMetrics(empRecords);
    });

    // Calculate department aggregate
    const aggregateMetrics = calculateAggregateMetrics(employeeReports);

    const report = {
      departmentId,
      reportType: 'department',
      period: {
        startDate,
        endDate,
        month: month + 1,
        year,
      },
      totalEmployees: employees.length,
      employeeCount: employees.length,
      aggregateMetrics,
      employeeReports,
      generatedAt: new Date(),
    };

    logger.info('Department report generated');
    return report;
  } catch (err) {
    logger.error('Error generating department report:', err);
    throw err;
  }
}

/**
 * Generate company-wide analytics dashboard
 */
export async function generateCompanyAnalytics(companyId, year, month) {
  try {
    logger.info('Generating company analytics:', companyId);

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // Get all attendance records
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const records = attendanceSnapshot.docs.map(doc => doc.data());

    // Get all employees
    const employeesSnapshot = await getDocs(collection(db, 'users'));
    const totalEmployees = employeesSnapshot.size;
    const activeEmployees = employeesSnapshot.docs.filter(
      doc => doc.data().status === 'active'
    ).length;

    // Calculate metrics
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const halfDayCount = records.filter(r => r.status === 'half_day').length;

    const totalRecords = presentCount + lateCount + absentCount + halfDayCount;
    const attendanceRate = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords) * 100 : 0;

    // Get department breakdown
    const departmentsSnapshot = await getDocs(collection(db, 'departments'));
    const departmentAnalytics = {};

    for (const deptDoc of departmentsSnapshot.docs) {
      const deptId = deptDoc.id;
      const deptRecords = records.filter(
        r => {
          // Get user department (requires additional query)
          return true; // Simplified for now
        }
      );
      departmentAnalytics[deptId] = calculateMonthlyMetrics(deptRecords);
    }

    const analytics = {
      companyId,
      period: {
        startDate,
        endDate,
        month: month + 1,
        year,
      },
      employeeStats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
      },
      attendanceStats: {
        totalRecords,
        presentCount,
        lateCount,
        absentCount,
        halfDayCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
      departmentAnalytics,
      topPerformers: getTopPerformers(records, 5),
      trends: {
        weeklyAverage: calculateWeeklyTrends(records),
      },
      generatedAt: new Date(),
    };

    logger.info('Company analytics generated');
    return analytics;
  } catch (err) {
    logger.error('Error generating company analytics:', err);
    throw err;
  }
}

/**
 * Export report to CSV format
 */
export function exportToCSV(reportData) {
  try {
    logger.info('Exporting report to CSV');

    let csv = 'Attendance Report\n';
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    // Add metrics
    csv += 'Attendance Metrics\n';
    csv += 'Present Days,' + reportData.metrics.presentDays + '\n';
    csv += 'Late Days,' + reportData.metrics.lateDays + '\n';
    csv += 'Absent Days,' + reportData.metrics.absentDays + '\n';
    csv += 'Half Days,' + reportData.metrics.halfDays + '\n';
    csv += 'Leave Days,' + reportData.metrics.leaveDays + '\n';
    csv += 'Attendance %,' + reportData.metrics.attendancePercentage + '\n\n';

    // Add detailed records
    csv += 'Date,Check-in,Check-out,Working Hours,Status,Method\n';
    reportData.records.forEach(record => {
      const date = record.date.toDate?.() || new Date();
      const checkIn = record.checkInTime?.toDate?.() || 'N/A';
      const checkOut = record.checkOutTime?.toDate?.() || 'N/A';

      csv += `${date.toDateString()},${checkIn},${checkOut},${record.workingHours},${record.status},${record.checkInMethod}\n`;
    });

    return csv;
  } catch (err) {
    logger.error('Error exporting to CSV:', err);
    throw err;
  }
}

/**
 * Export report to JSON
 */
export function exportToJSON(reportData) {
  try {
    logger.info('Exporting report to JSON');
    return JSON.stringify(reportData, null, 2);
  } catch (err) {
    logger.error('Error exporting to JSON:', err);
    throw err;
  }
}

/**
 * Save report to Firestore for archival
 */
export async function saveReport(reportData) {
  try {
    logger.info('Saving report to Firestore');

    const reportDoc = {
      userId: reportData.userId || 'department',
      reportType: reportData.reportType,
      period: reportData.period,
      metrics: reportData.metrics,
      recordCount: reportData.records?.length || 0,
      generatedAt: serverTimestamp(),
      expiryAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    const ref = await addDoc(collection(db, 'reports'), reportDoc);

    logger.info('Report saved:', ref.id);
    return { success: true, reportId: ref.id };
  } catch (err) {
    logger.error('Error saving report:', err);
    throw err;
  }
}

// ============ Helper Functions ============

function calculateMonthlyMetrics(records) {
  if (!records || records.length === 0) {
    return {
      totalDays: 0,
      presentDays: 0,
      lateDays: 0,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      totalWorkingHours: 0,
      averageWorkingHours: 0,
      attendancePercentage: 0,
      workingDays: 0,
    };
  }

  const presentDays = records.filter(r => r.status === 'present').length;
  const lateDays = records.filter(r => r.status === 'late').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const halfDays = records.filter(r => r.status === 'half_day').length;
  const leaveDays = records.filter(r => r.status === 'leave').length;

  const totalWorkingHours = records.reduce((sum, r) => sum + (r.workingHours || 0), 0);
  const workingDays = presentDays + lateDays;
  const totalRecordDays = presentDays + lateDays + absentDays + halfDays + leaveDays;

  return {
    totalDays: records.length,
    presentDays,
    lateDays,
    absentDays,
    halfDays,
    leaveDays,
    totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
    averageWorkingHours:
      workingDays > 0
        ? Math.round((totalWorkingHours / workingDays) * 100) / 100
        : 0,
    attendancePercentage:
      totalRecordDays > 0
        ? Math.round(((presentDays + lateDays) / totalRecordDays) * 100)
        : 0,
    workingDays,
  };
}

function calculateYearlyMetrics(records) {
  return calculateMonthlyMetrics(records);
}

function calculateAggregateMetrics(employeeReports) {
  const employees = Object.values(employeeReports);
  if (employees.length === 0) return calculateMonthlyMetrics([]);

  const aggregate = {
    totalEmployees: employees.length,
    averagePresentDays: Math.round(
      (employees.reduce((sum, emp) => sum + emp.presentDays, 0) / employees.length) * 100
    ) / 100,
    averageLateDays: Math.round(
      (employees.reduce((sum, emp) => sum + emp.lateDays, 0) / employees.length) * 100
    ) / 100,
    averageAbsentDays: Math.round(
      (employees.reduce((sum, emp) => sum + emp.absentDays, 0) / employees.length) * 100
    ) / 100,
    averageAttendancePercentage: Math.round(
      employees.reduce((sum, emp) => sum + emp.attendancePercentage, 0) / employees.length
    ),
  };

  return aggregate;
}

function getTopPerformers(records, limit = 5) {
  const performerMap = {};

  records.forEach(record => {
    if (!performerMap[record.userId]) {
      performerMap[record.userId] = { presentCount: 0, totalRecords: 0 };
    }
    performerMap[record.userId].totalRecords++;
    if (record.status === 'present' || record.status === 'late') {
      performerMap[record.userId].presentCount++;
    }
  });

  const performers = Object.entries(performerMap)
    .map(([userId, stats]) => ({
      userId,
      attendanceRate: Math.round((stats.presentCount / stats.totalRecords) * 100),
    }))
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, limit);

  return performers;
}

function calculateWeeklyTrends(records) {
  const weeklyStats = {};

  records.forEach(record => {
    const date = record.date.toDate?.() || new Date();
    const week = Math.ceil(date.getDate() / 7);

    if (!weeklyStats[week]) {
      weeklyStats[week] = { present: 0, total: 0 };
    }

    weeklyStats[week].total++;
    if (record.status === 'present' || record.status === 'late') {
      weeklyStats[week].present++;
    }
  });

  const trends = {};
  Object.entries(weeklyStats).forEach(([week, stats]) => {
    trends[`Week ${week}`] = Math.round((stats.present / stats.total) * 100);
  });

  return trends;
}

export default {
  generateMonthlyReport,
  generateYearlyReport,
  generateDepartmentReport,
  generateCompanyAnalytics,
  exportToCSV,
  exportToJSON,
  saveReport,
};
