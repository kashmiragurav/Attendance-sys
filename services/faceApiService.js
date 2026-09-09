/**
 * Face API Service
 *
 * CURRENT STATUS: SIMULATED — no real identity verification occurs.
 * The backend route structure exists in BACKEND_FACE_API.js but is not deployed.
 *
 * To enable real verification:
 *   1. Deploy BACKEND_FACE_API.js to your server
 *   2. Set BACKEND_URL to your deployed endpoint
 *   3. Set SIMULATION_MODE = false
 */

const BACKEND_URL = 'https://api.yourdomain.com/face'; // Replace with deployed URL
const SIMULATION_MODE = true; // Set false once backend is live
const API_TIMEOUT_MS = 15000;

const fetchWithTimeout = (url, options) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
};

export const faceApiService = {
    /**
     * Register face — sends image to backend which extracts and stores the embedding.
     * The raw image is never stored; only the numeric descriptor is persisted.
     */
    registerFace: async (userId, companyId, imageBase64) => {
        if (SIMULATION_MODE) {
            console.warn('[faceApiService] SIMULATION: registerFace — no real embedding stored');
            await new Promise(r => setTimeout(r, 800));
            return { success: true, simulated: true, message: 'Simulated registration' };
        }

        try {
            const response = await fetchWithTimeout(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, companyId, imageBase64 }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error || `Server error ${response.status}` };
            }
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, error: 'Registration request timed out. Please try again.' };
            }
            return { success: false, error: error.message };
        }
    },

    /**
     * Verify face — backend compares live capture embedding against stored embedding.
     * Returns isMatch and matchScore. Never trusts a client-provided boolean.
     */
    verifyFace: async (userId, imageBase64, threshold = 0.6) => {
        if (SIMULATION_MODE) {
            console.warn('[faceApiService] SIMULATION: verifyFace — identity NOT verified');
            await new Promise(r => setTimeout(r, 800));
            // Explicitly mark simulated so callers can surface this to the record
            return { success: true, isMatch: true, matchScore: null, simulated: true };
        }

        try {
            const response = await fetchWithTimeout(`${BACKEND_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, imageBase64, threshold }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error || `Server error ${response.status}` };
            }
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, error: 'Verification request timed out. Please try again.' };
            }
            return { success: false, error: error.message };
        }
    },

    isSimulated: () => SIMULATION_MODE,
};
