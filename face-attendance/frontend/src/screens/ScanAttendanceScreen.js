// src/screens/ScanAttendanceScreen.js
import React, { useRef, useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { auth, db } from '../services/firebase';
import { uploadBase64Image, callMatchFace, saveAttendanceRecord } from '../services/api';
import { collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

export default function ScanAttendanceScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [face, setFace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      const user = auth.currentUser;
      if (user) setUid(user.uid);
      checkLastAttendance(user?.uid);
    })();
  }, []);

  const checkLastAttendance = async (userId) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    const col = collection(db, 'attendance');
    const q = query(col, where('uid', '==', userId), where('date', '==', today), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.docs.length > 0) {
      setLastCheckTime(snap.docs[0].data().type); // 'checkin' or 'checkout'
    }
  };

  const handleFaceDetected = (result) => {
    if (result.faces && result.faces.length > 0) {
      setFace(result.faces[0]);
    } else {
      setFace(null);
    }
  };

  const handleScan = async () => {
    if (!cameraRef.current || !face || !uid) {
      Alert.alert('Error', 'Face not detected or not logged in');
      return;
    }

    try {
      setLoading(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const base64 = photo.base64.split(',').pop();

      // Upload to Firebase Storage
      const imagePath = `attendance/${uid}/scan_${Date.now()}.jpg`;
      const imageUrl = await uploadBase64Image(base64, imagePath);

      // Call Cloud Function to match face
      const matchRes = await callMatchFace(imageUrl);

      if (matchRes.error) {
        Alert.alert('Error', matchRes.error);
      } else if (matchRes.matched) {
        // Mark attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceType = lastCheckTime === 'checkin' ? 'checkout' : 'checkin';

        await saveAttendanceRecord({
          uid,
          name: matchRes.name || 'Unknown',
          date: today,
          time: new Date().toLocaleTimeString(),
          status: 'present',
          type: attendanceType,
          matchedFaceId: matchRes.faceId,
          confidence: matchRes.confidence
        });

        setLastCheckTime(attendanceType);
        Alert.alert('Success', `${attendanceType.toUpperCase()} recorded successfully`);
      } else {
        Alert.alert('No Match', 'Face does not match registered faces');
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.message);
    }
  };

  if (hasPermission === null) return <Text style={styles.text}>Requesting camera permission...</Text>;
  if (!hasPermission) return <Text style={styles.text}>Camera permission denied</Text>;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.front}
        onFacesDetected={handleFaceDetected}
        faceDetectorSettings={{
          mode: FaceDetector.Constants.Mode.fast,
          detectLandmarks: FaceDetector.Constants.Landmarks.all,
          runClassifications: FaceDetector.Constants.Classifications.all,
        }}
      >
        {face && (
          <View style={styles.faceDetected}>
            <Text style={styles.faceText}>✓ Face Detected - Ready to Scan</Text>
          </View>
        )}
      </Camera>
      <View style={styles.statusContainer}>
        <Text>Last check: {lastCheckTime ? lastCheckTime.toUpperCase() : 'None'}</Text>
      </View>
      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Scan for Attendance" onPress={handleScan} color="#FF9500" />
        )}
      </View>
      <Button title="View History" onPress={() => navigation.navigate('AttendanceList')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  faceDetected: { position: 'absolute', bottom: 100, left: 20, backgroundColor: 'rgba(0,255,0,0.7)', padding: 10, borderRadius: 5 },
  faceText: { color: '#fff', fontWeight: 'bold' },
  statusContainer: { padding: 10, backgroundColor: '#e0e0e0', alignItems: 'center' },
  buttonContainer: { padding: 20, backgroundColor: '#f0f0f0' },
  text: { textAlign: 'center', marginTop: 50 }
});
