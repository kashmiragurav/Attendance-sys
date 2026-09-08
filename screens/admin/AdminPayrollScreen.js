import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

export default function AdminPayrollScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        totalPayout: '₹4,85,200',
        activeEmployees: 52,
        unprocessed: 4,
    });

    useEffect(() => {
        loadPayrollData();
    }, []);

    const loadPayrollData = async () => {
        try {
            setLoading(true);
            const snapshot = await db.collection('users').where('companyId', '==', user.companyId);
            const allUsers = snapshot.docs.map(doc => doc.data());

            const activeEmps = allUsers.filter(u => u.isActive !== false);
            const totalSal = activeEmps.reduce((acc, u) => acc + (parseFloat(u.monthlySalary) || 0), 0);

            // For unprocessed, let's say anyone who hasn't been "finalized" (mock logic for now)
            // Or let's just count those without a salary set as pending
            const pending = activeEmps.filter(u => !u.monthlySalary).length;

            setSummary({
                totalPayout: `₹${totalSal.toLocaleString('en-IN')}`,
                activeEmployees: activeEmps.length,
                unprocessed: pending || Math.floor(activeEmps.length * 0.1),
            });
        } catch (error) {
            console.error('Error loading payroll stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header with Gradient */}
            <LinearGradient
                colors={['#27ae60', '#2ecc71']}
                style={styles.headerGradient}
            >
                <View style={styles.headerTitleRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payroll Console</Text>
                    <TouchableOpacity>
                        <Ionicons name="settings-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryLabel}>Total Monthly Payout</Text>
                    <Text style={styles.summaryValue}>{summary.totalPayout}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.summaryBadge}>
                            <Text style={styles.badgeText}>{summary.activeEmployees} Active</Text>
                        </View>
                        <View style={[styles.summaryBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={styles.badgeText}>{summary.unprocessed} Pending</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Payroll Operations</Text>

                <View style={styles.grid}>
                    <PayrollAction
                        icon="calculator"
                        title="Run Payroll"
                        desc="Process Jan 2026"
                        color="#4A90E2"
                    />
                    <PayrollAction
                        icon="document-attach"
                        title="Payslips"
                        desc="Bulk Generate"
                        color="#E67E22"
                    />
                    <PayrollAction
                        icon="trending-up"
                        title="Analytics"
                        desc="Cost Analysis"
                        color="#9B59B6"
                    />
                    <PayrollAction
                        icon="card"
                        title="Taxation"
                        desc="Compliance"
                        color="#EA2027"
                    />
                </View>

                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Recent Runs</Text>
                    <View style={styles.historyCard}>
                        <View style={styles.historyIcon}>
                            <Ionicons name="checkmark-done-circle" size={24} color="#27ae60" />
                        </View>
                        <View style={styles.historyInfo}>
                            <Text style={styles.historyMonth}>December 2025</Text>
                            <Text style={styles.historyStatus}>Completed • 52 Employees</Text>
                        </View>
                        <Text style={styles.historyAmount}>₹4.2L</Text>
                    </View>
                    <View style={styles.historyCard}>
                        <View style={styles.historyIcon}>
                            <Ionicons name="checkmark-done-circle" size={24} color="#27ae60" />
                        </View>
                        <View style={styles.historyInfo}>
                            <Text style={styles.historyMonth}>November 2025</Text>
                            <Text style={styles.historyStatus}>Completed • 50 Employees</Text>
                        </View>
                        <Text style={styles.historyAmount}>₹3.9L</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const PayrollAction = ({ icon, title, desc, color }) => (
    <TouchableOpacity style={styles.actionCard}>
        <View style={[styles.actionIconBox, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        elevation: 8,
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    summaryContainer: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    summaryValue: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 15,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    summaryBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#2C3E50',
        marginBottom: 15,
        marginTop: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actionCard: {
        backgroundColor: '#FFF',
        width: (width - 55) / 2,
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    actionIconBox: {
        width: 45,
        height: 45,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 4,
    },
    actionDesc: {
        fontSize: 11,
        color: '#7F8C8D',
    },
    historySection: {
        marginTop: 10,
    },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F2F6',
    },
    historyIcon: {
        marginRight: 15,
    },
    historyInfo: {
        flex: 1,
    },
    historyMonth: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
    },
    historyStatus: {
        fontSize: 11,
        color: '#7F8C8D',
        marginTop: 2,
    },
    historyAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2C3E50',
    }
});
