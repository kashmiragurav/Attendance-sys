import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { FeatureGate } from '../../components/FeatureGate';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';

export default function AdminDashboardScreen({ navigation }) {
    const { user, company, logout, isFeatureEnabled, FEATURES, getUserLimit } = useAuth();
    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        pendingRequests: 0,
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadDashboardData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Fetch employees of THIS company only
            const usersSnapshot = await db.collection('users')
                .where('companyId', '==', user.companyId);

            const allUsers = usersSnapshot.docs.map(doc => doc.data());
            const employeeUsers = allUsers.filter(u => u.role !== 'admin' && u.role !== 'COMPANY_ADMIN');
            const totalEmployees = employeeUsers.length;

            // 2. Fetch today's attendance for THIS company only
            const today = new Date().toISOString().split('T')[0];
            const attendanceSnapshot = await db.collection('attendance')
                .where('companyId', '==', user.companyId);
            const allAttendance = attendanceSnapshot.docs.map(doc => doc.data());

            let present = 0, late = 0;
            allAttendance.forEach(record => {
                if (record.date === today) {
                    if (record.status === 'present') present++;
                    else if (record.status === 'late' || record.status === 'half_day') late++;
                }
            });

            // 3. Process Recent Activities (Users + Attendance)
            const sortedUsers = [...employeeUsers].sort((a, b) =>
                new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            ).slice(0, 3);

            const sortedAttendance = [...allAttendance].sort((a, b) =>
                new Date(b.checkIn || 0) - new Date(a.checkIn || 0)
            ).slice(0, 3);

            const activities = [];
            sortedUsers.forEach(u => activities.push({
                type: 'registration',
                text: `New employee '${u.name}' registered`,
                time: formatDateToRelative(u.createdAt),
                timestamp: new Date(u.createdAt || 0).getTime()
            }));

            sortedAttendance.forEach(a => activities.push({
                type: 'attendance',
                text: `'${a.employeeName}' marked attendance`,
                time: formatDateToRelative(a.checkIn),
                timestamp: new Date(a.checkIn || 0).getTime()
            }));

            const mergedActivities = activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

            const isSunday = new Date().getDay() === 0;
            const absentCount = isSunday ? 0 : Math.max(0, totalEmployees - present - late);
            const weeklyOffCount = isSunday ? Math.max(0, totalEmployees - present - late) : 0;

            setStats({
                totalEmployees,
                presentToday: present,
                absentToday: absentCount,
                weeklyOffToday: weeklyOffCount,
                lateToday: late,
                pendingRequests: 0,
            });
            setRecentActivities(mergedActivities);

        } catch (error) {
            console.error('Error loading admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateToRelative = (dateString) => {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hrs ago`;
        return date.toLocaleDateString();
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
        setRefreshing(false);
    };

    const handleLogout = () => {
        Alert.alert(
            'Confirm Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Logout',
                    style: 'destructive',
                    onPress: async () => { await logout(); }
                }
            ]
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Syncing Enterprise Data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={{ flex: 1, marginRight: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.headerTitle} numberOfLines={1}>{user?.companyName || 'Admin Dashboard'}</Text>
                            <View style={styles.planBadgeMini}>
                                <Text style={styles.planBadgeTextMini}>{(user?.role === 'SUPER_ADMIN' ? 'GOD' : (company?.plan || user?.plan || 'Basic')).toUpperCase()}</Text>
                            </View>
                        </View>
                        <Text style={styles.headerSubtitle}>{user?.branchName ? `Branch: ${user.branchName}` : 'Company Administration'}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#6C6C70" />
                    </TouchableOpacity>
                </View>

                {/* Main Stats Card */}
                <View style={styles.statsRow}>
                    <View style={styles.mainStatCard}>
                        <View style={styles.statIconCircle}>
                            <Ionicons name="people" size={24} color="#4A90E2" />
                        </View>
                        <Text style={styles.mainStatValue}>{stats.totalEmployees}</Text>
                        <Text style={styles.mainStatLabel}>All Employee</Text>
                    </View>
                    <View style={styles.miniStatsCol}>
                        <View style={[styles.miniStatCard, { backgroundColor: '#F0FFF4' }]}>
                            <View style={[styles.dot, { backgroundColor: '#2ECC71' }]} />
                            <View>
                                <Text style={[styles.miniStatValue, { color: '#27AE60' }]}>{stats.presentToday}</Text>
                                <Text style={[styles.miniStatLabel, { color: '#27AE60' }]}>Present</Text>
                            </View>
                        </View>
                        <View style={[styles.miniStatCard, { backgroundColor: '#FFF5F5' }]}>
                            <View style={[styles.dot, { backgroundColor: '#E74C3C' }]} />
                            <View>
                                <Text style={[styles.miniStatValue, { color: '#C0392B' }]}>
                                    {new Date().getDay() === 0 ? stats.weeklyOffToday : stats.absentToday}
                                </Text>
                                <Text style={[styles.miniStatLabel, { color: '#C0392B' }]}>
                                    {new Date().getDay() === 0 ? 'Off Day' : 'Absent'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* SaaS Plan Progress (Not for Enterprise) */}
                {user?.plan !== 'Enterprise' && user?.role !== 'SUPER_ADMIN' && (
                    <View style={styles.limitCard}>
                        <View style={styles.limitHeader}>
                            <Text style={styles.limitTitle}>Personnel Capacity</Text>
                            <Text style={styles.limitValue}>{stats.totalEmployees} / {getUserLimit()}</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.min(100, (stats.totalEmployees / getUserLimit()) * 100)}%`,
                                        backgroundColor: (stats.totalEmployees / getUserLimit()) > 0.8 ? '#E74C3C' : '#4A90E2'
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.limitFooter}>
                            {(stats.totalEmployees / getUserLimit()) > 0.8 ? 'Capacity nearly full. Upgrade for more seats.' : 'Plan limit status'}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a2a6c" />}
            >
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Dashboard Hub</Text>
                    <Text style={styles.sectionDate}>{new Date().toDateString()}</Text>
                </View>

                <View style={styles.grid}>
                    <ActionButton
                        icon="people"
                        title="Employee List"
                        color="#4A90E2"
                        onPress={() => navigation.navigate('AdminEmployees')}
                    />
                    <ActionButton
                        icon="calendar"
                        title="Daily Report"
                        color="#00B894"
                        onPress={() => navigation.navigate('AdminAttendance')}
                    />
                    <ActionButton
                        icon="map"
                        title="Location Map"
                        color="#9B59B6"
                        onPress={() => navigation.navigate('AdminLocationMap')}
                    />
                    <ActionButton
                        icon="bar-chart-outline"
                        title="Work Report"
                        color="#e17055"
                        onPress={() => navigation.navigate('AdminWorkReport')}
                    />
                    <FeatureGate feature={FEATURES.ADVANCED_REPORTS}>
                        <ActionButton
                            icon="document-text-outline"
                            title="Advanced Reports"
                            color="#6C5CE7"
                            onPress={() => navigation.navigate('AdminAdvancedSearch')}
                        />
                    </FeatureGate>
                    <FeatureGate feature={FEATURES.AUDIT_LOGS}>
                        <ActionButton
                            icon="shield-checkmark-outline"
                            title="Security Logs"
                            color="#636e72"
                            onPress={() => navigation.navigate('AdminLogs')}
                        />
                    </FeatureGate>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activities</Text>
                </View>
                <View style={styles.activityList}>
                    {recentActivities.length > 0 ? (
                        recentActivities.map((act, index) => (
                            <ActivityItem
                                key={index}
                                text={act.text}
                                time={act.time}
                                type={act.type}
                            />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No recent activities found.</Text>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const ActionButton = ({ icon, title, color, onPress, badge }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={28} color={color} />
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
        {badge > 0 && (
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
            </View>
        )}
    </TouchableOpacity>
);

const ActivityItem = ({ text, time, type }) => (
    <View style={styles.activityItem}>
        <View style={[styles.activityBullet, { backgroundColor: type === 'registration' ? '#4A90E2' : '#00B894' }]} />
        <View style={{ flex: 1 }}>
            <Text style={styles.activityText}>{text}</Text>
            <Text style={styles.activityTime}>{time}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9FB',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.03,
        shadowRadius: 20,
        elevation: 5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: 2,
    },
    logoutBtn: {
        padding: 10,
        backgroundColor: '#F2F2F7',
        borderRadius: 14,
        alignSelf: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        height: 120,
    },
    mainStatCard: {
        backgroundColor: '#F2F2F7',
        borderRadius: 22,
        padding: 15,
        width: '48%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    mainStatValue: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    mainStatLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    miniStatsCol: {
        width: '48%',
        justifyContent: 'space-between',
        gap: 10,
    },
    miniStatCard: {
        backgroundColor: '#F2F2F7',
        borderRadius: 18,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    miniStatLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '700',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    sectionDate: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    iconBox: {
        width: 55,
        height: 55,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    activityList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 20,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    activityItem: {
        flexDirection: 'row',
        marginBottom: 18,
        alignItems: 'center',
    },
    activityBullet: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 15,
    },
    activityText: {
        fontSize: 14,
        color: '#1C1C1E',
        fontWeight: '500',
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 15,
        color: '#8E8E93',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    emptyText: {
        textAlign: 'center',
        color: '#8E8E93',
        fontStyle: 'italic',
        paddingVertical: 20,
    },
    planBadgeMini: {
        backgroundColor: '#4A90E220',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#4A90E2',
    },
    planBadgeTextMini: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4A90E2',
    },
    limitCard: {
        marginTop: 20,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    limitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    limitTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        textTransform: 'uppercase',
    },
    limitValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F2F2F7',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    limitFooter: {
        fontSize: 10,
        color: '#8E8E93',
        marginTop: 8,
        fontStyle: 'italic',
    }
});
