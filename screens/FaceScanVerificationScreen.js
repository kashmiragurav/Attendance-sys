import React, { useState, useEffect } from 'react';
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
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import Colors, { gradients, shadows } from '../constants/Colors';

export default function FaceScanVerificationScreen({ navigation, route }) {
    const { user } = useAuth();
    const { action, onSuccess } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [location, setLocation] = useState(null);

    useEffect(() => {
        // Auto-launch camera when screen opens
        handleScanFace();
    }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location to mark attendance.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'OK' }
                    ]
                );
                return null;
            }

            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            return {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error('Error getting location:', error);
            return null;
        }
    };

    const handleScanFace = async () => {
        try {
            setScanning(true);

            // Request camera permission
            const { status } = await ImagePicker.requestCameraPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is required for face verification.');
                navigation.goBack();
                return;
            }

            // Get location first
            const userLocation = await getLocation();
            setLocation(userLocation);

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                cameraType: ImagePicker.CameraType.front,
            });

            if (result.canceled) {
                navigation.goBack();
                return;
            }

            setCapturedImage(result.assets[0]);

            // Verify face (simplified - in production, compare embeddings)
            await verifyFace(result.assets[0], userLocation);

        } catch (error) {
            console.error('Error scanning face:', error);
            Alert.alert('Error', 'Failed to scan face. Please try again.');
            navigation.goBack();
        } finally {
            setScanning(false);
        }
    };

    const verifyFace = async (image, userLocation) => {
        try {
            setLoading(true);

            // Simulate face verification
            // In production, you would:
            // 1. Generate embedding from captured image
            // 2. Load stored embedding from Firestore
            // 3. Compare embeddings using cosine similarity
            // 4. Accept if similarity > threshold (e.g., 0.75)

            // For now, simplified verification
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing

            const verified = true; // In production: actual face matching

            if (verified) {
                // Face verified successfully
                const locationText = userLocation
                    ? `Location: ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
                    : 'Location: Not available';

                Alert.alert(
                    'Face Verified! ✅',
                    `Your identity has been confirmed.\n${locationText}`,
                    [
                        {
                            text: 'Continue',
                            onPress: () => {
                                navigation.goBack();
                                // Call the success callback with location data
                                if (onSuccess) {
                                    setTimeout(() => onSuccess(userLocation), 100);
                                }
                            }
                        }
                    ]
                );
            } else {
                // Face verification failed
                Alert.alert(
                    'Verification Failed',
                    'Face does not match. Please try again.',
                    [
                        { text: 'Retry', onPress: handleScanFace },
                        { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' }
                    ]
                );
            }
        } catch (error) {
            console.error('Error verifying face:', error);
            Alert.alert('Error', 'Failed to verify face. Please try again.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

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
                    disabled={loading}
                >
                    <Ionicons name="close" size={24} color={Colors.textInverse} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Face Verification</Text>
                <Text style={styles.headerSubtitle}>
                    {action === 'check-in' ? 'Verify for Check-In' : 'Verify for Check-Out'}
                </Text>
            </LinearGradient>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingTitle}>Verifying Face...</Text>
                        <Text style={styles.loadingText}>
                            Please wait while we verify your identity
                        </Text>

                        {capturedImage && (
                            <Image
                                source={{ uri: capturedImage.uri }}
                                style={styles.verifyingImage}
                            />
                        )}
                    </View>
                ) : scanning ? (
                    <View style={styles.scanningCard}>
                        <Ionicons name="scan" size={80} color={Colors.primary} />
                        <Text style={styles.scanningTitle}>Opening Camera...</Text>
                        <Text style={styles.scanningText}>
                            Position your face in the frame
                        </Text>
                    </View>
                ) : (
                    <View style={styles.instructionsCard}>
                        <Ionicons name="scan-circle" size={80} color={Colors.primary} />
                        <Text style={styles.instructionsTitle}>Face Scan Required</Text>
                        <Text style={styles.instructionsText}>
                            We need to verify your identity before marking attendance.
                        </Text>

                        <View style={styles.guidelinesList}>
                            <GuidelineItem
                                icon="sunny"
                                text="Ensure good lighting"
                                color={Colors.primary}
                            />
                            <GuidelineItem
                                icon="person"
                                text="Look straight at camera"
                                color={Colors.primary}
                            />
                            <GuidelineItem
                                icon="happy"
                                text="Remove glasses/mask"
                                color={Colors.primary}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={handleScanFace}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Colors.primary, Colors.primaryDark]}
                                style={styles.scanButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="camera" size={24} color={Colors.textInverse} />
                                <Text style={styles.scanButtonText}>Scan Face</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const GuidelineItem = ({ icon, text, color }) => (
    <View style={styles.guidelineItem}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.guidelineText}>{text}</Text>
    </View>
);

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
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    loadingCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        ...shadows.medium,
    },
    loadingTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    loadingText: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    verifyingImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginTop: 20,
    },
    scanningCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        ...shadows.medium,
    },
    scanningTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    scanningText: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    instructionsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        ...shadows.medium,
    },
    instructionsTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 20,
        marginBottom: 12,
    },
    instructionsText: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    guidelinesList: {
        width: '100%',
        marginBottom: 30,
    },
    guidelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: Colors.background,
        borderRadius: 12,
        marginBottom: 10,
    },
    guidelineText: {
        fontSize: 15,
        color: Colors.text,
        marginLeft: 12,
        fontWeight: '500',
    },
    scanButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        ...shadows.medium,
    },
    scanButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    scanButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textInverse,
    },
});
