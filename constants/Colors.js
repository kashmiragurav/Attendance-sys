/**
 * Color Palette for Attendance Management System
 * Modern, professional color scheme
 */

export default {
    // Primary Colors
    primary: '#007AFF',
    primaryDark: '#0051D5',
    primaryLight: '#4DA2FF',

    // Secondary Colors
    secondary: '#5856D6',
    secondaryDark: '#3634A3',
    secondaryLight: '#7D7BE8',

    // Status Colors
    success: '#34C759',
    successDark: '#248A3D',
    successLight: '#5DD97C',

    warning: '#FF9500',
    warningDark: '#C77700',
    warningLight: '#FFB340',

    error: '#FF3B30',
    errorDark: '#C72C24',
    errorLight: '#FF6259',

    info: '#5AC8FA',
    infoDark: '#32AEE8',
    infoLight: '#7DD4FB',

    // Neutral Colors
    background: '#F5F7FA',
    backgroundDark: '#E8EBF0',

    surface: '#FFFFFF',
    surfaceDark: '#F8F9FA',

    card: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.08)',

    // Text Colors
    text: '#1C1C1E',
    textSecondary: '#6C6C70',
    textTertiary: '#AEAEB2',
    textInverse: '#FFFFFF',

    // Border Colors
    border: '#E5E5EA',
    borderLight: '#F2F2F7',
    borderDark: '#D1D1D6',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',

    // Gradient Colors
    gradientStart: '#007AFF',
    gradientEnd: '#5856D6',

    // Attendance Status Colors
    present: '#34C759',
    late: '#FF9500',
    halfDay: '#FF9500',
    absent: '#FF3B30',

    // Role Colors
    superAdmin: '#FF2D55',
    hr: '#5856D6',
    employee: '#007AFF',

    // Transparent
    transparent: 'transparent',
};

export const gradients = {
    primary: ['#007AFF', '#5856D6'],
    success: ['#34C759', '#30D158'],
    warning: ['#FF9500', '#FF9F0A'],
    error: ['#FF3B30', '#FF453A'],
    dark: ['#1C1C1E', '#2C2C2E'],
    premium: ['#FFFFFF', '#F5F7FA'],
    aurora: ['#007AFF', '#0051D5'],
};

export const shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 8,
    },
};
