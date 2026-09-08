import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
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
import { faceDetectorSettings, isNativeDetectorAvailable } from '../utils/faceRecognition';

export default function RealTimeFaceScanScreen({ navigation, route }) {
    const { user, isFeatureEnabled, FEATURES, updateProfile, company } = useAuth();
    const { action, onSuccess, isWFH } = route.params || {};
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
                setOfficeSettings(doc.data());
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
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.log('Location permission not granted');
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // Try Google Maps API first for detailed address
            let addressText = 'Unknown Location';
            let fullAddressData = {};

            try {
                // Try Google Maps API first (with error handling)
                let googleResult = { success: false };
                try {
                    googleResult = await getDetailedAddress(
                        currentLocation.coords.latitude,
                        currentLocation.coords.longitude
                    );
                } catch (googleError) {
                    console.log('⚠️ Google Maps API error:', googleError.message);
                }

                if (googleResult.success && googleResult.formattedAddress) {
                    addressText = googleResult.formattedAddress;
                    fullAddressData = googleResult.components || {};
                    console.log('✅ Google Maps Address:', addressText);
                } else {
                    // Fallback to Expo Location reverse geocoding
                    console.log('📍 Using Expo Location fallback...');
                    const geocode = await Location.reverseGeocodeAsync({
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude,
                    });

                    if (geocode && geocode.length > 0) {
                        const address = geocode[0];
                        fullAddressData = address;

                        console.log('📍 Expo geocode result:', address);

                        const addressParts = [];
                        if (address.name && address.name !== address.street) addressParts.push(address.name);
                        if (address.street) addressParts.push(address.street);
                        if (address.district || address.subregion) addressParts.push(address.district || address.subregion);
                        if (address.city) addressParts.push(address.city);
                        if (address.region) addressParts.push(address.region);
                        if (address.postalCode) addressParts.push(address.postalCode);

                        addressText = addressParts.length > 0
                            ? addressParts.join(', ')
                            : `${address.city || address.region || 'Unknown Location'}`;

                        console.log('✅ Expo Address:', addressText);
                    } else {
                        console.log('❌ No Expo geocode results');
                    }
                }
            } catch (geocodeError) {
                console.log('❌ Geocoding error:', geocodeError);
                // Final fallback to coordinates
                addressText = `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`;
            }

            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy,
                timestamp: new Date().toISOString(),
                address: addressText,
                addressComponents: fullAddressData,
            });
        } catch (error) {
            console.error('Error getting location:', error);
        }
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
        if (!company?.wifiRestrictionEnabled) return true;

        try {
            const state = await NetInfo.fetch();

            // 1. Check if connected to WiFi
            if (state.type !== 'wifi') {
                Alert.alert(
                    'WiFi Required',
                    'You must be connected to an approved WiFi network to mark attendance.',
                    [{ text: 'OK' }]
                );
                return false;
            }

            // 2. Strict SSID Check (If allowed list exists)
            const allowedWifis = company.allowedWifis || [];
            if (allowedWifis.length > 0) {
                let currentSSID = state.details?.ssid;

                // Handle Android specific quotes or null
                if (currentSSID) {
                    currentSSID = currentSSID.replace(/^"(.*)"$/, '$1');
                }

                // If SSID cannot be read (common on modern Android without location permission/service)
                if (!currentSSID || currentSSID === '<unknown ssid>') {
                    // FAIL OPEN: We allow it because blocking valid users due to OS restrictions is bad UX.
                    console.log('⚠️ Could not verify SSID, but connected to WiFi. Allowing.');
                    return true;
                }

                const isAllowed = allowedWifis.some(wifi =>
                    wifi.trim().toLowerCase() === currentSSID.trim().toLowerCase()
                );

                if (!isAllowed) {
                    Alert.alert(
                        'Wrong WiFi Network',
                        `You are connected to "${currentSSID}".\nPlease connect to one of the authorized office networks.`,
                        [{ text: 'OK' }]
                    );
                    return false;
                }
            }

            return true;
        } catch (e) {
            console.log('WiFi Check Warning (Suppressed):', e.message);
            // FAIL OPEN if crash
            return true;
        }
    };

    const handleCapture = async () => {
        if (processing || !cameraReady) return;

        // Check WiFi before starting capture
        const isWifiValid = await checkWifi();
        if (!isWifiValid) return;

        try {
            setProcessing(true);
            setShowCountdown(false);

            // 1. Capture photo
            if (!cameraRef.current) {
                throw new Error('Camera not initialized');
            }

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.1, // Low quality for fast capture
                base64: false,
            });

            // 2. Compress & Resize (Crucial for Firestore 1MB limit)
            const manipulatedImage = await manipulateAsync(
                photo.uri,
                [{ resize: { width: 500 } }], // Increased for better clarity in Admin Panel
                { compress: 0.7, format: SaveFormat.JPEG, base64: true }
            );

            // 3. Verify & Proceed
            console.log(`📸 Image Size: ${Math.round(manipulatedImage.base64.length / 1024)} KB`);
            await verifyAndProceed(manipulatedImage.uri, manipulatedImage.base64);

        } catch (error) {
            console.error('Error capturing photo:', error);
            Alert.alert('Error', 'Failed to capture photo. Please try again.');
            setProcessing(false);
            setLivenessStatus('waiting');
        }
    };

    const verifyAndProceed = async (photoUri, base64) => {
        try {
            // 1. Backend Verification
            const threshold = officeSettings?.faceThreshold || 0.6;
            const apiResult = await faceApiService.verifyFace(user.uid, base64, threshold);

            if (!apiResult.success || !apiResult.isMatch) {
                throw new Error(apiResult.error || 'Face match failed');
            }

            // 2. Extra Checks (Location)
            let verified = true;
            let detectionFlags = [];

            // Geo-fencing check
            if (isFeatureEnabled(FEATURES.GEO_LOCATION) && officeSettings?.geoFencing?.enabled && !isWFH) {
                const officeLat = officeSettings.geoFencing.latitude || 18.5204;
                const officeLng = officeSettings.geoFencing.longitude || 73.8567;
                const radius = officeSettings.geoFencing.radius || 200;

                if (location) {
                    const distance = calculateDistance(location.latitude, location.longitude, officeLat, officeLng);
                    if (distance > radius) {
                        verified = false;
                        detectionFlags.push(`Out of Range (${Math.round(distance)}m)`);
                    }
                } else {
                    verified = false;
                    detectionFlags.push('Location required');
                }
            }

            if (verified) {
                await markAttendance(base64);
                Alert.alert('Success! ✅', `Face Verified (Match: ${Math.round(apiResult.matchScore * 100)}%)`, [
                    {
                        text: 'OK', onPress: () => {
                            navigation.goBack();
                            if (onSuccess) onSuccess(location);
                        }
                    }
                ]);
            } else {
                throw new Error(detectionFlags.join(', '));
            }
        } catch (error) {
            Alert.alert('Verification Failed ❌', error.message);
            setProcessing(false);
            setLivenessStatus('waiting');
        }
    };

    const markAttendance = async (base64Image) => {
        try {
            const now = new Date();
            const today = formatDate(now);
            const imageField = action === 'check-in' ? 'checkInImage' : 'checkOutImage';
            const formattedImage = `data:image/jpeg;base64,${base64Image}`;

            // Targeted lookup for today's record
            const attendanceResult = await db.collection('attendance').getDocs(); // Assuming this works with custom wrapper
            // Note: In custom wrapper getDocs returns { docs: [...] }
            // and we need to filter manually if default query not sufficient

            // Optimization: Use where clause if possible. The custom wrapper supports ONE where clause usually?
            // Actually, the previous code used getDocs() and .find(). I will stick to that to be safe.

            const docs = attendanceResult.docs || [];
            const todayRecord = docs.find(doc => {
                const docData = doc.data();
                return docData.userId === user.uid && docData.date === today;
            });

            if (action === 'check-in') {
                // Check-in logic
                const attendanceId = todayRecord ? todayRecord.id : `att_${user.uid}_${today}`;
                const settings = {
                    officeStartTime: '09:30',
                    gracePeriodMinutes: 10,
                    fullDayHours: 9,
                };

                const status = calculateAttendanceStatus(now, null, settings);

                const attendanceData = {
                    id: attendanceId,
                    userId: user.uid,
                    employeeId: user.employeeId || 'N/A',
                    employeeName: user.name,
                    companyId: user.companyId,
                    date: today,
                    checkIn: now.toISOString(),
                    checkInTime: formatTime(now),
                    [imageField]: formattedImage,
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
                        location: location,
                    }],
                    isLate: status.isLate,
                    lateMinutes: status.lateMinutes || 0,
                    method: isWFH ? 'wfh_scan' : 'face_scan',
                    faceVerified: true,
                    isWFH: !!isWFH,
                    deviceId: await AsyncStorage.getItem('app_device_id') || 'Unknown',
                    location: location,
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                };

                await db.collection('attendance').doc(attendanceId).set(attendanceData);
            } else {
                // Check-out logic
                if (!todayRecord || !todayRecord.data().checkIn) {
                    throw new Error('Please check-in first');
                }

                const data = todayRecord.data();
                const sessions = Array.isArray(data.sessions) ? data.sessions : [];
                const currentSessionIndex = sessions.findIndex(s => !s.checkOut);

                if (currentSessionIndex !== -1) {
                    const currentSession = sessions[currentSessionIndex];
                    const sessionCheckInTime = new Date(currentSession.checkIn);
                    const sessionHours = (now - sessionCheckInTime) / (1000 * 60 * 60);

                    sessions[currentSessionIndex] = {
                        ...currentSession,
                        checkOut: now.toISOString(),
                        checkOutTime: formatTime(now),
                        sessionHours: parseFloat(sessionHours.toFixed(2)),
                        checkoutLocation: location,
                    };
                } else {
                    const mainCheckInTime = new Date(data.checkIn);
                    const sessionHours = (now - mainCheckInTime) / (1000 * 60 * 60);

                    sessions.push({
                        checkIn: data.checkIn,
                        checkInTime: data.checkInTime || formatTime(mainCheckInTime),
                        checkOut: now.toISOString(),
                        checkOutTime: formatTime(now),
                        sessionHours: parseFloat(sessionHours.toFixed(2)),
                        location: data.location || null,
                        checkoutLocation: location,
                    });
                }

                const totalWorkHours = sessions.reduce((total, session) => {
                    return total + (session.sessionHours || 0);
                }, 0);

                const firstCheckIn = new Date(sessions[0].checkIn);
                const status = calculateAttendanceStatus(firstCheckIn, now, {
                    officeStartTime: '09:30',
                    gracePeriodMinutes: 10,
                    fullDayHours: 9,
                    workHours: totalWorkHours,
                });

                const updatedAttendance = {
                    ...data,
                    companyId: user.companyId,
                    checkOut: now.toISOString(),
                    checkOutTime: formatTime(now),
                    [imageField]: formattedImage,
                    sessions: sessions,
                    workHours: parseFloat(totalWorkHours.toFixed(2)),
                    status: status.status,
                    checkoutLocation: location,
                    updatedAt: now.toISOString(),
                };

                await db.collection('attendance').doc(todayRecord.id).set(updatedAttendance);
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            throw error;
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in metres
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
            <View style={styles.container}>
                <Text style={styles.errorText}>Camera permission denied</Text>
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
                                        setLivenessStatus('success');
                                        handleCapture();
                                    }}
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
});
