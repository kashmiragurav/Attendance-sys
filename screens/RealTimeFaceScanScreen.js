import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Colors from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { faceApiService } from '../services/faceApiService';
import { db } from '../services/firebaseConfig';
import { getDetailedAddress } from '../services/googleMapsService'; // Assuming this import existed
import { calculateAttendanceStatus, formatDate, formatTime } from '../utils/attendance';
import { resolveConfig } from '../utils/attendanceConfig';
import { acquireLocation, validateGeoFence } from '../utils/locationValidator';
import { uploadAttendancePhoto } from '../utils/photoUpload';
import { validateWifi } from '../utils/wifiValidator';
import { faceDetectorSettings, isNativeDetectorAvailable } from '../utils/faceRecognition';
import { attendanceHelpers } from '../services/firebaseConfig';

export default function RealTimeFaceScanScreen({ navigation, route }) {
    const { user, isFeatureEnabled, FEATURES, updateProfile, company } = useAuth();
    const { action, onSuccess, isWFH } = route.params || {};
    const attendanceMode = isWFH ? 'WFH' : 'OFFICE';
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);

    // State
    const [cameraReady, setCameraReady] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
    const [location, setLocation] = useState(null);
    const [officeSettings, setOfficeSettings] = useState(null);

    // Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scanningAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startScanningAnimation();
    }, []);

    const startScanningAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanningAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scanningAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
        getLocation();
        loadOfficeSettings();
    }, [permission]);

    const loadOfficeSettings = async () => {
        try {
            const doc = await db.collection('office_settings').doc('settings_default').get();
            if (doc.exists) {
                setOfficeSettings(resolveConfig(doc.data()));
            } else {
                setOfficeSettings(resolveConfig(null));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    // Auto-start scan when camera is ready
    useEffect(() => {
        if (cameraReady && !processing && livenessStatus === 'waiting') {
            startAutomatedScan();
        }
    }, [cameraReady]);

    const getLocation = async () => {
        const result = await acquireLocation();
        if (!result.ok) {
            // Non-blocking background fetch — errors surface at capture time
            console.log('Location fetch failed:', result.errorCode, result.message);
            return;
        }
        const { coords } = result;

        // Best-effort reverse geocode for display only
        let addressText = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        try {
            let googleResult = { success: false };
            try {
                googleResult = await getDetailedAddress(coords.latitude, coords.longitude);
            } catch { /* ignore */ }

            if (googleResult.success && googleResult.formattedAddress) {
                addressText = googleResult.formattedAddress;
            } else {
                const geocode = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
                if (geocode?.length > 0) {
                    const a = geocode[0];
                    const parts = [a.name, a.street, a.district || a.subregion, a.city, a.region, a.postalCode].filter(Boolean);
                    if (parts.length > 0) addressText = parts.join(', ');
                }
            }
        } catch { /* display fallback already set */ }

        setLocation({ ...coords, address: addressText });
    };

    const hasNativeDetector = isNativeDetectorAvailable();

    const [faceData, setFaceData] = useState(null);
    const [isFaceAligned, setIsFaceAligned] = useState(false);
    const [livenessStatus, setLivenessStatus] = useState('waiting'); // waiting, active, success
    const [errorMessage, setErrorMessage] = useState(null);

    const handleFacesDetected = ({ faces }) => {
        if (processing) return;

        if (faces.length === 0) {
            setFaceData(null);
            setIsFaceAligned(false);
            if (livenessStatus === 'active') setErrorMessage('No face detected');
            return;
        }

        const face = faces[0];
        setFaceData(face);
        setErrorMessage(null);

        // Check for double faces (Security Rule)
        if (faces.length > 1) {
            setIsFaceAligned(false);
            setErrorMessage('Multiple faces detected!');
            return;
        }

        // SIMPLIFIED: If a face is detected, consider it aligned
        const faceWidth = face.bounds.size.width;
        console.log('📏 Face Width:', Math.round(faceWidth));

        // Very lenient check - just need a face of reasonable size
        const MIN_FACE_SIZE = 80;

        if (faceWidth >= MIN_FACE_SIZE) {
            if (!isFaceAligned) {
                console.log('🟢 FACE DETECTED - Border GREEN!');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setIsFaceAligned(true);
            setErrorMessage(null);
        } else {
            setIsFaceAligned(false);
            setErrorMessage('Move closer to the camera');
        }
    };

    const startAutomatedScan = () => {
        setLivenessStatus('active');
    };

    const checkWifi = async () => {
        // WFH employees are not on the office network — skip WiFi restriction
        if (isWFH) return true;
        if (!company?.wifiRestrictionEnabled) return true;

        const allowedNetworks = company.allowedWifis || [];
        const result = await validateWifi(allowedNetworks);

        if (result.failOpen) {
            // OS prevented SSID/BSSID reading — logged, attendance allowed
            console.warn('[checkWifi] Fail-open:', result.code, result.reason);
            return true;
        }

        if (!result.allowed) {
            Alert.alert('WiFi Validation Failed', result.reason, [{ text: 'OK' }]);
            return false;
        }

        return true;
    };

    const handleCapture = async () => {
        if (processing || !cameraReady) return;

        const isWifiValid = await checkWifi();
        if (!isWifiValid) return;

        setProcessing(true);
        setShowCountdown(false);
        let navigatedAway = false;

        try {
            if (!cameraRef.current) {
                Alert.alert('Camera Unavailable', 'The camera is not ready. Please wait a moment and try again.');
                return;
            }

            let photo;
            try {
                photo = await cameraRef.current.takePictureAsync({ quality: 0.1, base64: false });
            } catch (captureError) {
                console.error('Photo capture failed:', captureError);
                Alert.alert('Capture Failed', 'Could not capture a photo. Please ensure the camera is not in use by another app and try again.');
                return;
            }

            if (!photo?.uri) {
                Alert.alert('Capture Failed', 'No image was captured. Please try again.');
                return;
            }

            let manipulatedImage;
            try {
                manipulatedImage = await manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 500 } }],
                    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
                );
            } catch (manipError) {
                console.error('Image processing failed:', manipError);
                Alert.alert('Processing Failed', 'Could not process the captured image. Please try again.');
                return;
            }

            if (!manipulatedImage?.base64) {
                Alert.alert('Processing Failed', 'Image data is invalid. Please try again.');
                return;
            }

            navigatedAway = true; // verifyAndProceed handles its own reset on failure
            await verifyAndProceed(manipulatedImage.uri, manipulatedImage.base64);

        } catch (error) {
            console.error('Unexpected capture error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            if (!navigatedAway) {
                setProcessing(false);
                setLivenessStatus('waiting');
            }
        }
    };

    const verifyAndProceed = async (photoUri, base64) => {
        try {
            // 1. Face verification via backend
            const threshold = officeSettings?.faceThreshold || 0.6;
            let apiResult;
            try {
                apiResult = await faceApiService.verifyFace(user.uid, base64, threshold);
            } catch (apiError) {
                console.error('Face API call failed:', apiError);
                throw new Error('Face verification service is unavailable. Please try again.');
            }

            if (!apiResult.success) {
                throw new Error(apiResult.error || 'Face verification failed. Please try again.');
            }

            if (!apiResult.isMatch) {
                throw new Error('Face does not match the registered profile. Attendance cannot be marked.');
            }

            // Track whether this was a real verification or simulated
            const isSimulated = apiResult.simulated === true;

            // 2. Geo-fencing check — WFH skips geo-fence but GPS is still captured for audit
            if (isFeatureEnabled(FEATURES.GEO_LOCATION) && officeSettings?.geoFencing?.enabled && !isWFH) {
                const coordsToCheck = location || null;
                if (!coordsToCheck) {
                    const recheck = await acquireLocation();
                    if (!recheck.ok) throw new Error(recheck.message);
                    setLocation({ ...recheck.coords });
                    const fenceResult = validateGeoFence(recheck.coords, officeSettings.geoFencing);
                    if (!fenceResult.ok) throw new Error(fenceResult.message);
                } else {
                    const fenceResult = validateGeoFence(coordsToCheck, officeSettings.geoFencing);
                    if (!fenceResult.ok) throw new Error(fenceResult.message);
                }
            }

            // 3. Mark attendance — pass simulation flag so the record is honest
            await markAttendance(base64, isSimulated);

            const matchLabel = isSimulated
                ? 'Photo captured (verification pending backend)'
                : `Match score: ${Math.round((apiResult.matchScore || 0) * 100)}%`;

            Alert.alert(
                'Attendance Marked ✅',
                matchLabel,
                [{ text: 'OK', onPress: () => { navigation.goBack(); if (onSuccess) onSuccess(location); } }]
            );
        } catch (error) {
            console.error('verifyAndProceed error:', error);
            Alert.alert('Verification Failed', error.message || 'An unexpected error occurred. Please try again.');
            setProcessing(false);
            setLivenessStatus('waiting');
        }
    };

    const markAttendance = async (base64Image, isSimulated = false) => {
        try {
            const now = new Date();
            const today = formatDate(now);

            // Always read from Firestore by deterministic doc ID — avoids full scan and cross-tenant leak
            const freshResult = await attendanceHelpers.getTodayAttendanceDoc(user.uid, today);
            const todayRecord = freshResult.success && freshResult.data
                ? { id: freshResult.id, data: () => freshResult.data }
                : null;

            if (action === 'check-in') {
                const attendanceId = todayRecord ? todayRecord.id : `att_${user.uid}_${today}`;
                const existingSessions = todayRecord ? (todayRecord.data().sessions || []) : [];
                const sessionIndex = existingSessions.length; // new session will be appended at this index
                const settings = resolveConfig(officeSettings);
                const status = calculateAttendanceStatus(now, null, settings);

                // Upload photo non-blocking — attendance is saved regardless of upload outcome
                const photoResult = await uploadAttendancePhoto({
                    companyId: user.companyId,
                    userId: user.uid,
                    date: today,
                    sessionIndex,
                    action: 'check-in',
                    base64: base64Image,
                });
                if (!photoResult.ok) console.warn('[Photo] Upload failed:', photoResult.error);

                const newSession = {
                    checkIn: now.toISOString(),
                    checkInTime: formatTime(now),
                    checkOut: null,
                    checkOutTime: null,
                    sessionHours: 0,
                    location: location,
                    checkInPhotoUrl: photoResult.url || null,
                };

                const sessions = [...existingSessions, newSession];

                const attendanceData = {
                    id: attendanceId,
                    userId: user.uid,
                    employeeId: user.employeeId || 'N/A',
                    employeeName: user.name,
                    companyId: user.companyId,
                    date: today,
                    checkIn: now.toISOString(),
                    checkInTime: formatTime(now),
                    checkOut: null,
                    checkOutTime: null,
                    status: status.isLate ? 'late' : 'present',
                    workHours: 0,
                    sessions,
                    isLate: status.isLate,
                    lateMinutes: status.lateMinutes || 0,
                    method: isWFH ? 'wfh_face_scan' : 'face_scan',
                    faceVerified: !isSimulated,
                    attendanceMode,
                    deviceId: await AsyncStorage.getItem('app_device_id') || 'Unknown',
                    location: location,
                    createdAt: todayRecord ? todayRecord.data().createdAt : now.toISOString(),
                    updatedAt: now.toISOString(),
                };

                await attendanceHelpers.writeAttendanceRecord(user.uid, user.companyId, attendanceId, attendanceData);
            } else {
                // Check-out
                if (!todayRecord || !todayRecord.data().checkIn) {
                    throw new Error('Please check-in first');
                }

                const data = todayRecord.data();
                const sessions = Array.isArray(data.sessions) ? [...data.sessions] : [];
                const currentSessionIndex = sessions.findIndex(s => !s.checkOut);

                let updatedSessions;
                if (currentSessionIndex !== -1) {
                    const currentSession = sessions[currentSessionIndex];
                    const sessionHours = (now - new Date(currentSession.checkIn)) / (1000 * 60 * 60);

                    const photoResult = await uploadAttendancePhoto({
                        companyId: user.companyId,
                        userId: user.uid,
                        date: today,
                        sessionIndex: currentSessionIndex,
                        action: 'check-out',
                        base64: base64Image,
                    });
                    if (!photoResult.ok) console.warn('[Photo] Upload failed:', photoResult.error);

                    // Build immutably — never mutate the array from Firestore
                    updatedSessions = sessions.map((s, i) =>
                        i === currentSessionIndex
                            ? {
                                ...s,
                                checkOut: now.toISOString(),
                                checkOutTime: formatTime(now),
                                sessionHours: parseFloat(sessionHours.toFixed(2)),
                                checkoutLocation: location,
                                checkOutPhotoUrl: photoResult.url || null,
                            }
                            : s
                    );
                } else {
                    // No open session — synthesise one from the top-level checkIn
                    const mainCheckInTime = new Date(data.checkIn);
                    const sessionHours = (now - mainCheckInTime) / (1000 * 60 * 60);

                    const photoResult = await uploadAttendancePhoto({
                        companyId: user.companyId,
                        userId: user.uid,
                        date: today,
                        sessionIndex: sessions.length,
                        action: 'check-out',
                        base64: base64Image,
                    });
                    if (!photoResult.ok) console.warn('[Photo] Upload failed:', photoResult.error);

                    updatedSessions = [
                        ...sessions,
                        {
                            checkIn: data.checkIn,
                            checkInTime: data.checkInTime || formatTime(mainCheckInTime),
                            checkOut: now.toISOString(),
                            checkOutTime: formatTime(now),
                            sessionHours: parseFloat(sessionHours.toFixed(2)),
                            location: data.location || null,
                            checkoutLocation: location,
                            checkOutPhotoUrl: photoResult.url || null,
                        },
                    ];
                }

                const totalWorkHours = parseFloat(
                    updatedSessions.reduce((t, s) => t + (s.sessionHours || 0), 0).toFixed(2)
                );
                const firstCheckIn = new Date(updatedSessions[0].checkIn);
                const totalBreakMinutes = (data.breaks || []).filter(b => b.end)
                    .reduce((t, b) => t + (b.durationMinutes || 0), 0);
                const status = calculateAttendanceStatus(firstCheckIn, now, {
                    ...resolveConfig(officeSettings),
                    workHours: totalWorkHours,
                    totalBreakMinutes,
                });

                await attendanceHelpers.writeAttendanceRecord(user.uid, user.companyId, todayRecord.id, {
                    ...data,
                    companyId: user.companyId,
                    checkOut: now.toISOString(),
                    checkOutTime: formatTime(now),
                    sessions: updatedSessions,
                    workHours: totalWorkHours,
                    totalBreakMinutes,
                    status: status.status,
                    checkoutLocation: location,
                    updatedAt: now.toISOString(),
                });
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            throw error;
        }
    };

    if (!permission) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-off-outline" size={64} color="#E74C3C" />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                    Camera permission is required to verify your identity for attendance.
                    Please enable it in your device Settings.
                </Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={async () => {
                        const result = await requestPermission();
                        if (!result.granted) {
                            Alert.alert(
                                'Permission Denied',
                                'Camera access was denied. Please enable it in Settings to use face attendance.',
                                [{ text: 'OK' }]
                            );
                        }
                    }}
                >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.permissionCancelButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.permissionCancelText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Camera as Background */}
            {permission && permission.granted && (
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFillObject}
                    facing="front"
                    onCameraReady={() => setCameraReady(true)}
                    onFacesDetected={handleFacesDetected}
                    faceDetectorSettings={faceDetectorSettings}
                >
                    {/* Perfect Circular Mask Layer */}
                    <View style={styles.maskOverlay} pointerEvents="none">
                        <View style={styles.circleMask}>
                            {/* Scanning Laser Line (Inside Mask) - Always Live when ready */}
                            {(cameraReady || livenessStatus === 'active') && !processing && (
                                <View style={styles.clippingCircle}>
                                    <Animated.View
                                        style={[
                                            styles.scanLine,
                                            {
                                                transform: [{
                                                    translateY: scanningAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [-250, 250] // Range within the 500px hole
                                                    })
                                                }]
                                            }
                                        ]}
                                    />
                                </View>
                            )}
                        </View>
                    </View>

                </CameraView>
            )}

            {/* Top UI */}
            <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                style={styles.topOverlay}
            >
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <Text style={styles.title}>
                    {action === 'check-in' ? 'Punch In' : 'Punch Out'}
                </Text>
                <Text style={styles.subtitle}>
                    {!cameraReady && 'Starting camera...'}
                    {cameraReady && !processing && livenessStatus === 'waiting' && 'Look into the circle'}
                    {livenessStatus === 'active' && !processing && (
                        faceData
                            ? (isFaceAligned ? 'Perfect! Click Punch' : 'Center your face a bit more')
                            : 'Searching for face...'
                    )}
                    {processing && 'Verifying identity...'}
                </Text>

                {errorMessage && (
                    <View style={styles.errorBadge}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                )}
            </LinearGradient>

            {/* Bottom UI */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.bottomOverlay}
            >
                <View style={styles.instructionsContainer}>
                    {livenessStatus === 'waiting' ? (
                        <TouchableOpacity
                            style={[
                                styles.startButton,
                                { backgroundColor: action === 'check-in' ? '#37B46F' : '#E74C3C' }
                            ]}
                            onPress={startAutomatedScan}
                            disabled={processing}
                        >
                            <Text style={styles.startButtonText}>
                                {action === 'check-in' ? 'START PUNCH IN' : 'START PUNCH OUT'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.instructionsContainer}>
                            <View style={styles.livenessBadge}>
                                <Ionicons
                                    name={livenessStatus === 'success' ? "checkmark-circle" : (isFaceAligned ? "person-circle" : "scan-outline")}
                                    size={32}
                                    color={livenessStatus === 'success' ? "#37B46F" : (isFaceAligned ? "#2ECC71" : "#E74C3C")}
                                />
                                <Text style={[styles.instructions, { color: isFaceAligned ? "#FFF" : "#E74C3C" }]}>
                                    {isFaceAligned ? 'FACE ALIGNED' : 'POSITION FACE'}
                                </Text>
                            </View>

                            {!processing && (
                                <TouchableOpacity
                                    style={[
                                        styles.startButton,
                                        {
                                            marginTop: 20,
                                            backgroundColor: action === 'check-in' ? '#37B46F' : '#E74C3C'
                                        }
                                    ]}
                                    onPress={() => {
                                        if (processing) return;
                                        setLivenessStatus('success');
                                        handleCapture();
                                    }}
                                    disabled={processing}
                                >
                                    <Text style={styles.startButtonText}>
                                        {action === 'check-in' ? 'PUNCH IN' : 'PUNCH OUT'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {processing && (
                    <ActivityIndicator size="large" color="#37B46F" style={{ marginTop: 10 }} />
                )}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#FFFFFF',
    },
    errorText: {
        fontSize: 16,
        color: '#E74C3C',
        textAlign: 'center',
        marginTop: 100,
    },
    camera: {
        flex: 1,
    },
    maskOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    circleMask: {
        width: 1500, // Large enough to cover screen
        height: 1500,
        borderRadius: 750,
        borderWidth: 500, // (1500 - 500) / 2 = 500px hole
        borderColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanLine: {
        width: 500, // Match circle size
        height: 6,
        backgroundColor: '#37B46F',
        shadowColor: '#37B46F',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 15,
    },
    clippingCircle: {
        width: 500,
        height: 500,
        borderRadius: 250,
        overflow: 'hidden',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 5,
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    instructionsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: '#37B46F',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        elevation: 5,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    livenessBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 10,
    },
    instructions: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    errorBadge: {
        backgroundColor: '#E74C3C',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 10,
        alignSelf: 'center',
    },
    errorText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    permissionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    permissionButton: {
        backgroundColor: '#37B46F',
        paddingHorizontal: 36,
        paddingVertical: 14,
        borderRadius: 28,
        marginBottom: 12,
    },
    permissionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    permissionCancelButton: {
        paddingHorizontal: 36,
        paddingVertical: 12,
    },
    permissionCancelText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
    },
});
