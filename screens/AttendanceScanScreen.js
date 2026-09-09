import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebaseConfig';
import { formatDate, formatTime, calculateAttendanceStatus, isAttendanceMarkedToday } from '../utils/attendance';
import { resolveConfig } from '../utils/attendanceConfig';
import Colors, { gradients, shadows } from '../constants/Colors';

export default function AttendanceScanScreen({ navigation }) {
    const { user, isFeatureEnabled, FEATURES } = useAuth();
    const [loading, setLoading] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [officeSettings, setOfficeSettings] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load office settings
            const settingsDoc = await db.collection('office_settings').doc('settings_default').get();
            const settings = settingsDoc.exists ? resolveConfig(settingsDoc.data()) : resolveConfig(null);
            setOfficeSettings(settings);

            // Load today's attendance
            const today = formatDate(new Date());
            const attendanceSnapshot = await db.collection('attendance').getDocs();
            const todayRecord = attendanceSnapshot.docs.find(doc => {
                const docData = doc.data();
                const docUserId = docData.userId;
                return typeof docUserId === 'string' && typeof user.uid === 'string'
                    ? docUserId.toLowerCase() === user.uid.toLowerCase() && docData.date === today
                    : docUserId === user.uid && docData.date === today;
            });

            if (todayRecord) {
                setTodayAttendance(todayRecord.data());
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDefaultSettings = () => resolveConfig(null);

    const handleCheckIn = async () => {
        // Temporarily disabled - allow face scanning without registration for testing
        // if (!user.faceRegistered) {
        //     Alert.alert(
        //         'Face Not Registered',
        //         'Please register your face first to use face-based attendance.',
        //         [
        //             { text: 'Cancel', style: 'cancel' },
        //             {
        //                 text: 'Register Now',
        //                 onPress: () => navigation.navigate('FaceRegistration')
        //             }
        //         ]
        //     );
        //     return;
        // }

        // Launch appropriate scanner based on plan
        if (isFeatureEnabled(FEATURES.FACE_RECOGNITION)) {
            navigation.navigate('RealTimeFaceScan', {
                action: 'check-in',
                onSuccess: performCheckIn
            });
        } else {
            // Fallback for non-face plans: Just use Geo-location
            // We simulate a geo-scan here or use a dedicated simple scan screen
            performCheckIn({ latitude: 18.5204, longitude: 73.8567 }); // Mock location
        }
    };

    const performCheckIn = async (locationData) => {
        try {
            setLoading(true);

            const now = new Date();
            const today = formatDate(now);
            const settings = officeSettings || getDefaultSettings();

            // Check if already checked in (but not checked out)
            if (todayAttendance && todayAttendance.checkIn && !todayAttendance.checkOut) {
                Alert.alert('Already Checked In', 'Please check-out first before checking in again.');
                return;
            }

            let attendanceData;
            let attendanceId;

            if (todayAttendance) {
                // Update existing record with new session
                attendanceId = todayAttendance.id;

                // Initialize sessions array if not exists
                const sessions = todayAttendance.sessions || [];

                // Add new session
                const newSession = {
                    checkIn: now.toISOString(),
                    checkInTime: formatTime(now),
                    checkOut: null,
                    checkOutTime: null,
                    sessionHours: 0,
                    location: locationData,
                };

                sessions.push(newSession);

                // Calculate first check-in status (for late detection)
                const firstCheckIn = sessions[0].checkIn;
                const status = calculateAttendanceStatus(firstCheckIn, null, settings);

                attendanceData = {
                    ...todayAttendance,
                    companyId: user.companyId, // Ensure companyId is present
                    checkIn: now.toISOString(), // Update to latest check-in
                    checkInTime: formatTime(now),
                    checkOut: null, // Reset check-out
                    checkOutTime: null,
                    sessions: sessions,
                    isLate: status.isLate,
                    lateMinutes: status.lateMinutes || 0,
                    method: isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'face_scan' : 'geo_location',
                    faceVerified: isFeatureEnabled(FEATURES.FACE_RECOGNITION),
                    location: locationData,
                    updatedAt: now.toISOString(),
                };
            } else {
                // Create new attendance record
                attendanceId = `att_${user.uid}_${today}`;

                const status = calculateAttendanceStatus(now, null, settings);

                attendanceData = {
                    id: attendanceId,
                    userId: user.uid,
                    employeeId: user.employeeId,
                    employeeName: user.name,
                    companyId: user.companyId, // Enforce tenant isolation
                    date: today,
                    checkIn: now.toISOString(),
                    checkInTime: formatTime(now),
                    checkOut: null,
                    checkOutTime: null,
                    status: status.isLate ? 'late' : 'present',
                    workHours: 0,
                    sessions: [{
                        checkIn: now.toISOString(),
                        checkInTime: formatTime(now),
                        checkOut: null,
                        checkOutTime: null,
                        sessionHours: 0,
                        location: locationData,
                    }],
                    isLate: status.isLate,
                    lateMinutes: status.lateMinutes || 0,
                    method: isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'face_scan' : 'geo_location',
                    faceVerified: isFeatureEnabled(FEATURES.FACE_RECOGNITION),
                    location: locationData,
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                };
            }

            // Save to Firestore
            await db.collection('attendance').doc(attendanceId).set(attendanceData);

            setTodayAttendance(attendanceData);

            const sessionNumber = attendanceData.sessions.length;
            const locationText = locationData
                ? `\nLocation: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
                : '';

            Alert.alert(
                'Check-In Successful! ✅',
                `Time: ${formatTime(now)}\nSession: ${sessionNumber}\nMethod: ${isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Face Scan' : 'Geo-Location Scan'}${locationText}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error checking in:', error);
            Alert.alert('Error', 'Failed to mark check-in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        // Temporarily disabled - allow face scanning without registration for testing
        // if (!user.faceRegistered) {
        //     Alert.alert(
        //         'Face Not Registered',
        //         'Please register your face first to use face-based attendance.',
        //         [
        //             { text: 'Cancel', style: 'cancel' },
        //             {
        //                 text: 'Register Now',
        //                 onPress: () => navigation.navigate('FaceRegistration')
        //             }
        //         ]
        //     );
        //     return;
        // }

        // Launch scanner based on plan
        if (isFeatureEnabled(FEATURES.FACE_RECOGNITION)) {
            navigation.navigate('RealTimeFaceScan', {
                action: 'check-out',
                onSuccess: performCheckOut
            });
        } else {
            performCheckOut({ latitude: 18.5204, longitude: 73.8567 });
        }
    };

    const performCheckOut = async (locationData) => {
        try {
            setLoading(true);

            if (!todayAttendance || !todayAttendance.checkIn) {
                Alert.alert('No Check-In Found', 'Please check-in first before checking out.');
                return;
            }

            if (todayAttendance.checkOut) {
                Alert.alert('Already Checked Out', 'You have already checked out for this session.');
                return;
            }

            const now = new Date();
            const settings = officeSettings || getDefaultSettings();

            // Get sessions array
            const sessions = todayAttendance.sessions || [];

            // Find the current active session (last session without checkout)
            const currentSessionIndex = sessions.findIndex(s => !s.checkOut);

            if (currentSessionIndex === -1) {
                Alert.alert('Error', 'No active session found.');
                return;
            }

            // Update current session with check-out
            const currentSession = sessions[currentSessionIndex];
            const sessionCheckInTime = new Date(currentSession.checkIn);
            const sessionHours = (now - sessionCheckInTime) / (1000 * 60 * 60);

            sessions[currentSessionIndex] = {
                ...currentSession,
                checkOut: now.toISOString(),
                checkOutTime: formatTime(now),
                sessionHours: parseFloat(sessionHours.toFixed(2)),
                checkoutLocation: locationData,
            };

            // Calculate total work hours from all sessions
            const totalWorkHours = sessions.reduce((total, session) => {
                return total + (session.sessionHours || 0);
            }, 0);

            // Get first check-in time for status calculation
            const firstCheckIn = new Date(sessions[0].checkIn);

            // Calculate final status based on first check-in and total hours
            const status = calculateAttendanceStatus(firstCheckIn, now, {
                ...settings,
                // Override work hours for status calculation
                workHours: totalWorkHours,
            });

            // Update attendance record
            const updatedAttendance = {
                ...todayAttendance,
                companyId: user.companyId, // Ensure companyId is present
                checkOut: now.toISOString(),
                checkOutTime: formatTime(now),
                sessions: sessions,
                workHours: parseFloat(totalWorkHours.toFixed(2)),
                status: status.status,
                method: isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'face_scan' : 'geo_location',
                faceVerified: isFeatureEnabled(FEATURES.FACE_RECOGNITION),
                checkoutLocation: locationData,
                updatedAt: now.toISOString(),
            };

            await db.collection('attendance').doc(todayAttendance.id).set(updatedAttendance);

            setTodayAttendance(updatedAttendance);

            const sessionNumber = currentSessionIndex + 1;
            const locationText = locationData
                ? `\nCheckout Location: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
                : '';

            Alert.alert(
                'Check-Out Successful! ✅',
                `Time: ${formatTime(now)}\nSession ${sessionNumber} Hours: ${sessionHours.toFixed(1)} hrs\nTotal Work Hours: ${totalWorkHours.toFixed(1)} hrs\nStatus: ${status.status.toUpperCase()}\nMethod: ${isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Face Scan' : 'Geo-Location Scan'}${locationText}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error checking out:', error);
            Alert.alert('Error', 'Failed to mark check-out. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = () => {
        if (!todayAttendance) {
            return {
                title: 'Not Marked',
                subtitle: 'Mark your attendance now',
                icon: 'time-outline',
                color: Colors.textSecondary,
            };
        }

        if (todayAttendance.checkOut) {
            return {
                title: 'Checked Out',
                subtitle: `Work Hours: ${todayAttendance.workHours.toFixed(1)} hrs`,
                icon: 'checkmark-circle',
                color: Colors.success,
            };
        }

        return {
            title: 'Checked In',
            subtitle: `Since ${todayAttendance.checkInTime}`,
            icon: 'time',
            color: Colors.primary,
        };
    };

    const statusInfo = getStatusInfo();

    if (loading && !todayAttendance) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={gradients.primary}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={Colors.textInverse} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Face Attendance' : 'Mark Attendance'}</Text>
                <Text style={styles.headerSubtitle}>{isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Smart Verification Active' : 'Scan to check-in/out'}</Text>
            </LinearGradient>

            <View style={styles.content}>
                {/* Current Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusIconContainer}>
                        <Ionicons name={statusInfo.icon} size={40} color={statusInfo.color} />
                    </View>
                    <Text style={styles.statusTitle}>{statusInfo.title}</Text>
                    <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>

                    {todayAttendance && todayAttendance.isLate && !todayAttendance.checkOut && (
                        <View style={styles.lateWarning}>
                            <Ionicons name="warning" size={16} color={Colors.warning} />
                            <Text style={styles.lateText}>
                                Late by {todayAttendance.lateMinutes} minutes
                            </Text>
                        </View>
                    )}
                </View>

                {/* Attendance Details */}
                {todayAttendance && (
                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsTitle}>Today's Details</Text>

                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="log-in" size={20} color={Colors.success} />
                                <Text style={styles.detailLabel}>Check-In</Text>
                            </View>
                            <Text style={styles.detailValue}>
                                {todayAttendance.checkInTime || '-'}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="log-out" size={20} color={Colors.error} />
                                <Text style={styles.detailLabel}>Check-Out</Text>
                            </View>
                            <Text style={styles.detailValue}>
                                {todayAttendance.checkOutTime || '-'}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="time" size={20} color={Colors.primary} />
                                <Text style={styles.detailLabel}>Work Hours</Text>
                            </View>
                            <Text style={styles.detailValue}>
                                {todayAttendance.workHours.toFixed(1)} hrs
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="information-circle" size={20} color={Colors.info} />
                                <Text style={styles.detailLabel}>Status</Text>
                            </View>
                            <Text style={[styles.detailValue, styles.statusBadge, {
                                backgroundColor: todayAttendance.status === 'present' ? Colors.success :
                                    todayAttendance.status === 'late' ? Colors.warning : Colors.error,
                            }]}>
                                {todayAttendance.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {!todayAttendance || !todayAttendance.checkIn ? (
                        <TouchableOpacity
                            style={styles.checkInButton}
                            onPress={handleCheckIn}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Colors.success, Colors.successDark]}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color={Colors.textInverse} />
                                ) : (
                                    <>
                                        <Ionicons name="log-in" size={24} color={Colors.textInverse} />
                                        <Text style={styles.buttonText}>Check-In Now</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : !todayAttendance.checkOut ? (
                        <TouchableOpacity
                            style={styles.checkOutButton}
                            onPress={handleCheckOut}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Colors.error, Colors.errorDark]}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color={Colors.textInverse} />
                                ) : (
                                    <>
                                        <Ionicons name="log-out" size={24} color={Colors.textInverse} />
                                        <Text style={styles.buttonText}>Check-Out Now</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.completedCard}>
                            <Ionicons name="checkmark-circle" size={60} color={Colors.success} />
                            <Text style={styles.completedText}>Attendance Marked for Today!</Text>
                            <TouchableOpacity
                                style={styles.viewHistoryButton}
                                onPress={() => navigation.navigate('AttendanceHistory')}
                            >
                                <Text style={styles.viewHistoryText}>View History</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={20} color={Colors.info} />
                    <Text style={styles.infoText}>
                        {officeSettings ?
                            `Office Hours: ${officeSettings.officeStartTime} - ${officeSettings.officeEndTime}` :
                            'Office Hours: 09:00 - 18:00'
                        }
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: Colors.textSecondary,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.textInverse,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    statusCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        marginBottom: 20,
        ...shadows.medium,
    },
    statusIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    statusSubtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
    lateWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundDark,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 12,
        gap: 8,
    },
    lateText: {
        fontSize: 14,
        color: Colors.warning,
        fontWeight: '600',
    },
    detailsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        ...shadows.small,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    detailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailLabel: {
        fontSize: 15,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 15,
        color: Colors.text,
        fontWeight: '600',
    },
    statusBadge: {
        color: Colors.textInverse,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 'bold',
    },
    actionButtons: {
        marginBottom: 20,
    },
    checkInButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...shadows.large,
    },
    checkOutButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...shadows.large,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 12,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textInverse,
    },
    completedCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        ...shadows.small,
    },
    completedText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    viewHistoryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    viewHistoryText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textInverse,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        gap: 12,
        ...shadows.small,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
});
