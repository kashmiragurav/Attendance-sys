import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { FeatureGate } from '../../components/FeatureGate';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';
import { formatDate } from '../../utils/attendance';

export default function AdminAttendanceScreen({ navigation }) {
    const { user, FEATURES, refreshCompany } = useAuth();
    const [attendanceData, setAttendanceData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (refreshCompany) {
                console.log('🔄 Refreshing company data on Admin Attendance focus');
                refreshCompany();
            }
            loadAttendance();
        });
        return unsubscribe;
    }, [navigation, selectedDate, refreshCompany]);

    useEffect(() => {
        loadAttendance();
    }, [selectedDate]);

    const loadAttendance = async () => {
        try {
            setLoading(true);
            const [attendanceSnapshot, usersSnapshot] = await Promise.all([
                db.collection('attendance').where('companyId', '==', user.companyId),
                db.collection('users').where('companyId', '==', user.companyId)
            ]);

            const allEmployeeUsers = usersSnapshot.docs
                .map(doc => doc.data())
                .filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'COMPANY_ADMIN' && u.role !== 'admin');

            const attendanceRecords = attendanceSnapshot.docs
                .map(doc => doc.data())
                .filter(record => record.date === selectedDate);

            // Merge records: show all employees, either with punch-in data or labeled as Absent/Weekly Off
            // Force local date interpretation to avoid shifting
            const isSunday = new Date(selectedDate + 'T00:00:00').getDay() === 0;
            const mergedRecords = allEmployeeUsers.map(emp => {
                const record = attendanceRecords.find(r => r.userId === emp.uid);
                if (record) return record;

                // Virtual record for missing punch
                return {
                    userId: emp.uid,
                    employeeId: emp.employeeId,
                    employeeName: emp.name,
                    status: isSunday ? 'weekly_off' : 'absent',
                    checkInTime: '-',
                    checkOutTime: '-',
                    workHours: 0,
                    date: selectedDate,
                    companyId: emp.companyId
                };
            }).sort((a, b) => {
                // Show present people first
                if (a.checkInTime !== '-' && b.checkInTime === '-') return -1;
                if (a.checkInTime === '-' && b.checkInTime !== '-') return 1;
                return a.employeeName.localeCompare(b.employeeName);
            });

            setAttendanceData(mergedRecords);
            setFilteredData(mergedRecords);
        } catch (error) {
            console.error('Error loading attendance:', error);
            Alert.alert('Connection Error', 'Could not load attendance records. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        Alert.alert(
            'Export Report',
            `Generating detailed attendance report for ${selectedDate}...\n(CSV/PDF Export is active for your plan)`,
            [{ text: 'Download' }, { text: 'Cancel', style: 'cancel' }]
        );
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredData(attendanceData);
        } else {
            const query = text.toLowerCase();
            const filtered = attendanceData.filter(item =>
                item.employeeName?.toLowerCase().includes(query) ||
                item.employeeId?.toLowerCase().includes(query)
            );
            setFilteredData(filtered);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'present': return { bg: '#E8F5E9', text: '#2E7D32' };
            case 'absent': return { bg: '#FFEBEE', text: '#C62828' };
            case 'late': return { bg: '#FFF3E0', text: '#EF6C00' };
            case 'half_day': return { bg: '#F3E5F5', text: '#8E24AA' };
            case 'weekly_off': return { bg: '#E0F7FA', text: '#006064' };
            default: return { bg: '#F5F5F5', text: '#616161' };
        }
    };

    const renderAttendanceItem = ({ item }) => {
        const style = getStatusStyle(item.status);
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('AdminEditAttendance', {
                    record: item,
                    employee: {
                        uid: item.userId,
                        name: item.employeeName,
                        employeeId: item.employeeId,
                        companyId: item.companyId
                    }
                })}
            >
                <View style={styles.cardRow}>
                    <View style={styles.userInfo}>
                        <Text style={styles.name}>{item.employeeName || 'Unknown User'}</Text>
                        <Text style={styles.id}>{item.employeeId || 'ID N/A'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                        <Text style={[styles.statusText, { color: style.text }]}>
                            {item.status?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.timeRow}>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Check In</Text>
                        <Text style={styles.timeValue}>{item.checkInTime || '--:--'}</Text>
                    </View>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Check Out</Text>
                        <Text style={styles.timeValue}>{item.checkOutTime || '--:--'}</Text>
                    </View>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Work Hours</Text>
                        <Text style={styles.timeValue}>{item.workHours?.toFixed(1) || '0.0'} hrs</Text>
                    </View>
                    <View style={styles.timeCol}>
                        <Text style={styles.timeLabel}>Mode</Text>
                        <Text style={[styles.timeValue, { fontSize: 11, color: item.attendanceMode === 'WFH' ? '#F39C12' : '#4A90E2' }]}>
                            {item.attendanceMode === 'WFH' ? '🏠 WFH' : '🏢 Office'}
                        </Text>
                    </View>
                </View>

                {/* Location / Mode Indicator */}
                {(item.location || item.checkoutLocation || item.attendanceMode) && (
                    <View style={styles.locationIndicator}>
                        <Ionicons
                            name={item.attendanceMode === 'WFH' ? 'home' : 'location'}
                            size={14}
                            color={item.attendanceMode === 'WFH' ? '#F39C12' : '#4A90E2'}
                        />
                        <Text style={[styles.locationIndicatorText, item.attendanceMode === 'WFH' && { color: '#F39C12' }]}>
                            {item.attendanceMode === 'WFH' ? 'WFH' : 'Location tracked'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Attendance</Text>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AdminLocationMap')}
                        style={styles.mapBtn}
                    >
                        <Ionicons name="map" size={22} color="#4A90E2" />
                    </TouchableOpacity>

                    <FeatureGate feature={FEATURES.ADVANCED_REPORTS}>
                        <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
                            <Ionicons name="download-outline" size={22} color="#4A90E2" />
                        </TouchableOpacity>
                    </FeatureGate>
                </View>
            </View>

            {/* Date Selector bar (Simple text for now) */}
            <View style={styles.dateBar}>
                <TouchableOpacity onPress={() => {/* Implement date picker */ }}>
                    <Text style={styles.dateText}>Date: {selectedDate}</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#95A5A6" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor="#95A5A6"
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00B894" />
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderAttendanceItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color="#BDC3C7" />
                            <Text style={styles.emptyText}>No attendance records for today</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', flex: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mapBtn: { padding: 5, backgroundColor: '#EBF5FF', borderRadius: 8 },
    exportBtn: { padding: 5, backgroundColor: '#EBF5FF', borderRadius: 8 },
    dateBar: { backgroundColor: '#E0F2F1', paddingVertical: 8, alignItems: 'center', marginBottom: 15 },
    dateText: { fontWeight: '600', color: '#00796B' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        borderRadius: 12,
        height: 45,
        marginBottom: 15,
        elevation: 2,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 14 },
    listContent: { paddingHorizontal: 20, paddingBottom: 30 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    userInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
    id: { fontSize: 12, color: '#7F8C8D' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 12 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeCol: { alignItems: 'center', flex: 1 },
    timeLabel: { fontSize: 11, color: '#95A5A6', marginBottom: 4 },
    timeValue: { fontSize: 14, fontWeight: '600', color: '#2C3E50' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, color: '#BDC3C7' },
    locationIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        gap: 6
    },
    locationIndicatorText: {
        fontSize: 11,
        color: '#4A90E2',
        fontWeight: '500'
    }
});
