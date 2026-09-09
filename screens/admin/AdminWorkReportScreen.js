import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';

export default function AdminWorkReportScreen({ navigation }) {
    const { user } = useAuth();
    const [reportData, setReportData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadReport();
        });
        return unsubscribe;
    }, [navigation, selectedDate]);

    useEffect(() => {
        loadReport();
    }, [selectedDate]);

    const loadReport = async () => {
        try {
            setLoading(true);

            const [usersSnapshot, attendanceSnapshot] = await Promise.all([
                db.collection('users').where('companyId', '==', user.companyId),
                db.collection('attendance').where('companyId', '==', user.companyId),
            ]);

            const employees = usersSnapshot.docs
                .map(doc => doc.data())
                .filter(u => u.role !== 'admin' && u.role !== 'COMPANY_ADMIN' && u.role !== 'SUPER_ADMIN');

            const year = selectedDate.getFullYear();
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const monthPrefix = `${year}-${month}`;

            const allAttendance = attendanceSnapshot.docs.map(doc => doc.data());

            const data = employees.map(emp => {
                const empRecords = allAttendance.filter(
                    a => a.userId === emp.uid && a.date && a.date.startsWith(monthPrefix)
                );

                const present = empRecords.filter(a => a.status === 'present').length;
                const late = empRecords.filter(a => a.status === 'late').length;
                const halfDay = empRecords.filter(a => a.status === 'half_day').length;
                const absent = empRecords.filter(a => a.status === 'absent').length;
                const paidLeave = empRecords.filter(a => a.status === 'paid_leave').length;
                const totalHours = empRecords.reduce((acc, a) => acc + (a.workHours || 0), 0);

                return {
                    uid: emp.uid,
                    name: emp.name,
                    employeeId: emp.employeeId,
                    department: emp.department || 'General',
                    present,
                    late,
                    halfDay,
                    absent,
                    paidLeave,
                    totalHours: parseFloat(totalHours.toFixed(1)),
                };
            }).sort((a, b) => a.name.localeCompare(b.name));

            setReportData(data);
            setFilteredData(data);
        } catch (error) {
            console.error('Error loading work report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredData(reportData);
        } else {
            const query = text.toLowerCase();
            setFilteredData(reportData.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.employeeId.toLowerCase().includes(query) ||
                item.department.toLowerCase().includes(query)
            ));
        }
    };

    const changeMonth = (offset) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedDate(newDate);
    };

    const totalPresent = reportData.reduce((acc, e) => acc + e.present, 0);
    const totalHours = reportData.reduce((acc, e) => acc + e.totalHours, 0);

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.empInfo}>
                    <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.empId}>{item.employeeId} · {item.department}</Text>
                </View>
                <View style={styles.hoursBox}>
                    <Text style={styles.hoursValue}>{item.totalHours}h</Text>
                    <Text style={styles.hoursLabel}>Total</Text>
                </View>
            </View>
            <View style={styles.statsRow}>
                <StatCell label="Present" value={item.present} color="#2ECC71" />
                <StatCell label="Late" value={item.late} color="#F39C12" />
                <StatCell label="Half Day" value={item.halfDay} color="#9B59B6" />
                <StatCell label="Absent" value={item.absent} color="#E74C3C" />
                <StatCell label="Leave" value={item.paidLeave} color="#3498DB" />
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Work Report</Text>
                <TouchableOpacity onPress={loadReport} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={22} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            {/* Month Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                    <Ionicons name="chevron-back" size={24} color="#4A90E2" />
                </TouchableOpacity>
                <View style={styles.monthInfo}>
                    <Ionicons name="calendar-outline" size={18} color="#4A90E2" />
                    <Text style={styles.monthText}>
                        {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                    <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            {/* Summary Bar */}
            <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{reportData.length}</Text>
                    <Text style={styles.summaryLabel}>Employees</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{totalPresent}</Text>
                    <Text style={styles.summaryLabel}>Total Present</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{totalHours.toFixed(1)}h</Text>
                    <Text style={styles.summaryLabel}>Total Hours</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#95A5A6" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, ID or department..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor="#95A5A6"
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loadingText}>Generating Work Report...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={item => item.uid}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="bar-chart-outline" size={60} color="#BDC3C7" />
                            <Text style={styles.emptyText}>No work report data for this month</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const StatCell = ({ label, value, color }) => (
    <View style={styles.statCell}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    backButton: { padding: 5 },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    refreshButton: { padding: 5 },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        padding: 12,
        borderRadius: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    monthInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    monthText: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
    summaryBar: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { fontSize: 20, fontWeight: '800', color: '#1C1C1E' },
    summaryLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
    summaryDivider: { width: 1, backgroundColor: '#F0F0F0' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        height: 45,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#2C3E50' },
    listContent: { paddingHorizontal: 20, paddingBottom: 30 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    empInfo: { flex: 1, marginRight: 10 },
    empName: { fontSize: 15, fontWeight: '700', color: '#2C3E50' },
    empId: { fontSize: 12, color: '#95A5A6', marginTop: 2 },
    hoursBox: {
        alignItems: 'center',
        backgroundColor: '#EBF5FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    hoursValue: { fontSize: 16, fontWeight: '800', color: '#4A90E2' },
    hoursLabel: { fontSize: 10, color: '#4A90E2', fontWeight: '600' },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 16, fontWeight: '800' },
    statLabel: { fontSize: 10, color: '#95A5A6', marginTop: 2 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#7F8C8D' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 10, color: '#BDC3C7', fontSize: 14 },
});
