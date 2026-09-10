import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import { db, attendanceHelpers } from '../services/firebaseConfig';
import { formatDate, formatTime, calculateAttendanceStatus, isAttendanceMarkedToday } from '../utils/attendance';
import { resolveConfig } from '../utils/attendanceConfig';
import { checkAttendanceLocation } from '../utils/locationValidator';
import { uploadAttendancePhoto } from '../utils/photoUpload';
import { validateWifi } from '../utils/wifiValidator';
import Colors, { gradients, shadows } from '../constants/Colors';

export default function AttendanceScanScreen({ navigation, route }) {
    const { user, isFeatureEnabled, FEATURES, company } = useAuth();
    const isWFH = route?.params?.isWFH === true;
    const attendanceMode = isWFH ? 'WFH' : 'OFFICE';
    const [loading, setLoading] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [officeSettings, setOfficeSettings] = useState(null);
    const [breakLoading, setBreakLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Re-load when screen comes back into focus (e.g. returning from face scan)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', loadData);
        return unsubscribe;
    }, [navigation]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [settingsDoc, todayResult] = await Promise.all([
                db.collection('office_settings').doc('settings_default').get(),
                attendanceHelpers.getTodayAttendanceDoc(user.uid, formatDate(new Date())),
            ]);
            setOfficeSettings(settingsDoc.exists ? resolveConfig(settingsDoc.data()) : resolveConfig(null));
            if (todayResult.success && todayResult.data) {
                // Ensure the local record always carries its Firestore doc ID
                setTodayAttendance({ ...todayResult.data, id: todayResult.id });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDefaultSettings = () => resolveConfig(null);

    const checkWifiIfRequired = async () => {
        // WFH employees are not on the office network — skip WiFi restriction
        if (isWFH) return true;
        if (!company?.wifiRestrictionEnabled) return true;
        const result = await validateWifi(company.allowedWifis || []);
        if (result.failOpen) {
            console.warn('[AttendanceScan] WiFi fail-open:', result.code);
            return true;
        }
        if (!result.allowed) {
            Alert.alert('WiFi Validation Failed', result.reason);
            return false;
        }
        return true;
    };

    /**
     * Silently capture a photo using the device camera.
     * Returns base64 string or null if the user declines / capture fails.
     * Never blocks attendance — always resolves.
     */
    const captureAttendancePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return null;

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5,
                base64: false,
            });

            if (result.canceled || !result.assets?.[0]?.uri) return null;

            const manipulated = await manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 500 } }],
                { compress: 0.7, format: SaveFormat.JPEG, base64: true }
            );

            return manipulated.base64 || null;
        } catch (err) {
            console.warn('[AttendanceScan] Photo capture failed:', err.message);
            return null;
        }
    };

    const handleCheckIn = async () => {
        if (isFeatureEnabled(FEATURES.FACE_RECOGNITION)) {
            navigation.navigate('RealTimeFaceScan', {
                action: 'check-in',
                onSuccess: performCheckIn
            });
        } else {
            setLoading(true);
            const wifiOk = await checkWifiIfRequired();
            if (!wifiOk) { setLoading(false); return; }
            const settings = officeSettings || getDefaultSettings();
            const locResult = await checkAttendanceLocation(settings, attendanceMode);
            setLoading(false);
            if (!locResult.ok) {
                Alert.alert('Location Error', locResult.message);
                return;
            }
            performCheckIn(locResult.locationData);
        }
    };

    const performCheckIn = async (locationData) => {
        if (loading) return;
        try {
            setLoading(true);

            const now = new Date();
            const today = formatDate(now);
            const settings = officeSettings || getDefaultSettings();

            // Always re-read from Firestore to avoid stale-state race conditions
            const freshResult = await attendanceHelpers.getTodayAttendanceDoc(user.uid, today);
            const freshRecord = freshResult.success && freshResult.data
                ? { ...freshResult.data, id: freshResult.id }
                : null;

            // Block if there is an active (unclosed) session in the fresh record
            const existingSessions = freshRecord?.sessions || [];
            const hasActiveSession = existingSessions.some(s => s.checkIn && !s.checkOut);
            if (hasActiveSession) {
                Alert.alert('Active Session', 'Please check-out first before starting a new session.');
                setLoading(false);
                return;
            }

            const sessionIndex = existingSessions.length;
            const base64 = await captureAttendancePhoto();
            let photoUrl = null;
            if (base64) {
                const photoResult = await uploadAttendancePhoto({
                    companyId: user.companyId,
                    userId: user.uid,
                    date: today,
                    sessionIndex,
                    action: 'check-in',
                    base64,
                });
                if (!photoResult.ok) console.warn('[Photo] Upload failed:', photoResult.error);
                else photoUrl = photoResult.url;
            }

            let attendanceData;
            let attendanceId;

            if (freshRecord) {
                attendanceId = freshRecord.id;
                // Build new sessions array immutably — never mutate state
                const updatedSessions = [
                    ...existingSessions,
                    {
                        checkIn: now.toISOString(),
                        checkInTime: formatTime(now),
                        checkOut: null,
                        checkOutTime: null,
                        sessionHours: 0,
                        location: locationData,
                        checkInPhotoUrl: photoUrl,
                    },
                ];
                const firstCheckIn = updatedSessions[0].checkIn;
                const status = calculateAttendanceStatus(firstCheckIn, null, settings);
                attendanceData = {
                    ...freshRecord,
                    companyId: user.companyId,
                    checkIn: now.toISOString(),
                    checkInTime: formatTime(now),
                    checkOut: null,
                    checkOutTime: null,
                    sessions: updatedSessions,
                    isLate: status.isLate,
                    lateMinutes: status.lateMinutes || 0,
                    method: isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'face_scan' : 'geo_location',
                    faceVerified: isFeatureEnabled(FEATURES.FACE_RECOGNITION),
                    attendanceMode,
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
                        checkInPhotoUrl: photoUrl,
                    }],
                    isLate: status.isLate,
                    lateMinutes: status.lateMinutes || 0,
                    method: isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'face_scan' : 'geo_location',
                    faceVerified: isFeatureEnabled(FEATURES.FACE_RECOGNITION),
                    attendanceMode,
                    location: locationData,
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                };
            }

            // Write to Firestore with ownership enforcement — only update local state after confirmed write
            await attendanceHelpers.writeAttendanceRecord(user.uid, user.companyId, attendanceId, attendanceData);
            setTodayAttendance(attendanceData);

            const sessionNumber = attendanceData.sessions.length;
            const locationText = locationData
                ? `\nLocation: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
                : '';

            Alert.alert(
                'Check-In Successful! ✅',
                `Time: ${formatTime(now)}\nMode: ${attendanceMode}\nSession: ${sessionNumber}\nMethod: ${isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Face Scan' : 'Geo-Location Scan'}${locationText}`,
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
        if (isFeatureEnabled(FEATURES.FACE_RECOGNITION)) {
            navigation.navigate('RealTimeFaceScan', {
                action: 'check-out',
                onSuccess: performCheckOut
            });
        } else {
            setLoading(true);
            const wifiOk = await checkWifiIfRequired();
            if (!wifiOk) { setLoading(false); return; }
            const settings = officeSettings || getDefaultSettings();
            const locResult = await checkAttendanceLocation(settings, attendanceMode);
            setLoading(false);
            if (!locResult.ok) {
                Alert.alert('Location Error', locResult.message);
                return;
            }
            performCheckOut(locResult.locationData);
        }
    };

    const performCheckOut = async (locationData) => {
        if (loading) return;
        try {
            setLoading(true);

            const now = new Date();
            const today = formatDate(now);
            const settings = officeSettings || getDefaultSettings();

            // Re-read from Firestore to get the authoritative current state
            const freshResult = await attendanceHelpers.getTodayAttendanceDoc(user.uid, today);
            const freshRecord = freshResult.success && freshResult.data
                ? { ...freshResult.data, id: freshResult.id }
                : null;

            if (!freshRecord) {
                Alert.alert('No Active Session', 'Please check-in first before checking out.');
                setLoading(false);
                return;
            }

            const freshSessions = freshRecord.sessions || [];
            const currentSessionIndex = freshSessions.findIndex(s => s.checkIn && !s.checkOut);
            if (currentSessionIndex === -1) {
                Alert.alert('No Active Session', 'Please check-in first before checking out.');
                setLoading(false);
                return;
            }

            const base64 = await captureAttendancePhoto();
            let photoUrl = null;
            if (base64) {
                const photoResult = await uploadAttendancePhoto({
                    companyId: user.companyId,
                    userId: user.uid,
                    date: today,
                    sessionIndex: currentSessionIndex,
                    action: 'check-out',
                    base64,
                });
                if (!photoResult.ok) console.warn('[Photo] Upload failed:', photoResult.error);
                else photoUrl = photoResult.url;
            }

            const currentSession = freshSessions[currentSessionIndex];
            const sessionHours = (now - new Date(currentSession.checkIn)) / (1000 * 60 * 60);

            // Build updated sessions array immutably
            const updatedSessions = freshSessions.map((s, i) =>
                i === currentSessionIndex
                    ? {
                        ...s,
                        checkOut: now.toISOString(),
                        checkOutTime: formatTime(now),
                        sessionHours: parseFloat(sessionHours.toFixed(2)),
                        checkoutLocation: locationData,
                        checkOutPhotoUrl: photoUrl,
                    }
                    : s
            );

            const totalWorkHours = updatedSessions.reduce((t, s) => t + (s.sessionHours || 0), 0);
            const firstCheckIn = new Date(updatedSessions[0].checkIn);
            const totalBreakMinutes = getTotalBreakMinutes(freshRecord.breaks || []);
            const status = calculateAttendanceStatus(firstCheckIn, now, {
                ...settings,
                workHours: totalWorkHours,
                totalBreakMinutes,
            });

            const updatedAttendance = {
                ...freshRecord,
                companyId: user.companyId,
                checkOut: now.toISOString(),
                checkOutTime: formatTime(now),
                sessions: updatedSessions,
                workHours: parseFloat(totalWorkHours.toFixed(2)),
                totalBreakMinutes,
                status: status.status,
                method: isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'face_scan' : 'geo_location',
                faceVerified: isFeatureEnabled(FEATURES.FACE_RECOGNITION),
                attendanceMode,
                checkoutLocation: locationData,
                updatedAt: now.toISOString(),
            };

            // Write with ownership enforcement — only update local state after confirmed write
            await attendanceHelpers.writeAttendanceRecord(user.uid, user.companyId, freshRecord.id, updatedAttendance);
            setTodayAttendance(updatedAttendance);

            const sessionNumber = currentSessionIndex + 1;
            const locationText = locationData
                ? `\nCheckout Location: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
                : '';

            Alert.alert(
                'Check-Out Successful! ✅',
                `Time: ${formatTime(now)}\nMode: ${attendanceMode}\nSession ${sessionNumber} Hours: ${sessionHours.toFixed(1)} hrs\nTotal Work Hours: ${totalWorkHours.toFixed(1)} hrs\nStatus: ${status.status.toUpperCase()}\nMethod: ${isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Face Scan' : 'Geo-Location Scan'}${locationText}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error checking out:', error);
            Alert.alert('Error', 'Failed to mark check-out. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getActiveSession = () => {
        const sessions = todayAttendance?.sessions || [];
        return sessions.find(s => s.checkIn && !s.checkOut) || null;
    };

    // ── Break helpers ──────────────────────────────────────────────────────────
    const getActiveBreak = () => {
        const breaks = todayAttendance?.breaks || [];
        return breaks.find(b => b.start && !b.end) || null;
    };

    const getTotalBreakMinutes = (breaks = []) =>
        breaks.filter(b => b.end).reduce((t, b) => t + (b.durationMinutes || 0), 0);

    const handleBreakStart = async () => {
        if (breakLoading) return;
        const settings = officeSettings || getDefaultSettings();
        if (!settings.breakEnabled) {
            Alert.alert('Breaks Disabled', 'Break tracking is not enabled by your administrator.');
            return;
        }
        const activeSession = getActiveSession();
        if (!activeSession) {
            Alert.alert('Not Checked In', 'You must be checked in to start a break.');
            return;
        }
        if (getActiveBreak()) {
            Alert.alert('Break Active', 'You already have an active break. End it first.');
            return;
        }
        const breaks = todayAttendance.breaks || [];
        const completedBreaks = breaks.filter(b => b.end);
        if (completedBreaks.length >= (settings.maxBreakCount || 2)) {
            Alert.alert('Break Limit Reached', `Maximum ${settings.maxBreakCount} break(s) allowed per day.`);
            return;
        }
        const totalUsed = getTotalBreakMinutes(breaks);
        if (totalUsed >= (settings.maxBreakMinutes || 60)) {
            Alert.alert('Break Limit Reached', `You have used all ${settings.maxBreakMinutes} allowed break minutes.`);
            return;
        }
        try {
            setBreakLoading(true);
            // Re-read from Firestore before writing to avoid stale break array
            const today = formatDate(new Date());
            const freshResult = await attendanceHelpers.getTodayAttendanceDoc(user.uid, today);
            if (!freshResult.success || !freshResult.data) {
                Alert.alert('Error', 'Could not load attendance record.');
                return;
            }
            const freshRecord = { ...freshResult.data, id: freshResult.id };
            const freshBreaks = freshRecord.breaks || [];
            // Re-validate against fresh data
            if (freshBreaks.some(b => b.start && !b.end)) {
                Alert.alert('Break Active', 'You already have an active break. End it first.');
                return;
            }
            const now = new Date();
            const newBreak = {
                start: now.toISOString(),
                startTime: formatTime(now),
                end: null,
                endTime: null,
                durationMinutes: 0,
                sessionIndex: (freshRecord.sessions || []).findIndex(s => s.checkIn && !s.checkOut),
            };
            const updated = { ...freshRecord, breaks: [...freshBreaks, newBreak], updatedAt: now.toISOString() };
            await attendanceHelpers.writeAttendanceRecord(user.uid, user.companyId, freshRecord.id, updated);
            setTodayAttendance(updated);
            Alert.alert('Break Started ☕', `Break started at ${formatTime(now)}`);
        } catch (e) {
            console.error('Break start error:', e);
            Alert.alert('Error', 'Failed to start break.');
        } finally {
            setBreakLoading(false);
        }
    };

    const handleBreakEnd = async () => {
        if (breakLoading) return;
        const activeBreak = getActiveBreak();
        if (!activeBreak) {
            Alert.alert('No Active Break', 'No break is currently active.');
            return;
        }
        try {
            setBreakLoading(true);
            // Re-read from Firestore before writing
            const today = formatDate(new Date());
            const freshResult = await attendanceHelpers.getTodayAttendanceDoc(user.uid, today);
            if (!freshResult.success || !freshResult.data) {
                Alert.alert('Error', 'Could not load attendance record.');
                return;
            }
            const freshRecord = { ...freshResult.data, id: freshResult.id };
            const freshBreaks = freshRecord.breaks || [];
            const freshActiveBreak = freshBreaks.find(b => b.start && !b.end);
            if (!freshActiveBreak) {
                Alert.alert('No Active Break', 'No break is currently active.');
                return;
            }
            const now = new Date();
            const settings = officeSettings || getDefaultSettings();
            const durationMinutes = Math.round((now - new Date(freshActiveBreak.start)) / 60000);
            const totalUsedBefore = getTotalBreakMinutes(freshBreaks);
            const allowed = settings.maxBreakMinutes || 60;
            const cappedDuration = Math.min(durationMinutes, allowed - totalUsedBefore);
            const updatedBreaks = freshBreaks.map(b =>
                b === freshActiveBreak
                    ? { ...b, end: now.toISOString(), endTime: formatTime(now), durationMinutes: cappedDuration }
                    : b
            );
            const updated = { ...freshRecord, breaks: updatedBreaks, updatedAt: now.toISOString() };
            await attendanceHelpers.writeAttendanceRecord(user.uid, user.companyId, freshRecord.id, updated);
            setTodayAttendance(updated);
            Alert.alert('Break Ended ✅', `Break duration: ${cappedDuration} min`);
        } catch (e) {
            console.error('Break end error:', e);
            Alert.alert('Error', 'Failed to end break.');
        } finally {
            setBreakLoading(false);
        }
    };
    // ── End break helpers ──────────────────────────────────────────────────────

    const getStatusInfo = () => {
        if (!todayAttendance) {
            return {
                title: 'Not Marked',
                subtitle: 'Mark your attendance now',
                icon: 'time-outline',
                color: Colors.textSecondary,
            };
        }

        const activeSession = getActiveSession();
        if (activeSession) {
            return {
                title: 'Checked In',
                subtitle: `Session ${todayAttendance.sessions.indexOf(activeSession) + 1} · Since ${activeSession.checkInTime}`,
                icon: 'time',
                color: Colors.primary,
            };
        }

        const sessions = todayAttendance.sessions || [];
        const totalHours = sessions.reduce((t, s) => t + (s.sessionHours || 0), 0);
        return {
            title: `${sessions.length} Session${sessions.length > 1 ? 's' : ''} Completed`,
            subtitle: `Total: ${totalHours.toFixed(1)} hrs · Tap to start new session`,
            icon: 'checkmark-circle',
            color: Colors.success,
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
                <Text style={styles.headerTitle}>{isWFH ? 'WFH Attendance' : (isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Face Attendance' : 'Mark Attendance')}</Text>
                <Text style={styles.headerSubtitle}>{isWFH ? 'Work From Home Mode' : (isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Smart Verification Active' : 'Scan to check-in/out')}</Text>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
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

                {/* Break Controls — only shown when checked in and breaks are enabled */}
                {(() => {
                    const settings = officeSettings || getDefaultSettings();
                    if (!settings.breakEnabled) return null;
                    const activeSession = getActiveSession();
                    if (!activeSession) return null; // only show during active session
                    const activeBreak = getActiveBreak();
                    const breaks = todayAttendance?.breaks || [];
                    const totalUsed = getTotalBreakMinutes(breaks);
                    const maxMin = settings.maxBreakMinutes || 60;
                    return (
                        <View style={styles.breakCard}>
                            <View style={styles.breakHeader}>
                                <Ionicons name="cafe-outline" size={18} color="#F39C12" />
                                <Text style={styles.breakTitle}>Break Management</Text>
                                <Text style={styles.breakUsed}>{totalUsed}/{maxMin} min used</Text>
                            </View>
                            {breaks.filter(b => b.end).map((b, i) => (
                                <View key={i} style={styles.breakRow}>
                                    <Text style={styles.breakRowLabel}>Break {i + 1}</Text>
                                    <Text style={styles.breakRowTime}>{b.startTime} → {b.endTime}</Text>
                                    <Text style={styles.breakRowDur}>{b.durationMinutes}m</Text>
                                </View>
                            ))}
                            {activeBreak && (
                                <View style={[styles.breakRow, { backgroundColor: '#FFF3CD' }]}>
                                    <Ionicons name="time-outline" size={14} color="#F39C12" />
                                    <Text style={[styles.breakRowTime, { color: '#F39C12', marginLeft: 4 }]}>On break since {activeBreak.startTime}</Text>
                                </View>
                            )}
                            <View style={styles.breakButtons}>
                                {!activeBreak ? (
                                    <TouchableOpacity
                                        style={[styles.breakBtn, { backgroundColor: '#F39C12' }]}
                                        onPress={handleBreakStart}
                                        disabled={breakLoading}
                                    >
                                        <Ionicons name="cafe" size={16} color="#FFF" />
                                        <Text style={styles.breakBtnText}>Start Break</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.breakBtn, { backgroundColor: '#27AE60' }]}
                                        onPress={handleBreakEnd}
                                        disabled={breakLoading}
                                    >
                                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                                        <Text style={styles.breakBtnText}>End Break</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })()}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {(() => {
                        const activeSession = getActiveSession();
                        const hasAnySession = todayAttendance?.sessions?.length > 0;

                        if (!hasAnySession) {
                            // No sessions yet — show Check-In
                            return (
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
                                        {loading ? <ActivityIndicator color={Colors.textInverse} /> : (
                                            <>
                                                <Ionicons name="log-in" size={24} color={Colors.textInverse} />
                                                <Text style={styles.buttonText}>Check-In Now</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            );
                        }

                        if (activeSession) {
                            // Active session — show Check-Out
                            return (
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
                                        {loading ? <ActivityIndicator color={Colors.textInverse} /> : (
                                            <>
                                                <Ionicons name="log-out" size={24} color={Colors.textInverse} />
                                                <Text style={styles.buttonText}>Check-Out Now</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            );
                        }

                        // All sessions closed — show session summary + new session button
                        return (
                            <View style={styles.completedCard}>
                                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                                <Text style={styles.completedText}>
                                    {todayAttendance.sessions.length} Session{todayAttendance.sessions.length > 1 ? 's' : ''} · {todayAttendance.workHours?.toFixed(1)} hrs
                                </Text>
                                {todayAttendance.sessions.map((s, i) => (
                                    <View key={i} style={styles.sessionRow}>
                                        <Text style={styles.sessionLabel}>Session {i + 1}</Text>
                                        <Text style={styles.sessionTime}>{s.checkInTime} → {s.checkOutTime || '--'}</Text>
                                        <Text style={styles.sessionHours}>{s.sessionHours?.toFixed(1)}h</Text>
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={styles.newSessionButton}
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
                                        {loading ? <ActivityIndicator color={Colors.textInverse} /> : (
                                            <>
                                                <Ionicons name="add-circle" size={24} color={Colors.textInverse} />
                                                <Text style={styles.buttonText}>Start New Session</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.viewHistoryButton}
                                    onPress={() => navigation.navigate('AttendanceHistory')}
                                >
                                    <Text style={styles.viewHistoryText}>View History</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })()}
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
            </ScrollView>
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
    },
    contentInner: {
        padding: 20,
        paddingBottom: 40,
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
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 12,
        marginBottom: 12,
        textAlign: 'center',
    },
    sessionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: Colors.background,
        borderRadius: 8,
        marginBottom: 4,
    },
    sessionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
        width: 70,
    },
    sessionTime: {
        fontSize: 13,
        color: Colors.text,
        flex: 1,
        textAlign: 'center',
    },
    sessionHours: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
        width: 35,
        textAlign: 'right',
    },
    newSessionButton: {
        borderRadius: 16,
        overflow: 'hidden',
        width: '100%',
        marginTop: 12,
        marginBottom: 8,
    },
    viewHistoryButton: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.primary,
        marginTop: 4,
    },
    viewHistoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
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
    breakCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#F39C12',
        ...shadows.small,
    },
    breakHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    breakTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        flex: 1,
    },
    breakUsed: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F39C12',
    },
    breakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 8,
        backgroundColor: Colors.background,
        borderRadius: 8,
        marginBottom: 4,
    },
    breakRowLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
        width: 55,
    },
    breakRowTime: {
        fontSize: 12,
        color: Colors.text,
        flex: 1,
    },
    breakRowDur: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F39C12',
    },
    breakButtons: {
        marginTop: 10,
    },
    breakBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    breakBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
});
