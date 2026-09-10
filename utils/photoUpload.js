import { storage } from '../services/firebaseConfig';

/**
 * Builds the storage path for an attendance photo.
 * Format: attendance_photos/{companyId}/{userId}/{date}/{sessionIndex}_{action}.jpg
 *
 * Using sessionIndex in the filename ensures photos from different sessions on the
 * same day never overwrite each other, and check-in vs check-out are distinct.
 */
const buildPath = (companyId, userId, date, sessionIndex, action) =>
    `attendance_photos/${companyId}/${userId}/${date}/${sessionIndex}_${action}.jpg`;

/**
 * Upload an attendance photo to Firebase Storage.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.userId
 * @param {string} params.date        - YYYY-MM-DD
 * @param {number} params.sessionIndex - 0-based index of the attendance session
 * @param {string} params.action      - 'check-in' | 'check-out'
 * @param {string} params.base64      - raw base64 JPEG (no data URI prefix)
 * @returns {Promise<{ok: boolean, url?: string, error?: string}>}
 *
 * Never throws — callers can treat a failed upload as non-fatal.
 */
export const uploadAttendancePhoto = async ({ companyId, userId, date, sessionIndex, action, base64 }) => {
    try {
        if (!base64) return { ok: false, error: 'No image data' };
        const path = buildPath(companyId, userId, date, sessionIndex, action);
        return await storage.uploadBase64(path, base64);
    } catch (err) {
        return { ok: false, error: err.message };
    }
};
