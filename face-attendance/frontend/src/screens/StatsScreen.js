import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { useAuth } from '../context/AuthContext';
import { getAttendanceStats, getMyAttendance } from '../services/api';

export default function StatsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, [user?.uid]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await getAttendanceStats(user.uid);
      const records = await getMyAttendance(user.uid);
      setStats(statsData);
      setAllRecords(records);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const getMonthlyStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return allRecords.filter((record) => {
      const recordDate = record.createdAt?.toDate?.();
      return (
        recordDate &&
        recordDate.getMonth() === currentMonth &&
        recordDate.getFullYear() === currentYear
      );
    });
  };

  const getAttendancePercentage = () => {
    if (!stats || stats.total === 0) return 0;
    const workingDays = 22; // Approximate working days in a month
    const percentage = (stats.present / workingDays) * 100;
    return Math.min(percentage, 100).toFixed(1);
  };

  const StatCard = ({ title, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const monthlyRecords = getMonthlyStats();
  const attendancePercentage = getAttendancePercentage();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Overview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Records"
            value={stats?.total || 0}
            color={Colors.primary}
          />
          <StatCard
            title="Check-ins"
            value={stats?.present || 0}
            color={Colors.success}
          />
          <StatCard
            title="Check-outs"
            value={stats?.absent || 0}
            color={Colors.error}
          />
          <StatCard
            title="This Month"
            value={stats?.month || 0}
            color={Colors.info}
          />
        </View>
      </View>

      {/* Monthly Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Statistics</Text>
        
        <View style={styles.monthlyCard}>
          <View style={styles.monthlyRow}>
            <View>
              <Text style={styles.monthlyLabel}>Attendance Rate</Text>
              <View style={styles.percentageCircle}>
                <Text style={styles.percentageText}>{attendancePercentage}%</Text>
              </View>
            </View>
            <View style={styles.monthlyStats}>
              <View style={styles.monthlyStatItem}>
                <View
                  style={[styles.colorDot, { backgroundColor: Colors.success }]}
                />
                <Text style={styles.monthlyStatLabel}>Days Present:</Text>
                <Text style={styles.monthlyStatValue}>{monthlyRecords.length}</Text>
              </View>
              <View style={styles.monthlyStatItem}>
                <View
                  style={[styles.colorDot, { backgroundColor: Colors.warning }]}
                />
                <Text style={styles.monthlyStatLabel}>Days Left:</Text>
                <Text style={styles.monthlyStatValue}>
                  {Math.max(0, 22 - monthlyRecords.length)}
                </Text>
              </View>
              <View style={styles.monthlyStatItem}>
                <View style={[styles.colorDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.monthlyStatLabel}>Avg. Duration:</Text>
                <Text style={styles.monthlyStatValue}>8h 30m</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Attendance Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        {allRecords.length > 0 ? (
          <View>
            {allRecords.slice(0, 10).map((record, index) => {
              const date = record.createdAt?.toDate?.();
              const timeStr = date?.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateStr = date?.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <View key={index} style={styles.activityItem}>
                  <View
                    style={[
                      styles.activityDot,
                      {
                        backgroundColor:
                          record.type === 'checkin'
                            ? Colors.success
                            : Colors.error,
                      },
                    ]}
                  />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityType}>
                      {record.type === 'checkin' ? '✓ Check In' : '✗ Check Out'}
                    </Text>
                    <Text style={styles.activityTime}>
                      {dateStr} at {timeStr}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.activityStatus,
                      {
                        color:
                          record.status === 'matched'
                            ? Colors.success
                            : Colors.warning,
                      },
                    ]}
                  >
                    {record.status}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{Strings.noData}</Text>
          </View>
        )}
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Punctuality Score</Text>
          <View style={styles.metricBar}>
            <View
              style={[
                styles.metricProgress,
                {
                  width: `${Math.min(attendancePercentage, 100)}%`,
                  backgroundColor: Colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.metricValue}>
            {attendancePercentage}%
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Monthly Target</Text>
          <View style={styles.metricBar}>
            <View
              style={[
                styles.metricProgress,
                {
                  width: `${(monthlyRecords.length / 22) * 100}%`,
                  backgroundColor: Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.metricValue}>
            {monthlyRecords.length}/22 days
          </Text>
        </View>
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
  section: {
    backgroundColor: Colors.background,
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  monthlyCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    padding: 16,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  percentageCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  monthlyStats: {
    flex: 1,
    marginLeft: 16,
  },
  monthlyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  monthlyStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  monthlyStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  metricRow: {
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  metricBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  metricProgress: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});
