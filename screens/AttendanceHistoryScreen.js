import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebaseConfig';
import { formatDate } from '../utils/attendance';
import Colors, { shadows } from '../constants/Colors';
import BottomNavigation from '../components/BottomNavigation';

export default function AttendanceHistoryScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [markedDates, setMarkedDates] = useState({});
    const [currentDate, setCurrentDate] = useState(new Date()); // Tracks the calendar month
    const [stats, setStats] = useState({
        present: 0,
        absent: 0,
        halfDay: 0,
        paid: 0,
        unpaid: 0,
    });
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12

    useEffect(() => {
        loadAttendanceHistory();
    }, [currentDate]);

    const loadAttendanceHistory = async () => {
        try {
            setLoading(true);
            const snapshot = await db.collection('attendance')
                .where('userId', '==', user.uid);

            // Filter by companyId manually since current wrapper doesn't support chained .where()
            const userRecords = snapshot.docs
                .map(doc => doc.data())
                .filter(record => record.companyId === user.companyId || !record.companyId);

            setAttendanceRecords(userRecords);
            calculateStats(userRecords, currentDate);
            generateMarkedDates(userRecords);
        } catch (error) {
            console.error('Error loading attendance history:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (records, date) => {
        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Get existing records for this month
        const monthRecords = records.filter(record => {
            const rDate = new Date(record.date);
            return rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
        });

        // 2. Calculate actual counts from records
        let present = monthRecords.filter(r => r.status === 'present').length;
        let halfDay = monthRecords.filter(r => r.status === 'half_day' || r.status === 'late').length;
        let manualAbsent = monthRecords.filter(r => r.status === 'absent').length;
        let paidLeaves = monthRecords.filter(r => r.status === 'paid_leave').length;

        // 3. Calculate automatic absent days (past days with no record and not Sunday)
        let autoAbsent = 0;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (dStr < todayStr) {
                const hasRecord = monthRecords.some(r => r.date === dStr);
                const isSun = new Date(currentYear, currentMonth, i).getDay() === 0;
                if (!hasRecord && !isSun) {
                    autoAbsent++;
                }
            }
        }

        const totalAbsent = manualAbsent + autoAbsent;
        const unpaid = totalAbsent;

        setStats({
            present,
            absent: totalAbsent,
            halfDay,
            unpaid,
            paidLeaves
        });
    };

    const generateMarkedDates = (records) => {
        const marked = {};
        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // 1. Mark existing records
        records.forEach(record => {
            let containerBgColor = '#BDC3C7'; // Default gray
            let dots = [];

            if (record.status === 'present' || record.status === 'late' || record.status === 'half_day') {
                // Background color based on 'late' status
                if (record.isLate) {
                    containerBgColor = '#F1C40F'; // Yellow for Late
                } else {
                    containerBgColor = '#2ECC71'; // Green for On-Time
                }

                // Add dots based on work hours
                const hours = record.workHours || 0;
                if (hours >= 9) {
                    // 2 Green dots for 9+ hours
                    dots = [
                        { key: 'work1', color: '#2ECC71', selectedDotColor: '#FFFFFF' },
                        { key: 'work2', color: '#2ECC71', selectedDotColor: '#FFFFFF' }
                    ];
                } else if (hours > 0) {
                    // 1 Green dot for some work hours
                    dots = [
                        { key: 'work1', color: '#2ECC71', selectedDotColor: '#FFFFFF' }
                    ];
                }
            } else if (record.status === 'absent') {
                containerBgColor = '#E74C3C'; // Red
            } else if (record.status === 'weekly_off') {
                containerBgColor = '#607D8B'; // Blue gray
            } else if (record.status === 'paid_leave') {
                containerBgColor = '#4A90E2'; // Blue for Paid Leave
            }

            marked[record.date] = {
                selected: true,
                selectedColor: containerBgColor,
                dots: dots,
                textColor: 'white'
            };
        });

        // 2. Auto-fill missing days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const dateString = formatDate(date);

            if (!marked[dateString]) {
                const isSunday = date.getDay() === 0;
                const isPast = dateString < todayStr;

                if (isSunday) {
                    marked[dateString] = {
                        selected: true,
                        selectedColor: '#B0BEC5',
                        textColor: 'white'
                    };
                } else if (isPast) {
                    marked[dateString] = {
                        selected: true,
                        selectedColor: '#FFCDD2',
                        textColor: '#C62828'
                    };
                }
            }
        }
        setMarkedDates(marked);
    };

    const [selectedDay, setSelectedDay] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const handleDayPress = (day) => {
        const record = attendanceRecords.find(r => r.date === day.dateString);
        if (record) {
            setSelectedDay(record);
            setShowDetailsModal(true);
        } else {
            // For past days with no record (absent or weekly off)
            const d = new Date(day.timestamp);
            const isSunday = d.getDay() === 0;
            const todayStr = new Date().toISOString().split('T')[0];

            if (day.dateString < todayStr) {
                setSelectedDay({
                    date: day.dateString,
                    status: isSunday ? 'weekly_off' : 'absent',
                    checkIn: null,
                    checkOut: null,
                    workHours: 0
                });
                setShowDetailsModal(true);
            }
        }
    };

    const handleMonthChange = (month) => {
        const date = new Date(month.timestamp);
        setCurrentDate(date);
    };

    const confirmDateSelection = () => {
        const newDate = new Date(selectedYear, selectedMonth - 1, 1);
        setCurrentDate(newDate);
        setShowMonthPicker(false);
    };

    const getMonthName = (date) => {
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const years = [2024, 2025, 2026, 2027];
    const months = [
        { label: 'January', value: 1 }, { label: 'February', value: 2 },
        { label: 'March', value: 3 }, { label: 'April', value: 4 },
        { label: 'May', value: 5 }, { label: 'June', value: 6 },
        { label: 'July', value: 7 }, { label: 'August', value: 8 },
        { label: 'September', value: 9 }, { label: 'October', value: 10 },
        { label: 'November', value: 11 }, { label: 'December', value: 12 }
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{user?.name || 'User Name'}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Month Selector Bar */}
            <View style={styles.monthSelectorContainer}>
                <TouchableOpacity
                    style={styles.monthSelectorBtn}
                    onPress={() => setShowMonthPicker(true)}
                >
                    <Text style={styles.monthSelectorText}>{getMonthName(currentDate)}</Text>
                    <Ionicons name="caret-down" size={16} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Stats Overview */}
            <View style={styles.statsWrapper}>
                <View style={styles.statsContainer}>
                    <StatItem label="Present" value={stats.present} color="#2ECC71" />
                    <StatItem label="Absent" value={stats.absent} color="#E74C3C" />
                    <StatItem label="Half Days" value={stats.halfDay} color="#F39C12" />
                    <StatItem label="Paid Leave" value={stats.paidLeaves || 0} color="#4A90E2" />
                    <StatItem label="Unpaid Days" value={stats.unpaid} color="#E91E63" />
                </View>
            </View>

            {/* Calendar Area */}
            <View style={styles.calendarContainer}>
                <Calendar
                    current={currentDate.toISOString().split('T')[0]} // Sync calendar with state
                    key={currentDate.toISOString()} // Force re-render on date change
                    monthFormat={'yyyy MM'}
                    keyExtractor={(item) => item}
                    hideExtraDays={true}
                    disableMonthChange={false}
                    firstDay={1}
                    hideArrows={true} // We use our own month selector/swipe
                    enableSwipeMonths={true}
                    onMonthChange={handleMonthChange}
                    onDayPress={handleDayPress}
                    renderHeader={() => null} // Hide default header
                    markingType={'multi-dot'}
                    markedDates={markedDates}
                    theme={{
                        calendarBackground: 'transparent',
                        textSectionTitleColor: '#000', // Weekday headers
                        textSectionTitleDisabledColor: '#d9e1e8',
                        selectedDayBackgroundColor: '#00adf5',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#2ECC71',
                        dayTextColor: '#2d4150',
                        textDisabledColor: '#d9e1e8',
                        arrowColor: 'orange',
                        disabledArrowColor: '#d9e1e8',
                        monthTextColor: 'blue',
                        indicatorColor: 'blue',
                        textDayFontWeight: 'bold',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: 'bold',
                        textDayFontSize: 16,
                        textMonthFontSize: 16,
                        textDayHeaderFontSize: 14,
                        'stylesheet.calendar.header': {
                            week: {
                                marginTop: 5,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                paddingHorizontal: 10,
                            }
                        }
                    }}
                    style={styles.calendar}
                />
            </View>

            {/* Attendance Details Modal */}
            <Modal
                visible={showDetailsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetailsModal(false)}
            >
                <View style={styles.detailsOverlay}>
                    <View style={styles.detailsContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.detailsHeader}>
                                <Text style={styles.detailsDate}>
                                    {new Date(selectedDay?.date).toLocaleDateString('en-GB', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </Text>
                                <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                                    <Ionicons name="close-circle" size={28} color="#AEAEB2" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.statusBadgeLarge}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedDay?.status || 'absent') }]} />
                                <Text style={styles.statusTextLarge}>{selectedDay?.status?.toUpperCase() || 'ABSENT'}</Text>
                            </View>

                            <View style={styles.detailsGrid}>
                                {selectedDay?.sessions?.length > 0 ? (
                                    <>
                                        {selectedDay.sessions.map((s, i) => (
                                            <View key={i} style={styles.sessionBlock}>
                                                <Text style={styles.sessionBlockLabel}>Session {i + 1}</Text>
                                                <DetailRow icon="time-outline" label="Check In" value={s.checkInTime || '--:--'} color="#2ECC71" />
                                                <DetailRow icon="log-out-outline" label="Check Out" value={s.checkOutTime || '--:--'} color="#E74C3C" />
                                                <DetailRow icon="hourglass-outline" label="Session Hours" value={`${s.sessionHours?.toFixed(1) || '0.0'} hrs`} color="#4A90E2" />
                                            </View>
                                        ))}
                                        {selectedDay?.breaks?.filter(b => b.end).length > 0 && (
                                            <View style={[styles.sessionBlock, { borderLeftColor: '#F39C12' }]}>
                                                <Text style={[styles.sessionBlockLabel, { color: '#F39C12' }]}>Breaks</Text>
                                                {selectedDay.breaks.filter(b => b.end).map((b, i) => (
                                                    <DetailRow
                                                        key={i}
                                                        icon="cafe-outline"
                                                        label={`Break ${i + 1}`}
                                                        value={`${b.startTime} \u2192 ${b.endTime} (${b.durationMinutes}m)`}
                                                        color="#F39C12"
                                                    />
                                                ))}
                                                <DetailRow
                                                    icon="remove-circle-outline"
                                                    label="Total Break"
                                                    value={`${selectedDay.totalBreakMinutes ?? selectedDay.breaks.filter(b => b.end).reduce((t, b) => t + (b.durationMinutes || 0), 0)} min`}
                                                    color="#E67E22"
                                                />
                                            </View>
                                        )}
                                        <DetailRow icon="calculator-outline" label="Total Working Hours" value={`${selectedDay?.workHours?.toFixed(1) || '0.0'} Hours`} color="#9B59B6" />
                                    </>
                                ) : (
                                    <>
                                        <DetailRow icon="time-outline" label="Check In" value={selectedDay?.checkIn ? new Date(selectedDay.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} color="#2ECC71" />
                                        <DetailRow icon="log-out-outline" label="Check Out" value={selectedDay?.checkOut ? new Date(selectedDay.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} color="#E74C3C" />
                                        <DetailRow icon="hourglass-outline" label="Working Hours" value={`${selectedDay?.workHours?.toFixed(1) || '0.0'} Hours`} color="#4A90E2" />
                                    </>
                                )}
                            </View>

                            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetailsModal(false)}>
                                <Text style={styles.closeBtnText}>CLOSE</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Manual Month Picker Modal */}
            <Modal
                visible={showMonthPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMonthPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Date</Text>

                        <Text style={styles.inputLabel}>Select Year</Text>
                        <View style={styles.pickerRow}>
                            {years.map(y => (
                                <TouchableOpacity
                                    key={y}
                                    style={[styles.pickerChip, selectedYear === y && styles.pickerChipActive]}
                                    onPress={() => setSelectedYear(y)}
                                >
                                    <Text style={[styles.pickerChipText, selectedYear === y && styles.pickerChipTextActive]}>{y}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Select Month</Text>
                        <View style={styles.monthGrid}>
                            {months.map(m => (
                                <TouchableOpacity
                                    key={m.value}
                                    style={[styles.monthChip, selectedMonth === m.value && styles.monthChipActive]}
                                    onPress={() => setSelectedMonth(m.value)}
                                >
                                    <Text style={[styles.monthChipText, selectedMonth === m.value && styles.monthChipTextActive]}>{m.label.substring(0, 3)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.confirmButton} onPress={confirmDateSelection}>
                            <Text style={styles.confirmButtonText}>CONFIRM</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowMonthPicker(false)}>
                            <Text style={styles.cancelButtonText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <BottomNavigation />
        </View>
    );
}

const StatItem = ({ label, value, color }) => (
    <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: color }]}>{label}</Text>
        <Text style={[styles.statValue, { color: color }]}>{value}</Text>
    </View>
);

const DetailRow = ({ icon, label, value, color }) => (
    <View style={styles.detailRowContainer}>
        <View style={[styles.detailIconWrapper, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

const getStatusColor = (status) => {
    switch (status) {
        case 'present': return '#2ECC71';
        case 'late': return '#F1C40F';
        case 'half_day': return '#F39C12';
        case 'absent': return '#E74C3C';
        case 'weekly_off': return '#607D8B';
        default: return '#BDC3C7';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    monthSelectorContainer: {
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: '#F9F9FB',
    },
    monthSelectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 15,
        gap: 8,
        ...shadows.small,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    monthSelectorText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    statsWrapper: {
        paddingHorizontal: 20,
        marginVertical: 15,
    },
    statsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 20,
        paddingHorizontal: 15,
        ...shadows.medium,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
    },
    calendarContainer: {
        flex: 1,
        paddingHorizontal: 10,
        marginTop: 10,
    },
    calendar: {
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 25,
        ...shadows.large,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1C1C1E',
        marginBottom: 25,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        marginBottom: 12,
        marginTop: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    pickerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    pickerChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 15,
        backgroundColor: '#F2F2F7',
    },
    pickerChipActive: {
        backgroundColor: '#4A90E2',
    },
    pickerChipText: {
        color: '#8E8E93',
        fontWeight: '700',
    },
    pickerChipTextActive: {
        color: 'white',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    monthChip: {
        width: '31%',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
    },
    monthChipActive: {
        backgroundColor: '#4A90E2',
    },
    monthChipText: {
        color: '#8E8E93',
        fontWeight: '700',
    },
    monthChipTextActive: {
        color: 'white',
    },
    confirmButton: {
        backgroundColor: '#4A90E2',
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: 'center',
        marginTop: 35,
        ...shadows.small,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cancelButton: {
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 5,
    },
    cancelButtonText: {
        color: '#8E8E93',
        fontWeight: '700',
    },
    detailsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    detailsContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 30,
        paddingBottom: 50,
        ...shadows.large,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    detailsDate: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    statusBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9FB',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 30,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    statusTextLarge: {
        fontSize: 13,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: 1,
    },
    detailsGrid: {
        gap: 20,
        marginBottom: 35,
    },
    sessionBlock: {
        backgroundColor: '#F9F9FB',
        borderRadius: 12,
        padding: 12,
        gap: 10,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#4A90E2',
    },
    sessionBlockLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#4A90E2',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    detailIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailInfo: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    closeBtn: {
        backgroundColor: '#1C1C1E',
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: 'center',
        ...shadows.medium,
    },
    closeBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
