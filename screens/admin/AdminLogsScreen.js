import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';

export default function AdminLogsScreen({ navigation }) {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadLogs();
        });
        return unsubscribe;
    }, [navigation]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const snapshot = await db.collection('attendance')
                .where('companyId', '==', user.companyId);

            // Extract all sessions into a single flat list of logs
            let allLogs = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.sessions && Array.isArray(data.sessions)) {
                    data.sessions.forEach(session => {
                        allLogs.push({
                            id: `${doc.id}-${session.checkIn}`,
                            employeeName: data.employeeName || 'Unknown',
                            employeeId: data.employeeId || 'N/A',
                            type: 'Punch In',
                            time: session.checkInTime,
                            date: data.date,
                            method: data.method || 'Standard',
                            isWFH: data.isWFH || false,
                            timestamp: new Date(session.checkIn).getTime(),
                            status: 'Check In'
                        });
                        if (session.checkOut) {
                            allLogs.push({
                                id: `${doc.id}-${session.checkOut}`,
                                employeeName: data.employeeName || 'Unknown',
                                employeeId: data.employeeId || 'N/A',
                                type: 'Punch Out',
                                time: session.checkOutTime,
                                date: data.date,
                                method: data.method || 'Standard',
                                isWFH: data.isWFH || false,
                                timestamp: new Date(session.checkOut).getTime(),
                                status: 'Check Out'
                            });
                        }
                    });
                }
            });

            // Sort by timestamp descending
            allLogs.sort((a, b) => b.timestamp - a.timestamp);
            setLogs(allLogs);
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderLogItem = ({ item }) => (
        <View style={styles.logCard}>
            <View style={[styles.indicator, { backgroundColor: item.type === 'Punch In' ? '#2ECC71' : '#E74C3C' }]} />
            <View style={styles.logInfo}>
                <View style={styles.row}>
                    <Text style={styles.empName}>{item.employeeName}</Text>
                    <Text style={styles.logTime}>{item.time}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.empId}>{item.employeeId}</Text>
                    <Text style={styles.logDate}>{item.date}</Text>
                </View>
                <View style={styles.statusRow}>
                    <View style={styles.methodBadge}>
                        <Ionicons
                            name={item.type === 'Punch In' ? 'enter-outline' : 'exit-outline'}
                            size={14}
                            color={item.type === 'Punch In' ? '#2ECC71' : '#E74C3C'}
                        />
                        <Text style={[styles.statusText, { color: item.type === 'Punch In' ? '#2ECC71' : '#E74C3C' }]}>
                            {item.type}
                        </Text>
                    </View>
                    <View style={[styles.methodBadge, { backgroundColor: '#F2F2F7' }]}>
                        <Ionicons
                            name={item.isWFH ? 'home-outline' : (item.method === 'face_scan' ? 'scan-outline' : 'location-outline')}
                            size={12}
                            color="#555"
                        />
                        <Text style={styles.methodText}>
                            {item.isWFH ? 'WFH' : (item.method === 'face_scan' ? 'Face Scan' : 'Standard')}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>System Logs</Text>
                <TouchableOpacity onPress={loadLogs} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={20} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loadingText}>Fetching all logs...</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    renderItem={renderLogItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={60} color="#BDC3C7" />
                            <Text style={styles.emptyText}>No logs recorded yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        marginBottom: 0,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EBF5FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 30,
    },
    logCard: {
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    indicator: {
        width: 4,
        borderRadius: 2,
        marginRight: 14,
    },
    logInfo: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    empName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    logTime: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4A90E2',
    },
    empId: {
        fontSize: 12,
        color: '#8E8E93',
    },
    logDate: {
        fontSize: 12,
        color: '#8E8E93',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 8,
    },
    methodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    methodText: {
        fontSize: 10,
        color: '#6C6C70',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#8E8E93',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 10,
        color: '#AEAEB2',
        fontSize: 14,
    },
});
