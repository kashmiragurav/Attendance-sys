import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  TabBarIOSItem,
} from 'react-native';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Colors } from '../constants/colors';
import { logger } from '../utils/logger';

export default function AdminDashboard({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' or 'attendance'
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      logger.info('Loading admin data...');

      // Fetch all employees
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const employeesList = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.role === 'user');

      setEmployees(employeesList);
      logger.info('Loaded employees:', employeesList.length);

      // Fetch all attendance records
      const attendanceRef = collection(db, 'attendance');
      const attendanceSnapshot = await getDocs(query(attendanceRef, orderBy('createdAt', 'desc')));
      const attendanceList = attendanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      }));

      setAttendance(attendanceList);
      logger.info('Loaded attendance records:', attendanceList.length);
    } catch (err) {
      logger.error('Error loading admin data:', err.message);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(filter.toLowerCase()) ||
      emp.email?.toLowerCase().includes(filter.toLowerCase()) ||
      emp.department?.toLowerCase().includes(filter.toLowerCase())
  );

  // Filter attendance
  const filteredAttendance = selectedEmployee
    ? attendance.filter((att) => att.uid === selectedEmployee.id)
    : attendance.filter(
        (att) =>
          att.name?.toLowerCase().includes(filter.toLowerCase()) ||
          att.email?.toLowerCase().includes(filter.toLowerCase())
      );

  const renderEmployeeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.employeeCard}
      onPress={() => {
        // Navigate to detailed employee profile screen
        navigation.navigate('EmployeeProfile', { employeeId: item.id });
      }}
    >
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name || 'N/A'}</Text>
          <Text style={styles.employeeEmail}>{item.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{item.role?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Department</Text>
          <Text style={styles.detailValue}>{item.department || 'N/A'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{item.phone || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.employeeFooter}>
        <Text style={styles.joinDate}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.viewAttendance}>View Profile →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAttendanceItem = ({ item }) => (
    <View style={styles.attendanceCard}>
      <View style={styles.attendanceHeader}>
        <Text style={styles.attendanceName}>{item.name || 'Unknown Employee'}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.type === 'checkin' ? '#4CAF50' : '#2196F3',
            },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {item.type === 'checkin' ? 'CHECK IN' : 'CHECK OUT'}
          </Text>
        </View>
      </View>

      <View style={styles.attendanceDetails}>
        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Email:</Text>
          <Text style={styles.attendanceValue}>{item.email || 'N/A'}</Text>
        </View>
        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Date & Time:</Text>
          <Text style={styles.attendanceValue}>
            {item.createdAt.toLocaleString()}
          </Text>
        </View>
        {item.faceMatch && (
          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceLabel}>Face Match:</Text>
            <Text style={[styles.attendanceValue, { color: '#4CAF50' }]}>
              {(item.faceMatch * 100).toFixed(2)}% Match
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const getAttendanceStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = attendance.filter((att) => {
      const attDate = new Date(att.createdAt);
      attDate.setHours(0, 0, 0, 0);
      return attDate.getTime() === today.getTime();
    });

    const checkins = todayAttendance.filter((att) => att.type === 'checkin');
    const uniqueEmployees = new Set(todayAttendance.map((att) => att.uid));

    return {
      total: employees.length,
      present: uniqueEmployees.size,
      absent: employees.length - uniqueEmployees.size,
      totalRecords: attendance.length,
      todayRecords: todayAttendance.length,
    };
  };

  const stats = getAttendanceStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading admin data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContainer}
      >
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Employees</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.statValue}>{stats.present}</Text>
          <Text style={styles.statLabel}>Present Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F44336' }]}>
          <Text style={styles.statValue}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absent Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.statValue}>{stats.totalRecords}</Text>
          <Text style={styles.statLabel}>Total Records</Text>
        </View>
      </ScrollView>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.activeTab]}
          onPress={() => {
            setActiveTab('employees');
            setSelectedEmployee(null);
            setFilter('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'employees' && styles.activeTabText]}>
            👥 Employees ({employees.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>
            📋 Attendance ({attendance.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder={activeTab === 'employees' ? 'Search employees...' : 'Search attendance...'}
        value={filter}
        onChangeText={setFilter}
        placeholderTextColor={Colors.textTertiary}
      />

      {/* Selected Employee Info (when viewing attendance) */}
      {selectedEmployee && activeTab === 'attendance' && (
        <View style={styles.selectedEmployeeBox}>
          <View style={styles.selectedEmployeeContent}>
            <Text style={styles.selectedEmployeeTitle}>📌 {selectedEmployee.name}</Text>
            <Text style={styles.selectedEmployeeEmail}>{selectedEmployee.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedEmployee(null);
              setFilter('');
            }}
          >
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {activeTab === 'employees' ? (
        filteredEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : filteredAttendance.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {selectedEmployee ? 'No attendance records for this employee' : 'No attendance records found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAttendance}
          renderItem={renderAttendanceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsScroll: {
    paddingHorizontal: 16,
  },
  statsContainer: {
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: 4,
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.text,
    fontSize: 14,
  },
  selectedEmployeeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight + '20',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    borderRadius: 8,
  },
  selectedEmployeeContent: {
    flex: 1,
  },
  selectedEmployeeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectedEmployeeEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    fontSize: 20,
    color: Colors.primary,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  // Employee Card Styles
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  employeeEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  employeeDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    color: Colors.text,
    marginTop: 2,
    fontWeight: '500',
  },
  employeeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  joinDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  viewAttendance: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  // Attendance Card Styles
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  attendanceDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  attendanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  attendanceValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
});
