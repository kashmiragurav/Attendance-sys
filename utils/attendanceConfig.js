/**
 * Attendance Configuration — Single Source of Truth
 *
 * Firestore path: office_settings/settings_default
 * Controlled by: Super Admin via SuperAdminAttendanceConfigScreen
 * Consumed by:   AttendanceScanScreen, RealTimeFaceScanScreen, utils/attendance.js
 */

export const DEFAULT_ATTENDANCE_CONFIG = {
    // ── Punch In ──────────────────────────────────────────────
    officeStartTime: '09:30',       // Scheduled start (HH:MM 24h)
    punchInWindowMinutes: 120,      // How many minutes after start punch-in is still allowed (0 = no limit)
    gracePeriodMinutes: 10,         // Minutes after start before marking Late
    latePunchInHandling: 'mark_late', // 'mark_late' | 'mark_half_day' | 'deny'

    // ── Punch Out ─────────────────────────────────────────────
    officeEndTime: '18:30',         // Scheduled end (HH:MM 24h)
    minWorkingHoursForCheckout: 4,  // Minimum hours worked before checkout is allowed
    earlyCheckoutHandling: 'mark_half_day', // 'mark_half_day' | 'mark_absent' | 'allow'

    // ── Working Hours ─────────────────────────────────────────
    fullDayHours: 9,                // Hours required for full-day status
    halfDayHours: 4.5,              // Hours required for half-day status
    overtimeEnabled: false,         // Whether to track overtime
    overtimeThresholdHours: 9,      // Hours after which overtime starts

    // ── Break ─────────────────────────────────────────────────
    breakEnabled: false,            // Master switch for break tracking
    maxBreakMinutes: 60,            // Maximum total break duration per day
    maxBreakCount: 2,               // Maximum number of breaks allowed
    breakDeductFromHours: false,    // Deduct break time from total work hours

    // ── Geo-fencing (existing, kept for completeness) ─────────
    geoFencing: {
        enabled: false,
        latitude: 18.5204,
        longitude: 73.8567,
        radius: 200,
    },

    // ── Face Recognition ──────────────────────────────────────
    faceThreshold: 0.6,
};

/**
 * Merge saved Firestore config with defaults.
 * Any missing field falls back to DEFAULT_ATTENDANCE_CONFIG.
 */
export const resolveConfig = (savedConfig) => ({
    ...DEFAULT_ATTENDANCE_CONFIG,
    ...(savedConfig || {}),
    geoFencing: {
        ...DEFAULT_ATTENDANCE_CONFIG.geoFencing,
        ...(savedConfig?.geoFencing || {}),
    },
});
