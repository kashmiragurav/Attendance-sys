import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
    TextInput,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';

export default function AdminAdvancedSearchScreen({ navigation }) {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Date State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        return unsubscribe;
    }, [navigation, selectedDate]);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            setLoading(true);

            setLoading(true);
            // 1. Fetch all employees of this company
            const usersSnapshot = await db.collection('users')
                .where('companyId', '==', user.companyId);
            const empList = usersSnapshot.docs
                .map(doc => doc.data())
                .filter(u => u.role !== 'admin' && u.role !== 'COMPANY_ADMIN' && u.role !== 'SUPER_ADMIN');

            // 2. Fetch all attendance for the selected month
            // We'll fetch all and filter client side for better UX in this small app
            const year = selectedDate.getFullYear();
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const monthPrefix = `${year}-${month}`;

            const attendanceSnapshot = await db.collection('attendance')
                .where('companyId', '==', user.companyId);
            const allAttendance = attendanceSnapshot.docs.map(doc => doc.data());

            // 3. Process data: Calculate stats for each employee for the month
            const reportData = empList.map(emp => {
                const empAttendance = allAttendance.filter(a =>
                    a.userId === emp.uid && a.date.startsWith(monthPrefix)
                );

                const present = empAttendance.filter(a => a.status === 'present').length;
                const late = empAttendance.filter(a => a.status === 'late').length;
                const halfDay = empAttendance.filter(a => a.status === 'half_day').length;
                const absent = empAttendance.filter(a => a.status === 'absent').length;
                const paidLeave = empAttendance.filter(a => a.status === 'paid_leave').length;
                const totalHours = empAttendance.reduce((acc, a) => acc + (a.workHours || 0), 0);

                return {
                    ...emp,
                    stats: {
                        present,
                        late,
                        halfDay,
                        absent,
                        paidLeave,
                        hours: parseFloat(totalHours.toFixed(1))
                    }
                };
            });

            setEmployees(reportData);
            setFilteredData(reportData);
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredData(employees);
        } else {
            const query = text.toLowerCase();
            const filtered = employees.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.employeeId.toLowerCase().includes(query)
            );
            setFilteredData(filtered);
        }
    };

    const changeMonth = (offset) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedDate(newDate);
    };

    const renderReportItem = ({ item }) => (
        <TouchableOpacity
            style={styles.reportCard}
            onPress={() => navigation.navigate('AdminEmployeeDetail', { employee: item })}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empId}>{item.employeeId}</Text>
                </View>
                <View style={styles.deptTag}>
                    <Text style={styles.deptText}>{item.department || 'General'}</Text>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { borderLeftColor: '#2ECC71' }]}>
                    <Text style={styles.statValue}>{item.stats.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: '#F39C12' }]}>
                    <Text style={styles.statValue}>{item.stats.late + item.stats.halfDay}</Text>
                    <Text style={styles.statLabel}>Late/Half</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: '#E74C3C' }]}>
                    <Text style={styles.statValue}>{item.stats.absent}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: '#3498DB' }]}>
                    <Text style={styles.statValue}>{item.stats.paidLeave}</Text>
                    <Text style={styles.statLabel}>Paid Leave</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: '#9B59B6' }]}>
                    <Text style={styles.statValue}>{item.stats.hours}</Text>
                    <Text style={styles.statLabel}>Hours</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Monthly Analytics</Text>
                <TouchableOpacity onPress={loadData}>
                    <Ionicons name="filter" size={24} color="#4A90E2" />
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

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#95A5A6" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search employee name or ID..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loaderText}>Generating Report...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderReportItem}
                    keyExtractor={item => item.uid}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={() => {
                        const totalHours = employees.reduce((acc, e) => acc + e.stats.hours, 0);
                        const avgPresent = employees.length > 0
                            ? (employees.reduce((acc, e) => acc + e.stats.present, 0) / (employees.length * 22) * 100).toFixed(1)
                            : 0; // Assuming 22 working days

                        return (
                            <View style={styles.summaryContainer}>
                                <View style={styles.summaryBox}>
                                    <View style={styles.summaryIconBox}>
                                        <Ionicons name="time" size={24} color="#4A90E2" />
                                    </View>
                                    <View>
                                        <Text style={styles.summaryLabel}>Total Workforce Hours</Text>
                                        <Text style={styles.summaryValue}>{totalHours.toFixed(1)}h</Text>
                                    </View>
                                </View>
                                <View style={styles.summaryBox}>
                                    <View style={[styles.summaryIconBox, { backgroundColor: '#E8F5E9' }]}>
                                        <Ionicons name="stats-chart" size={24} color="#2ECC71" />
                                    </View>
                                    <View>
                                        <Text style={styles.summaryLabel}>Avg Attendance Rate</Text>
                                        <Text style={styles.summaryValue}>{avgPresent}%</Text>
                                    </View>
                                </View>
                                <Text style={styles.listTitle}>Employee Breakdown</Text>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="bar-chart-outline" size={60} color="#BDC3C7" />
                            <Text style={styles.emptyText}>No data available for this month</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        elevation: 2,
    },
    monthInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    monthText: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        height: 45,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
    list: { paddingHorizontal: 20, paddingBottom: 30 },
    reportCard: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 1,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    empName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
    empId: { fontSize: 12, color: '#95A5A6' },
    deptTag: { backgroundColor: '#E1F5FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    deptText: { fontSize: 10, color: '#0288D1', fontWeight: 'bold' },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { flex: 1, alignItems: 'center', borderLeftWidth: 3, paddingVertical: 5 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
    statLabel: { fontSize: 10, color: '#95A5A6', marginTop: 2 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 10, color: '#95A5A6' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, color: '#BDC3C7' },
    summaryContainer: {
        marginBottom: 20,
    },
    summaryBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        elevation: 1,
        gap: 15,
    },
    summaryIconBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EBF5FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 10,
        marginBottom: 5,
    }
});
