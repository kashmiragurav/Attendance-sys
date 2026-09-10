/**
 * WiFi Validator
 *
 * PLATFORM REALITY (Development Build only — not Expo Go):
 *
 * Android:
 *   - SSID and BSSID require ACCESS_FINE_LOCATION permission AND
 *     device location services to be enabled (OS restriction since Android 8.1,
 *     tightened in Android 10+). Without both, NetInfo returns ssid: null.
 *   - We request location permission here before reading network info.
 *
 * iOS:
 *   - SSID/BSSID require the com.apple.developer.networking.wifi-info entitlement.
 *   - Available in a properly signed Development Build / production build.
 *   - Not available in Expo Go.
 *
 * Fail-open policy:
 *   When the OS actively prevents reading SSID/BSSID (permission denied, location
 *   off, entitlement missing) and the device IS connected to WiFi, we allow
 *   attendance rather than blocking a legitimate employee due to OS restrictions.
 *   This is logged so admins can audit it.
 *
 * Fail-closed policy:
 *   When the device is NOT on WiFi at all, or is on a WiFi network whose
 *   SSID/BSSID we CAN read and it does not match the allowed list — we block.
 *
 * Data stored per allowed network: { ssid: string, bssid?: string }
 * BSSID matching is optional — if no BSSID is configured for a network,
 * SSID match alone is sufficient.
 * Passwords are never stored or transmitted.
 */

import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

// ── Result shape ──────────────────────────────────────────────────────────────
// { allowed: true }
// { allowed: false, reason: string, code: WIFI_ERROR_CODE }

export const WIFI_ERROR = {
    DISABLED:           'WIFI_DISABLED',
    NOT_WIFI:           'NOT_WIFI',
    WRONG_NETWORK:      'WRONG_NETWORK',
    PERMISSION_DENIED:  'PERMISSION_DENIED',
    UNREADABLE_SSID:    'UNREADABLE_SSID',   // OS blocked — fail open
    FETCH_FAILED:       'FETCH_FAILED',
};

/**
 * Normalise an SSID string — strip Android's surrounding quotes, trim whitespace.
 */
const normaliseSSID = (raw) => {
    if (!raw) return null;
    return raw.replace(/^"(.*)"$/, '$1').trim();
};

/**
 * Normalise a BSSID/MAC — lowercase, consistent separator.
 */
const normaliseBSSID = (raw) => {
    if (!raw) return null;
    return raw.toLowerCase().trim();
};

/**
 * On Android, reading SSID/BSSID requires ACCESS_FINE_LOCATION.
 * Request it silently before fetching network state.
 * Returns true if we have permission (or are on iOS where NetInfo handles it).
 */
const ensureLocationPermissionForWifi = async () => {
    if (Platform.OS !== 'android') return true;
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    } catch {
        return false;
    }
};

/**
 * Fetch current WiFi state from NetInfo.
 * Returns the raw NetInfo state or null on failure.
 */
const fetchNetworkState = async () => {
    try {
        return await NetInfo.fetch();
    } catch (err) {
        console.warn('[wifiValidator] NetInfo.fetch failed:', err.message);
        return null;
    }
};

/**
 * Core WiFi validation.
 *
 * @param {Array<{ssid: string, bssid?: string}>} allowedNetworks
 *   List of allowed networks from company config.
 *   Legacy format (plain string array) is also accepted and normalised.
 * @returns {Promise<{allowed: boolean, reason?: string, code?: string, ssid?: string, bssid?: string, failOpen?: boolean}>}
 */
export const validateWifi = async (allowedNetworks = []) => {
    // 1. Normalise legacy string-array format to object array
    const networks = allowedNetworks.map(n =>
        typeof n === 'string' ? { ssid: n } : n
    );

    // 2. Request location permission on Android (needed to read SSID)
    const hasLocationPermission = await ensureLocationPermissionForWifi();

    // 3. Fetch network state
    const state = await fetchNetworkState();

    if (!state) {
        return {
            allowed: false,
            code: WIFI_ERROR.FETCH_FAILED,
            reason: 'Unable to read network information. Please check your connection and try again.',
        };
    }

    // 4. Must be on WiFi
    if (state.type !== 'wifi') {
        return {
            allowed: false,
            code: WIFI_ERROR.NOT_WIFI,
            reason: 'You must be connected to an approved WiFi network to mark attendance.',
        };
    }

    // 5. If no allowed networks are configured, WiFi type check alone is sufficient
    if (networks.length === 0) {
        return { allowed: true };
    }

    // 6. Try to read SSID and BSSID
    const rawSSID  = state.details?.ssid  ?? null;
    const rawBSSID = state.details?.bssid ?? null;

    const currentSSID  = normaliseSSID(rawSSID);
    const currentBSSID = normaliseBSSID(rawBSSID);

    // 7. Handle unreadable SSID
    const ssidUnreadable =
        !currentSSID ||
        currentSSID === '<unknown ssid>' ||
        currentSSID === 'unknown ssid';

    if (ssidUnreadable) {
        if (!hasLocationPermission) {
            // We know why — location permission was denied
            console.warn('[wifiValidator] SSID unreadable: location permission denied. Failing open.');
            return {
                allowed: true,   // fail open — employee is on WiFi, OS blocked SSID
                failOpen: true,
                code: WIFI_ERROR.PERMISSION_DENIED,
                reason: 'Location permission is required to verify WiFi network on Android. Attendance allowed but unverified.',
            };
        }

        // Location permission granted but SSID still unreadable (location services off,
        // or iOS entitlement missing in this build)
        console.warn('[wifiValidator] SSID unreadable despite permission. Failing open.');
        return {
            allowed: true,   // fail open
            failOpen: true,
            code: WIFI_ERROR.UNREADABLE_SSID,
            reason: 'WiFi network name could not be verified on this device. Attendance allowed but unverified.',
        };
    }

    // 8. Match against allowed list
    for (const network of networks) {
        const allowedSSID  = normaliseSSID(network.ssid);
        const allowedBSSID = normaliseBSSID(network.bssid);

        const ssidMatch = allowedSSID &&
            allowedSSID.toLowerCase() === currentSSID.toLowerCase();

        if (!ssidMatch) continue;

        // SSID matches — check BSSID only if one is configured for this network
        if (allowedBSSID) {
            if (currentBSSID && currentBSSID === allowedBSSID) {
                return { allowed: true, ssid: currentSSID, bssid: currentBSSID };
            }
            // SSID matches but BSSID doesn't — could be a rogue AP with same name
            // Continue checking other entries (admin may have listed multiple BSSIDs)
            continue;
        }

        // SSID matches and no BSSID restriction configured — allow
        return { allowed: true, ssid: currentSSID, bssid: currentBSSID ?? undefined };
    }

    // 9. No match found
    return {
        allowed: false,
        code: WIFI_ERROR.WRONG_NETWORK,
        ssid: currentSSID,
        bssid: currentBSSID ?? undefined,
        reason: `You are connected to "${currentSSID}" which is not an authorised office network. Please connect to an approved WiFi network to mark attendance.`,
    };
};
