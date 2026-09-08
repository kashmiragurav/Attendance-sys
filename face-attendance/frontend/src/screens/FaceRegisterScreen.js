// src/screens/FaceRegisterScreen.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { auth } from '../services/firebase';
import { uploadBase64Image, saveFaceRecord, callComputeEmbedding } from '../services/api';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { detectBlink, detectHeadMovement } from '../utils/livenessChecks';
import { logger } from '../utils/logger';
import { AppConfig } from '../config/app.config';

const WINDOW_WIDTH = Dimensions.get('window').width;
const WINDOW_HEIGHT = Dimensions.get('window').height;

export default function FaceRegisterScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [face, setFace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState('');
  const [livenessChecked, setLivenessChecked] = useState(false);
  const previousFaceRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      const user = auth.currentUser;
      if (user) setUid(user.uid);
    })();
  }, []);

  const handleFaceDetected = (result) => {
    if (result.faces && result.faces.length > 0) {
      const detectedFace = result.faces[0];
      setFace(detectedFace);

      // Perform liveness checks if enabled
      if (AppConfig.livenessCheck.enabled) {
        if (previousFaceRef.current) {
          // Check for blink
          const blink = detectBlink(previousFaceRef.current, detectedFace);
          if (blink) {
            setLivenessStatus('✓ Blink detected');
            setLivenessChecked(true);
          }

          // Check for head movement
          const movement = detectHeadMovement(previousFaceRef.current, detectedFace);
          if (movement) {
            setLivenessStatus('✓ Head movement detected');
          }
        }
        previousFaceRef.current = detectedFace;
      } else {
        setLivenessChecked(true);
      }
    } else {
      setFace(null);
      setLivenessStatus('');
      setLivenessChecked(false);
    }
  };

  const handleCapture = async () => {
    if (!face || !cameraReady) {
      Alert.alert(Strings.error, Strings.noFaceDetected);
      return;
    }

    if (AppConfig.livenessCheck.enabled && !livenessChecked) {
      Alert.alert(Strings.warning, 'Please perform liveness checks (blink or move head)');
      return;
    }

    try {
      setLoading(true);
      logger.info('Capturing face for registration');

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: AppConfig.storage.imageQuality,
        base64: true,
      });

      logger.info('Photo captured, uploading to storage');

      // Upload to Firebase Storage
      const imageUrl = await uploadBase64Image(
        photo.base64,
        `faces/${uid}/register_${Date.now()}.jpg`
      );

      logger.info('Photo uploaded, computing embedding');

      // Compute embedding via Cloud Function
      const embeddingResult = await callComputeEmbedding(imageUrl, uid);

      if (embeddingResult.error) {
        logger.warn('Cloud Function not available:', embeddingResult.error);
        Alert.alert(Strings.warning, 'Cloud Functions not deployed. Basic registration done. Deploy Cloud Functions for face matching.');
      }

      // Save face record to Firestore
      await saveFaceRecord(uid, imageUrl, embeddingResult.embeddingId || null);

      logger.info('Face registered successfully');
      Alert.alert(Strings.success, Strings.registrationSuccess);
      navigation.goBack();
    } catch (error) {
      logger.error('Face registration error:', error);
      Alert.alert(Strings.error, error.message || Strings.registrationError);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLivenessStatus('');
    setLivenessChecked(false);
    previousFaceRef.current = null;
    setFace(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>📷 {Strings.noCameraPermission}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            Camera.requestCameraPermissionsAsync();
          }}
        >
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Register Your Face</Text>
        <Text style={styles.headerSubtitle}>Position your face in the circle</Text>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={Camera.Constants.Type.front}
          onCameraReady={() => setCameraReady(true)}
          onFacesDetected={handleFaceDetected}
          faceDetectorSettings={{
            mode: FaceDetector.Constants.Mode.fast,
            detectLandmarks: FaceDetector.Constants.Landmarks.all,
            runClassifications: FaceDetector.Constants.Classifications.all,
          }}
        />

        {/* Face Detection Overlay */}
        <View style={styles.faceOverlay}>
          <View
            style={[
              styles.faceBorder,
              face && styles.faceBorderActive,
            ]}
          >
            {face ? (
              <Text style={styles.faceDetectedText}>✓ Face Detected</Text>
            ) : (
              <Text style={styles.faceNotDetectedText}>Position your face</Text>
            )}
          </View>
        </View>

        {/* Liveness Status */}
        {AppConfig.livenessCheck.enabled && (
          <View style={styles.livenessStatus}>
            <Text style={styles.livenessStatusText}>{livenessStatus}</Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Instructions:</Text>
          <Text style={styles.instructionText}>
            • Ensure good lighting{'\n'}
            • Face the camera directly{'\n'}
            • {AppConfig.livenessCheck.enabled ? 'Blink or move your head' : 'Keep face still'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {face ? (
          <>
            <TouchableOpacity
              style={[styles.captureButton, loading && styles.buttonDisabled]}
              onPress={handleCapture}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.textLight} />
              ) : (
                <>
                  <Text style={styles.captureButtonIcon}>📸</Text>
                  <Text style={styles.captureButtonText}>{Strings.capturePhoto}</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              disabled={loading}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.waitingText}>
            <Text style={styles.waitingTextContent}>⏳ Waiting for face...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  faceOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    height: WINDOW_HEIGHT * 0.5,
  },
  faceBorder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  faceBorderActive: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  faceDetectedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
  faceNotDetectedText: {
    fontSize: 14,
    color: Colors.warning,
  },
  livenessStatus: {
    position: 'absolute',
    top: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  livenessStatusText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  instructions: {
    position: 'absolute',
    bottom: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    width: WINDOW_WIDTH - 32,
  },
  instructionTitle: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  instructionText: {
    color: Colors.primaryLight,
    fontSize: 11,
    lineHeight: 16,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  captureButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  captureButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  captureButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  waitingText: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingTextContent: {
    fontSize: 16,
    color: Colors.textTertiary,
  },
});
