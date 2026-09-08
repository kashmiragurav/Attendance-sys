import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { getEmployeeProfile, getEmployeeAttendanceRecords } from '../services/api';
import { Colors } from '../constants/colors';
import { logger } from '../utils/logger';

export default function EmployeeProfileScreen({ route, navigation }) {
  const { employeeId } = route.params || {};
  
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'attendance'

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    } else {
      Alert.alert('Error', 'Employee ID not provided');
      navigation.goBack();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      logger.info('Loading employee profile:', employeeId);

      // Fetch employee profile
      const empData = await getEmployeeProfile(employeeId);
      if (!empData) {
        Alert.alert('Error', 'Employee not found');
        navigation.goBack();
        return;
      }
      setEmployee(empData);

      // Fetch attendance records
      const records = await getEmployeeAttendanceRecords(employeeId, 30);
      setAttendance(records);

      logger.info('Employee data loaded successfully');
    } catch (err) {
      logger.error('Error loading employee data:', err.message);
      Alert.alert('Error', 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!attendance || attendance.length === 0) {
      return { present: 0, absent: 0, late: 0 };
    }

    const stats = {
      present: attendance.filter((r) => r.status === 'present').length,
      absent: attendance.filter((r) => r.status === 'absent').length,
      late: attendance.filter((r) => r.status === 'late').length,
    };
    return stats;
  };

  const renderProfileTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {employee?.profilePhoto ? (
          <Image
            source={{ uri: employee.profilePhoto }}
            style={styles.profileImage}
          />
        ) : (
          <View style={[styles.profileImage, styles.noImage]}>
            <Text style={styles.noImageText}>📷</Text>
          </View>
        )}
        <Text style={styles.employeeName}>{employee?.name || 'N/A'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{employee?.role?.toUpperCase() || 'USER'}</Text>
        </View>
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Basic Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{employee?.email || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>UID:</Text>
          <Text style={styles.infoValue}>{employee?.uid || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Department:</Text>
          <Text style={styles.infoValue}>{employee?.department || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[
            styles.infoValue,
            { color: employee?.isActive ? '#28a745' : '#dc3545' }
          ]}>
            {employee?.isActive ? '✅ Active' : '❌ Inactive'}
          </Text>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 Contact Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{employee?.phone || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue}>{employee?.address || 'N/A'}</Text>
        </View>
      </View>

      {/* Employment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💼 Employment Details</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Position:</Text>
          <Text style={styles.infoValue}>{employee?.position || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Manager:</Text>
          <Text style={styles.infoValue}>{employee?.manager || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Join Date:</Text>
          <Text style={styles.infoValue}>
            {employee?.joinDate 
              ? new Date(employee.joinDate).toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Attendance Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Recent Stats (Last 30 Days)</Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: '#28a745' }]}>
            <Text style={styles.statValue}>{calculateStats().present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#ffc107' }]}>
            <Text style={styles.statValue}>{calculateStats().late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#dc3545' }]}>
            <Text style={styles.statValue}>{calculateStats().absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderAttendanceTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>📅 Attendance Records (Last 30 Days)</Text>
      {attendance.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No attendance records found</Text>
        </View>
      ) : (
        <FlatList
          data={attendance}
          renderItem={({ item }) => (
            <View style={styles.attendanceCard}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.attendanceDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === 'present'
                        ? '#d4edda'
                        : item.status === 'late'
                        ? '#fff3cd'
                        : '#f8d7da',
                  },
                ]}>
                  <Text style={[
                    styles.statusText,
                    {
                      color:
                        item.status === 'present'
                          ? '#155724'
                          : item.status === 'late'
                          ? '#856404'
                          : '#721c24',
                    },
                  ]}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.attendanceDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : 'N/A'}
                  </Text>
                </View>

                {item.type && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{item.type.toUpperCase()}</Text>
                  </View>
                )}

                {item.location && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>{item.location}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading employee data...</Text>
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load employee</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backIcon}
        >
          <Text style={styles.backIconText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabButtons}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'profile' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'profile' && styles.tabButtonTextActive,
          ]}>
            👤 Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'attendance' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'attendance' && styles.tabButtonTextActive,
          ]}>
            📅 Attendance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'profile' ? renderProfileTab() : renderAttendanceTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background || '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary || '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background || '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: Colors.primary || '#0066cc',
    paddingTop: 45,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  backIcon: {
    width: 50,
  },
  backIconText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  tabButtons: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary || '#0066cc',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary || '#666',
  },
  tabButtonTextActive: {
    color: Colors.primary || '#0066cc',
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    backgroundColor: '#e0e0e0',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noImageText: {
    fontSize: 40,
  },
  employeeName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary || '#000',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: Colors.primary || '#0066cc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary || '#000',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary || '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary || '#000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary || '#000',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary || '#666',
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary || '#666',
    fontStyle: 'italic',
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  attendanceDate: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary || '#000',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  attendanceDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary || '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: Colors.textPrimary || '#000',
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: Colors.primary || '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
