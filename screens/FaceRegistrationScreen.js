import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import Colors, { gradients, shadows } from '../constants/Colors';

import { CameraView, useCameraPermissions } from 'expo-camera';
import {
    faceDetectorSettings,
    verifyLivenessGesture,
    processFaceForRegistration,
    isNativeDetectorAvailable
} from '../utils/faceRecognition';
import { faceApiService } from '../services/faceApiService';

export default function FaceRegistrationScreen({ navigation }) {
    const { user, updateFaceEmbedding } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Instructions, 2: Camera, 3: Success
    const [currentGesture, setCurrentGesture] = useState('look_straight');
    const [capturedImages, setCapturedImages] = useState([]);
    const [faceData, setFaceData] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const cameraRef = React.useRef(null);
    const hasNativeDetector = isNativeDetectorAvailable();

    const gestures = [
        { key: 'look_straight', label: 'Look Straight', icon: 'person' },
        { key: 'smile', label: 'Smile Please!', icon: 'happy' },
        { key: 'blink', label: 'Blink Your Eyes', icon: 'eye-off' }
    ];

    const currentGestureIndex = gestures.findIndex(g => g.key === currentGesture);

    const handleManualCapture = async () => {
        if (!cameraRef.current || loading) return;
        setLoading(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: true,
            });

            const newCapturedImages = [...capturedImages, { gesture: currentGesture, uri: photo.uri, base64: photo.base64 }];
            setCapturedImages(newCapturedImages);

            if (currentGestureIndex < gestures.length - 1) {
                setCurrentGesture(gestures[currentGestureIndex + 1].key);
                setLoading(false);
            } else {
                await finalizeRegistration(newCapturedImages);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to capture photo');
            setLoading(false);
        }
    };

    const handleFacesDetected = ({ faces }) => {
        if (!hasNativeDetector) return;

        if (faces.length === 0) {
            setFaceData(null);
            setErrorMessage('No face detected');
            return;
        }

        if (faces.length > 1) {
            setFaceData(null);
            setErrorMessage('Multiple faces detected');
            return;
        }

        const face = faces[0];
        setFaceData(face);
        setErrorMessage(null);

        // Verify the current gesture
        const result = verifyLivenessGesture(face, currentGesture);
        if (result.success) {
            captureStep(face);
        }
    };

    const captureStep = async (face) => {
        if (loading) return;

        try {
            // Give 500ms for user to hold position
            setLoading(true);

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: true,
            });

            const newCapturedImages = [...capturedImages, { gesture: currentGesture, uri: photo.uri, base64: photo.base64 }];
            setCapturedImages(newCapturedImages);

            if (currentGestureIndex < gestures.length - 1) {
                // Move to next gesture
                setTimeout(() => {
                    setCurrentGesture(gestures[currentGestureIndex + 1].key);
                    setLoading(false);
                }, 1000);
            } else {
                // All steps completed, process the main image (usually the straight one)
                await finalizeRegistration(newCapturedImages);
            }
        } catch (error) {
            console.error('Capture error:', error);
            setLoading(false);
        }
    };

    const finalizeRegistration = async (images) => {
        try {
            setLoading(true);
            const straightImage = images.find(img => img.gesture === 'look_straight');

            const apiResult = await faceApiService.registerFace(
                user.uid,
                user.companyId,
                straightImage.base64
            );

            if (!apiResult.success) {
                Alert.alert('Registration Failed', apiResult.error || 'Could not register face. Please try again.');
                handleReset();
                return;
            }

            // faceRegistered is true only when the backend stored a real embedding.
            // When simulated, we still mark it so the UI flow works, but the record
            // carries faceVerified: false on each attendance scan until the backend is live.
            await updateFaceEmbedding('registered');
            setStep(3);
            setTimeout(() => navigation.goBack(), 2000);
        } catch (error) {
            console.error('Finalize error:', error);
            Alert.alert('Error', 'Failed to save face registration. Please try again.');
            handleReset();
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setCurrentGesture('look_straight');
        setCapturedImages([]);
        setLoading(false);
    };

    // Step 1: Instructions
    if (step === 1) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={gradients.warning} style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.textInverse} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Register Face</Text>
                    <Text style={styles.headerSubtitle}>Follow the prompts to capture your face</Text>
                </LinearGradient>

                <View style={[styles.content, { justifyContent: 'flex-start', paddingTop: 40 }]}>
                    <View style={styles.instructionsCard}>
                        <Ionicons name="scan-circle" size={80} color={Colors.warning} />
                        <Text style={styles.instructionsTitle}>Liveness Setup</Text>
                        <Text style={styles.instructionsText}>
                            We will capture 3 quick poses to ensure your security:
                        </Text>

                        <View style={styles.gestureSteps}>
                            {gestures.map((g, i) => (
                                <View key={g.key} style={styles.gestureStepItem}>
                                    <View style={[styles.stepNumber, { backgroundColor: Colors.warning }]}>
                                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                                    </View>
                                    <View style={styles.gestureInfo}>
                                        <Text style={styles.gestureLabel}>{g.label}</Text>
                                        <Ionicons name={g.icon} size={20} color={Colors.textSecondary} />
                                    </View>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={async () => {
                                if (!permission || !permission.granted) {
                                    const { granted } = await requestPermission();
                                    if (!granted) return;
                                }
                                setStep(2);
                            }}
                        >
                            <LinearGradient
                                colors={[Colors.warning, Colors.warningDark]}
                                style={styles.startButtonGradient}
                            >
                                <Text style={styles.startButtonText}>Start Registration</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Step 2: Live Camera with Gesture Detection
    if (step === 2) {
        return (
            <View style={styles.container}>
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="front"
                    onFacesDetected={handleFacesDetected}
                    faceDetectorSettings={faceDetectorSettings}
                >
                    <View style={styles.cameraOverlay}>
                        <View style={styles.gestureGuide}>
                            <Text style={styles.gestureGuideTitle}>Step {currentGestureIndex + 1} of 3</Text>
                            <View style={styles.gestureBadge}>
                                <Ionicons name={gestures[currentGestureIndex].icon} size={24} color="#FFF" />
                                <Text style={styles.gestureBadgeText}>{gestures[currentGestureIndex].label}</Text>
                            </View>
                            {!hasNativeDetector && (
                                <View style={[styles.errorBadge, { backgroundColor: Colors.primary }]}>
                                    <Text style={styles.errorText}>Expo Go: Use manual capture</Text>
                                </View>
                            )}
                            {errorMessage && hasNativeDetector && (
                                <View style={styles.errorBadge}>
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.faceCircleContainer}>
                            <View style={[
                                styles.faceCircle,
                                { borderColor: (faceData || !hasNativeDetector) ? Colors.success : 'rgba(255,255,255,0.5)' }
                            ]} />
                            {loading && (
                                <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
                            )}
                            {!hasNativeDetector && !loading && (
                                <TouchableOpacity style={styles.manualCaptureBtn} onPress={handleManualCapture}>
                                    <Ionicons name="camera" size={40} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity style={styles.cancelCapture} onPress={handleReset}>
                            <Ionicons name="close" size={30} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </CameraView>
            </View>
        );
    }

    // Step 3: Success
    if (step === 3) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={gradients.success} style={styles.header}>
                    <Text style={styles.headerTitle}>Success!</Text>
                </LinearGradient>
                <View style={styles.content}>
                    <View style={styles.successCard}>
                        <Ionicons name="checkmark-circle" size={100} color={Colors.success} />
                        <Text style={styles.successTitle}>Face Registered!</Text>
                        <Text style={styles.successText}>
                            Your attendance biometric is set up.{'\n'}
                            Redirecting...
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    instructionsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        ...shadows.medium,
    },
    instructionsTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
    },
    gestureSteps: {
        width: '100%',
        marginBottom: 30,
    },
    gestureStepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: Colors.background,
        padding: 12,
        borderRadius: 16,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    stepNumberText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    gestureInfo: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gestureLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    startButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 10,
    },
    startButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 100,
    },
    gestureGuide: {
        alignItems: 'center',
    },
    gestureGuideTitle: {
        color: '#FFF',
        fontSize: 18,
        opacity: 0.8,
        marginBottom: 16,
    },
    gestureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 12,
    },
    gestureBadgeText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    errorBadge: {
        backgroundColor: 'rgba(231, 76, 60, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 16,
    },
    errorText: {
        color: '#FFF',
        fontWeight: '600',
    },
    faceCircleContainer: {
        width: 300,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceCircle: {
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 4,
        borderStyle: 'dashed',
    },
    loader: {
        position: 'absolute',
    },
    cancelCapture: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    manualCaptureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.medium,
    },
    successCard: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        ...shadows.medium,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginVertical: 16,
    },
    successText: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
});
