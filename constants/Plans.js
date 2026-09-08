/**
 * Feature names used across the system
 */
export const FEATURES = {
    GEO_LOCATION: 'geo_location',
    WIFI_ATTENDANCE: 'wifi_attendance',
    FACE_RECOGNITION: 'face_recognition',
    DEVICE_BINDING: 'device_binding',
    WFH_MODE: 'wfh_mode',
    ADVANCED_REPORTS: 'advanced_reports',
    AI_PROXY_DETECTION: 'ai_proxy_detection',
    AD_FREE: 'ad_free',
    UNLIMITED_USERS: 'unlimited_users',
    AUDIT_LOGS: 'audit_logs'
};

/**
 * Default Feature Matrix per Plan
 */
export const PLAN_DEFAULTS = {
    Free: {
        name: 'Free',
        maxUsers: 10,
        features: [
            // Only basic email/pass login and manual attendance
        ]
    },
    Basic: {
        name: 'Basic',
        maxUsers: 50,
        features: [
            FEATURES.GEO_LOCATION,
        ]
    },
    Pro: {
        name: 'Pro',
        maxUsers: 200,
        features: [
            FEATURES.GEO_LOCATION,
            FEATURES.WIFI_ATTENDANCE,
            FEATURES.DEVICE_BINDING,
            FEATURES.ADVANCED_REPORTS
        ]
    },
    Enterprise: {
        name: 'Enterprise',
        maxUsers: 999999,
        features: [
            FEATURES.GEO_LOCATION,
            FEATURES.WIFI_ATTENDANCE,
            FEATURES.FACE_RECOGNITION,
            FEATURES.DEVICE_BINDING,
            FEATURES.WFH_MODE,
            FEATURES.ADVANCED_REPORTS,
            FEATURES.AI_PROXY_DETECTION,
            FEATURES.UNLIMITED_USERS,
            FEATURES.AUDIT_LOGS
        ]
    }
};

/**
 * Feature Labels for UI
 */
export const FEATURE_LABELS = {
    [FEATURES.GEO_LOCATION]: { label: 'Geo-location Attendance', icon: 'location' },
    [FEATURES.WIFI_ATTENDANCE]: { label: 'WiFi Based Validation', icon: 'wifi' },
    [FEATURES.FACE_RECOGNITION]: { label: 'Face Recognition', icon: 'scan' },
    [FEATURES.DEVICE_BINDING]: { label: 'Device Binding Login', icon: 'phone-portrait' },
    [FEATURES.WFH_MODE]: { label: 'Work From Home Mode', icon: 'home' },
    [FEATURES.ADVANCED_REPORTS]: { label: 'Excel/PDF Export', icon: 'document-text' },
    [FEATURES.AI_PROXY_DETECTION]: { label: 'AI Proxy Detection', icon: 'eye' },
    [FEATURES.UNLIMITED_USERS]: { label: 'Unlimited Users', icon: 'people' },
    [FEATURES.AUDIT_LOGS]: { label: 'Advanced Audit Logs', icon: 'list' }
};
