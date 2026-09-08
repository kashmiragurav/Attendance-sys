import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { checkTodayAttendance, getAttendanceStats } from '../services/api';
import { logger } from '../utils/logger';

export default function DashboardScreen({ navigation }) {
  const { userData, user, isAdmin, isLoading } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // If loading, don't do anything yet
    if (isLoading) {
      return;
    }

    // If admin, redirect to admin dashboard
    if (isAdmin) {
      console.log('🔄 Admin detected, redirecting to Admin Dashboard...');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Admin' }],
      });
      return;
    }

    // Regular employee - load data
    console.log('👤 Regular employee, loading dashboard data...');
    loadData();
  }, [isAdmin, isLoading, navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      logger.info('Loading dashboard data for user:', user?.uid);
      
      const attendance = await checkTodayAttendance(user.uid);
      const statistics = await getAttendanceStats(user.uid);
      
      setTodayAttendance(attendance);
      setStats(statistics);
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusMessage = () => {
    if (!todayAttendance) {
      return 'Not checked in yet';
    }
    if (todayAttendance.type === 'checkin') {
      return 'You are checked in';
    }
    return 'You are checked out';
  };

  const getStatusColor = () => {
    if (!todayAttendance) {
      return Colors.warning;
    }
    return todayAttendance.type === 'checkin' ? Colors.success : Colors.error;
  };

  const QuickActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.quickButton, { borderTopColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.quickButtonIcon}>{icon}</Text>
      <Text style={styles.quickButtonTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const StatItem = ({ label, value, color }) => (
    <View style={styles.statItem}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.greeting}>Welcome!</Text>
          <Text style={styles.userName}>{userData?.name || 'User'}</Text>
          <Text style={styles.userRole}>
            {isAdmin ? '👨‍💼 Administrator' : '👤 Employee'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusMessage()}</Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={styles.section}>
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Today's Status</Text>
          
          {todayAttendance ? (
            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Check-in Time:</Text>
                <Text style={styles.statusValue}>
                  {todayAttendance.createdAt?.toDate?.().toLocaleTimeString() || 'N/A'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Type:</Text>
                <Text
                  style={[
                    styles.statusValue,
                    {
                      color:
                        todayAttendance.type === 'checkin'
                          ? Colors.success
                          : Colors.error,
                    },
                  ]}
                >
                  {todayAttendance.type === 'checkin' ? 'Check In ✓' : 'Check Out ✗'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, { color: Colors.success }]}>
                  {todayAttendance.status}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noStatusContainer}>
              <Text style={styles.noStatusText}>📍 You haven't marked attendance yet</Text>
              <Text style={styles.noStatusSubtext}>Tap Mark Attendance to scan your face</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionButton
            title="Mark Attendance"
            icon="📷"
            color={Colors.primary}
            onPress={() => navigation.navigate('Scan')}
          />
          <QuickActionButton
            title="Register Face"
            icon="👤"
            color={Colors.info}
            onPress={() => navigation.navigate('RegisterFace')}
          />
          <QuickActionButton
            title="My Records"
            icon="📋"
            color={Colors.success}
            onPress={() => navigation.navigate('AttendanceList')}
          />
          <QuickActionButton
            title="Statistics"
            icon="📊"
            color={Colors.warning}
            onPress={() => navigation.navigate('Stats')}
          />
        </View>
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.statsContainer}>
            <StatItem
              label="Total Records"
              value={stats.total}
              color={Colors.primary}
            />
            <StatItem
              label="This Month"
              value={stats.month}
              color={Colors.success}
            />
            <StatItem
              label="Check-ins"
              value={stats.present}
              color={Colors.checkinGreen}
            />
          </View>
        </View>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Options</Text>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate('Admin')}
          >
            <Text style={styles.adminButtonIcon}>👨‍💼</Text>
            <View style={styles.adminButtonContent}>
              <Text style={styles.adminButtonTitle}>Admin Dashboard</Text>
              <Text style={styles.adminButtonSubtitle}>View all attendance records</Text>
            </View>
            <Text style={styles.adminButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings & Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.accountButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.accountIcon}>⚙️</Text>
          <Text style={styles.accountLabel}>Profile & Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: Colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: Colors.primaryLight,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  userRole: {
    fontSize: 12,
    color: Colors.primaryLight,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  statusDetails: {
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  noStatusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noStatusText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  noStatusSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickButton: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderTopWidth: 4,
  },
  quickButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickButtonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  adminButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  adminButtonContent: {
    flex: 1,
  },
  adminButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  adminButtonSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  adminButtonArrow: {
    fontSize: 20,
    color: Colors.textTertiary,
  },
  accountButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
