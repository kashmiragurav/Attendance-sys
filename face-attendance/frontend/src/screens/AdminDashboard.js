// src/screens/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, Button, TextInput } from 'react-native';
import { getAllAttendance } from '../services/api';
import { auth } from '../services/firebase';

export default function AdminDashboard({ navigation }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    loadAllAttendance();
  }, []);

  const loadAllAttendance = async () => {
    try {
      const records = await getAllAttendance();
      setAttendance(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = attendance.filter((item) => item.name?.toLowerCase().includes(filter.toLowerCase()) || item.uid?.includes(filter));

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.name}>{item.name || 'Unknown'}</Text>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.time}>{item.time}</Text>
      <Text style={[styles.status, { color: item.status === 'present' ? '#28a745' : '#dc3545' }]}>{item.status?.toUpperCase()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <TextInput style={styles.searchInput} placeholder="Search by name or UID" value={filter} onChangeText={setFilter} />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 50 }} />
      ) : filteredData.length === 0 ? (
        <Text style={styles.empty}>No records found</Text>
      ) : (
        <FlatList data={filteredData} renderItem={renderItem} keyExtractor={(item) => item.id} />
      )}
      <Button title="Logout" onPress={() => { auth.signOut(); navigation.navigate('Login'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 15, textAlign: 'center' },
  searchInput: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 6, backgroundColor: '#fff' },
  item: { padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FF9500' },
  name: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 14, color: '#666', marginTop: 5 },
  time: { fontSize: 12, color: '#0066cc', marginTop: 5 },
  status: { fontSize: 13, fontWeight: '600', marginTop: 5 },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' }
});
