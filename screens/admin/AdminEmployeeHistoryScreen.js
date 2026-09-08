import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { db } from '../../services/firebaseConfig';
import { formatDate } from '../../utils/attendance';
import Colors from '../../constants/Colors';

export default function AdminEmployeeHistoryScreen({ route, navigation }) {
    const { employee } = route.params;
    const [loading, setLoading] = useState(true);
    const [markedDates, setMarkedDates] = useState({});
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, paidLeave: 0 });
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [attendanceRecords, setAttendanceRecords] = useState([]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadEmployeeHistory();
        });
        return unsubscribe;
    }, [navigation, currentDate]);

    const loadEmployeeHistory = async () => {
        try {
            setLoading(true);
            const snapshot = await db.collection('attendance')
                .where('userId', '==', employee.uid);

            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAttendanceRecords(records);

            calculateStats(records, currentDate);
            generateMarkedDates(records);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (records, date) => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthRecords = records.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        setStats({
            present: monthRecords.filter(r => r.status === 'present').length,
            late: monthRecords.filter(r => r.status === 'late' || r.status === 'half_day').length,
            absent: monthRecords.filter(r => r.status === 'absent').length,
            paidLeave: monthRecords.filter(r => r.status === 'paid_leave').length,
        });
    };

    const generateMarkedDates = (records) => {
        const marked = {};

        // 1. Mark existing records
        records.forEach(record => {
            let color = '#BDC3C7';
            if (record.status === 'present') color = '#2ECC71';
            else if (record.status === 'absent') color = '#E74C3C';
            else if (record.status === 'late' || record.status === 'half_day') color = '#F39C12';
            else if (record.status === 'weekly_off') color = '#607D8B';
            else if (record.status === 'paid_leave') color = '#4A90E2';

            marked[record.date] = {
                customStyles: {
                    container: { backgroundColor: color, borderRadius: 8 },
                    text: { color: 'white', fontWeight: 'bold' }
                }
            };
        });

        // 2. Mark specific days for the current displayed month
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = formatDate(new Date());

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = formatDate(date);

            if (!marked[dateString]) {
                const isSunday = date.getDay() === 0;
                const isPast = dateString < todayStr;

                if (isSunday) {
                    marked[dateString] = {
                        customStyles: {
                            container: { backgroundColor: '#B0BEC5', borderRadius: 8 },
                            text: { color: 'white' }
                        }
                    };
                } else if (isPast) {
                    marked[dateString] = {
                        customStyles: {
                            container: { backgroundColor: '#FFCDD2', borderRadius: 8 },
                            text: { color: '#C62828' }
                        }
                    };
                }
            }
        }

        setMarkedDates(marked);
    };

    const confirmDateSelection = () => {
        setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
        setShowMonthPicker(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{employee.name}</Text>
                    <Text style={styles.headerSub}>{employee.employeeId}</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.monthBar}>
                <TouchableOpacity style={styles.monthBtn} onPress={() => setShowMonthPicker(true)}>
                    <Text style={styles.monthText}>
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Text>
                    <Ionicons name="caret-down" size={16} color="#2C3E50" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsCard}>
                <StatItem label="Present" value={stats.present} color="#2ECC71" />
                <StatItem label="Late" value={stats.late} color="#F39C12" />
                <StatItem label="Absent" value={stats.absent} color="#E74C3C" />
                <StatItem label="Paid Leave" value={stats.paidLeave} color="#4A90E2" />
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#1a2a6c" />
                </View>
            ) : (
                <Calendar
                    current={currentDate.toISOString().split('T')[0]}
                    key={currentDate.toISOString()}
                    markingType={'custom'}
                    markedDates={markedDates}
                    enableSwipeMonths={true}
                    theme={{
                        calendarBackground: '#FFF',
                        todayTextColor: '#1a2a6c',
                        dayTextColor: '#2C3E50',
                        textDayFontWeight: 'bold',
                    }}
                    style={styles.calendar}
                    onDayPress={(day) => {
                        const existingRecord = attendanceRecords.find(r => r.date === day.dateString);
                        navigation.navigate('AdminEditAttendance', {
                            record: existingRecord,
                            employee: employee,
                            date: day.dateString // Pass date separately if record doesn't exist
                        });
                    }}
                />
            )}

            {/* Month Picker Modal */}
            <Modal visible={showMonthPicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Month</Text>
                        <View style={styles.yearRow}>
                            {[2025, 2026].map(y => (
                                <TouchableOpacity
                                    key={y}
                                    style={[styles.chip, selectedYear === y && styles.chipActive]}
                                    onPress={() => setSelectedYear(y)}
                                >
                                    <Text style={[styles.chipText, selectedYear === y && styles.chipTextActive]}>{y}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.monthGrid}>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.mChip, selectedMonth === i + 1 && styles.chipActive]}
                                    onPress={() => setSelectedMonth(i + 1)}
                                >
                                    <Text style={[styles.chipText, selectedMonth === i + 1 && styles.chipTextActive]}>
                                        {new Date(0, i).toLocaleString('default', { month: 'short' })}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.confirmBtn} onPress={confirmDateSelection}>
                            <Text style={styles.confirmText}>CONFIRM</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const StatItem = ({ label, value, color }) => (
    <View style={styles.statItem}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    header: { backgroundColor: '#1a2a6c', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    headerInfo: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    monthBar: { backgroundColor: '#E0F2F1', paddingVertical: 10, alignItems: 'center' },
    monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
    monthText: { fontWeight: 'bold', color: '#2C3E50' },
    statsCard: { margin: 15, backgroundColor: '#FFF', borderRadius: 15, flexDirection: 'row', padding: 15, elevation: 3 },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: '#95A5A6', marginTop: 2 },
    calendar: { marginHorizontal: 15, borderRadius: 15, elevation: 2 },
    loading: { flex: 1, justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    yearRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 15 },
    chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0' },
    mChip: { width: '23%', paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F0F0F0', marginBottom: 8 },
    chipActive: { backgroundColor: '#1a2a6c' },
    chipText: { color: '#2C3E50' },
    chipTextActive: { color: '#FFF' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    confirmBtn: { backgroundColor: '#1ABC9C', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    confirmText: { color: '#FFF', fontWeight: 'bold' }
});
