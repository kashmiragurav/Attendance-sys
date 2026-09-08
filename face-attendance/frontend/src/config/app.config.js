export const AppConfig = {
  // Face Detection
  faceDetection: {
    mode: 'fast', // 'accurate' or 'fast'
    detectLandmarks: true,
    runClassifications: true,
  },

  // Liveness Checks
  livenessCheck: {
    enabled: true,
    blinkThreshold: 0.3,
    headMovementThreshold: 30,
    stabilityCheckTime: 1000, // ms
  },

  // Attendance
  attendance: {
    allowCheckoutBeforeCheckin: false,
    duplicatePrevention: 5, // minutes
    workingHours: {
      start: '09:00',
      end: '18:00',
    },
  },

  // Face Recognition
  faceRecognition: {
    matchThreshold: 0.6, // 0-1, higher = stricter
    useCloudFunctions: true, // false = use on-device embeddings
    maxRetries: 3,
  },

  // Storage
  storage: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    imageQuality: 0.8,
  },

  // UI
  ui: {
    animationDuration: 300,
    toastDuration: 3000,
    debounceDelay: 500,
  },
};
