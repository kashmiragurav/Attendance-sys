/**
 * Keep attendance photo capture working without requiring Firebase Storage.
 *
 * The current app does not have a suitable persistent non-Storage photo mechanism,
 * so the smallest safe compatibility fix is to retain a local in-memory data URI
 * for the current punch flow. This preserves the existing UI and punch flow while
 * avoiding any Firebase Storage dependency for attendance evidence.
 */
export const uploadAttendancePhoto = async ({ base64 }) => {
    try {
        if (!base64) return { ok: false, error: 'No image data' };
        const cleanBase64 = String(base64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
        return {
            ok: true,
            url: `data:image/jpeg;base64,${cleanBase64}`,
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};
