/**
 * Attendance Calculation Utilities
 * Business logic for attendance status, work hours, and reports
 */

/**
 * Parse time string to Date object
 */
export const parseTime = (timeString, date = new Date()) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const dateObj = new Date(date);
    dateObj.setHours(hours, minutes, 0, 0);
    return dateObj;
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format time to HH:MM:SS
 */
export const formatTime = (date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours).padStart(2, '0');

    return `${formattedHours}:${minutes} ${ampm}`;
};

/**
 * Calculate minutes between two times
 */
export const calculateMinutes = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end - start) / (1000 * 60));
};

/**
 * Calculate hours between two times
 */
export const calculateHours = (startTime, endTime) => {
    const minutes = calculateMinutes(startTime, endTime);
    return (minutes / 60).toFixed(2);
};

/**
 * Check if employee is late
 */
export const isLate = (checkInTime, officeStartTime, gracePeriodMinutes = 15) => {
    const checkIn = new Date(checkInTime);
    const officeStart = parseTime(officeStartTime, checkIn);
    const graceEnd = new Date(officeStart.getTime() + gracePeriodMinutes * 60000);

    return checkIn > graceEnd;
};

/**
 * Calculate late minutes
 */
export const calculateLateMinutes = (checkInTime, officeStartTime, gracePeriodMinutes = 15) => {
    if (!isLate(checkInTime, officeStartTime, gracePeriodMinutes)) {
        return 0;
    }

    const checkIn = new Date(checkInTime);
    const officeStart = parseTime(officeStartTime, checkIn);
    const graceEnd = new Date(officeStart.getTime() + gracePeriodMinutes * 60000);

    return Math.floor((checkIn - graceEnd) / (1000 * 60));
};

/**
 * Calculate attendance status
 * Business Rules:
 * - Office Start: 9:30 AM
 * - Grace Period: 10 minutes (until 9:40 AM)
 * - Late (Half Day): Check-in after 9:40 AM
 * - Office End: 6:30 PM
 * - Full Day: 9 hours of work
 * - Half Day: Less than 9 hours OR late check-in
 */
export const calculateAttendanceStatus = (checkIn, checkOut, settings) => {
    const {
        officeStartTime = '09:30', // Changed to 9:30 AM
        officeEndTime = '18:30',   // 6:30 PM
        gracePeriodMinutes = 10,   // Changed to 10 minutes
        halfDayHours = 4.5,        // Minimum for half day
        fullDayHours = 9,          // Changed to 9 hours for full day
    } = settings;

    // If no check-in, mark as absent
    if (!checkIn) {
        return {
            status: 'absent',
            workHours: 0,
            isLate: false,
            lateMinutes: 0,
        };
    }

    // Calculate work hours - prioritize provided workHours from settings (for multi-session)
    let workHours = settings.workHours !== undefined
        ? settings.workHours
        : (checkOut ? parseFloat(calculateHours(checkIn, checkOut)) : 0);

    // Check if late (after grace period)
    const late = isLate(checkIn, officeStartTime, gracePeriodMinutes);
    const lateMinutes = calculateLateMinutes(checkIn, officeStartTime, gracePeriodMinutes);

    // Determine status
    let status = 'present';

    if (checkOut) {
        // Check-out done, calculate final status
        if (late) {
            // Late check-in (after 9:40 AM) = Half Day
            status = 'half_day';
        } else if (workHours >= fullDayHours) {
            // 9+ hours = Full Day (Present)
            status = 'present';
        } else if (workHours >= halfDayHours) {
            // 4.5 to 9 hours = Half Day
            status = 'half_day';
        } else {
            // Less than 4.5 hours = Half Day
            status = 'half_day';
        }
    } else {
        // Only check-in, no check-out yet
        if (late) {
            status = 'late'; // Temporary status, will be half_day after checkout
        } else {
            status = 'present';
        }
    }

    return {
        status,
        workHours,
        isLate: late,
        lateMinutes,
    };
};

/**
 * Check if date is weekend
 */
export const isWeekend = (date, weekendDays = [0, 6]) => {
    const d = new Date(date);
    return weekendDays.includes(d.getDay());
};

/**
 * Check if date is holiday
 */
export const isHoliday = (date, holidays = []) => {
    const dateStr = formatDate(date);
    return holidays.includes(dateStr);
};

/**
 * Check if date is working day
 */
export const isWorkingDay = (date, settings) => {
    const { weekendDays = [0, 6], holidays = [] } = settings;
    return !isWeekend(date, weekendDays) && !isHoliday(date, holidays);
};

/**
 * Get month date range
 */
export const getMonthDateRange = (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        totalDays: endDate.getDate(),
    };
};

/**
 * Calculate working days in month
 */
export const calculateWorkingDaysInMonth = (year, month, settings) => {
    const { totalDays } = getMonthDateRange(year, month);
    let workingDays = 0;

    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month - 1, day);
        if (isWorkingDay(date, settings)) {
            workingDays++;
        }
    }

    return workingDays;
};

/**
 * Calculate attendance statistics for a period
 */
export const calculateAttendanceStats = (attendanceRecords, settings) => {
    const stats = {
        totalDays: attendanceRecords.length,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        totalWorkHours: 0,
        averageWorkHours: 0,
        totalLateMinutes: 0,
        attendancePercentage: 0,
    };

    attendanceRecords.forEach((record) => {
        switch (record.status) {
            case 'present':
                stats.presentDays++;
                break;
            case 'absent':
                stats.absentDays++;
                break;
            case 'late':
                stats.lateDays++;
                stats.presentDays++; // Late is still present
                break;
            case 'half_day':
                stats.halfDays++;
                break;
        }

        stats.totalWorkHours += record.workHours || 0;
        stats.totalLateMinutes += record.lateMinutes || 0;
    });

    stats.averageWorkHours = stats.totalDays > 0
        ? (stats.totalWorkHours / stats.totalDays).toFixed(2)
        : 0;

    stats.attendancePercentage = stats.totalDays > 0
        ? ((stats.presentDays / stats.totalDays) * 100).toFixed(2)
        : 0;

    return stats;
};

/**
 * Generate monthly attendance report
 */
export const generateMonthlyReport = (attendanceRecords, year, month, settings) => {
    const { startDate, endDate, totalDays } = getMonthDateRange(year, month);
    const workingDays = calculateWorkingDaysInMonth(year, month, settings);
    const stats = calculateAttendanceStats(attendanceRecords, settings);

    return {
        period: {
            year,
            month,
            startDate,
            endDate,
            totalDays,
            workingDays,
        },
        statistics: stats,
        records: attendanceRecords,
    };
};

/**
 * Check if attendance already marked for today
 */
export const isAttendanceMarkedToday = (attendanceRecords) => {
    const today = formatDate(new Date());
    return attendanceRecords.some((record) => record.date === today);
};

/**
 * Get today's attendance record
 */
export const getTodayAttendance = (attendanceRecords) => {
    const today = formatDate(new Date());
    return attendanceRecords.find((record) => record.date === today) || null;
};

/**
 * Check if can check out
 */
export const canCheckOut = (attendanceRecords) => {
    const todayRecord = getTodayAttendance(attendanceRecords);
    return todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
};

/**
 * Validate geo-location (if geo-fencing enabled)
 */
export const validateLocation = (currentLocation, officeLocation, radiusMeters = 100) => {
    if (!currentLocation || !officeLocation) {
        return { success: true, withinRange: true }; // Skip if not configured
    }

    const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        officeLocation.latitude,
        officeLocation.longitude
    );

    const withinRange = distance <= radiusMeters;

    return {
        success: true,
        withinRange,
        distance: Math.round(distance),
        message: withinRange
            ? 'Location verified'
            : `You are ${Math.round(distance)}m away from office. Please be within ${radiusMeters}m.`,
    };
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Format attendance status for display
 */
export const formatAttendanceStatus = (status) => {
    const statusMap = {
        present: { label: 'Present', color: '#34C759', icon: '✓' },
        late: { label: 'Late', color: '#FF9500', icon: '⏰' },
        half_day: { label: 'Half Day', color: '#FF3B30', icon: '½' },
        absent: { label: 'Absent', color: '#FF3B30', icon: '✗' },
        weekly_off: { label: 'Weekly Off', color: '#95A5A6', icon: '🏠' },
        paid_leave: { label: 'Paid Leave', color: '#4A90E2', icon: '🎁' },
    };

    return statusMap[status] || statusMap.absent;
};

/**
 * Get greeting based on time
 */
export const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
};
