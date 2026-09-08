// src/screens/AttendanceListScreen.js
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { auth } from '../services/firebase';
import { getMyAttendance } from '../services/api';

export default function AttendanceListScreen({ navigation }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUid(user.uid);
      loadAttendance(user.uid);
    }
  }, []);

  const loadAttendance = async (userId) => {
    try {
      const records = await getMyAttendance(userId);
      setAttendance(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.time}>{item.time}</Text>
      <Text style={styles.type}>{item.type?.toUpperCase()}</Text>
      <Text style={styles.status}>{item.status}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Button title="← Back to Scan" onPress={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 50 }} />
      ) : attendance.length === 0 ? (
        <Text style={styles.empty}>No attendance records</Text>
      ) : (
        <FlatList data={attendance} renderItem={renderItem} keyExtractor={(item) => item.id} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  item: { padding: 15, backgroundColor: '#f9f9f9', marginBottom: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  date: { fontSize: 16, fontWeight: '600' },
  time: { fontSize: 14, color: '#666', marginTop: 5 },
  type: { fontSize: 12, color: '#0066cc', marginTop: 5 },
  status: { fontSize: 12, color: '#28a745', fontWeight: '600', marginTop: 5 },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' }
});
