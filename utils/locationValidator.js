/**
 * Location Validator
 * Acquires real GPS coordinates and validates against the configured geo-fence.
 * Used by AttendanceScanScreen and RealTimeFaceScanScreen.
 */

import * as Location from 'expo-location';
import { calculateDistance } from './attendance';

const GPS_TIMEOUT_MS = 15000;
const MAX_ACCURACY_METERS = 100; // reject fixes worse than this

/**
 * Acquire the device's current GPS position.
 * Returns { ok: true, coords } or { ok: false, errorCode, message }.
 */
export const acquireLocation = async () => {
    // 1. Permission
    let permissionResult;
    try {
        permissionResult = await Location.requestForegroundPermissionsAsync();
    } catch {
        return { ok: false, errorCode: 'PERMISSION_ERROR', message: 'Unable to request location permission.' };
    }

    if (permissionResult.status !== 'granted') {
        return {
            ok: false,
            errorCode: 'PERMISSION_DENIED',
            message: 'Location permission is required to mark attendance. Please enable it in Settings.',
        };
    }

    // 2. GPS enabled check
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
        return {
            ok: false,
            errorCode: 'GPS_DISABLED',
            message: 'GPS is disabled. Please turn on Location Services and try again.',
        };
    }

    // 3. Acquire position with timeout
    let position;
    try {
        position = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), GPS_TIMEOUT_MS)
            ),
        ]);
    } catch (err) {
        if (err.message === 'TIMEOUT') {
            return {
                ok: false,
                errorCode: 'TIMEOUT',
                message: 'Location request timed out. Please move to an open area and try again.',
            };
        }
        return {
            ok: false,
            errorCode: 'UNAVAILABLE',
            message: 'Unable to determine your location. Please try again.',
        };
    }

    if (!position?.coords) {
        return { ok: false, errorCode: 'UNAVAILABLE', message: 'Location data is unavailable. Please try again.' };
    }

    // 4. Accuracy check
    const accuracy = position.coords.accuracy;
    if (accuracy !== null && accuracy > MAX_ACCURACY_METERS) {
        return {
            ok: false,
            errorCode: 'INACCURATE',
            message: `Location accuracy is too low (±${Math.round(accuracy)}m). Please move to an open area and try again.`,
        };
    }

    return {
        ok: true,
        coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
        },
    };
};

/**
 * Validate coords against the configured geo-fence.
 * Returns { ok: true } or { ok: false, message }.
 *
 * @param {{ latitude: number, longitude: number }} coords
 * @param {{ enabled: boolean, latitude: number, longitude: number, radius: number }} geoFencing
 */
export const validateGeoFence = (coords, geoFencing) => {
    if (!geoFencing?.enabled) return { ok: true };

    const { latitude: officeLat, longitude: officeLng, radius } = geoFencing;

    if (typeof officeLat !== 'number' || typeof officeLng !== 'number') {
        return { ok: false, message: 'Workplace location is not configured. Please contact your administrator.' };
    }

    const allowedRadius = typeof radius === 'number' && radius > 0 ? radius : 200;
    const distance = calculateDistance(coords.latitude, coords.longitude, officeLat, officeLng);

    if (distance > allowedRadius) {
        return {
            ok: false,
            message: `Attendance cannot be marked because you are outside the permitted workplace location. You are ${Math.round(distance)}m away (allowed: ${allowedRadius}m).`,
        };
    }

    return { ok: true };
};

/**
 * Full location check: acquire GPS + validate geo-fence (if enabled).
 * Returns { ok: true, locationData } or { ok: false, message }.
 *
 * @param {{ geoFencing: object }} officeSettings  resolved attendance config
 * @param {boolean} skipGeoFence  pass true for WFH flows
 */
export const checkAttendanceLocation = async (officeSettings, skipGeoFence = false) => {
    const geoFencing = officeSettings?.geoFencing;
    const geoFenceRequired = geoFencing?.enabled && !skipGeoFence;

    const locationResult = await acquireLocation();

    if (!locationResult.ok) {
        // If geo-fence is required, a location failure is a hard block.
        if (geoFenceRequired) {
            return { ok: false, message: locationResult.message };
        }
        // Geo-fence not required — proceed without location data.
        return { ok: true, locationData: null };
    }

    const { coords } = locationResult;

    if (geoFenceRequired) {
        const fenceResult = validateGeoFence(coords, geoFencing);
        if (!fenceResult.ok) {
            return { ok: false, message: fenceResult.message };
        }
    }

    return {
        ok: true,
        locationData: coords,
    };
};
