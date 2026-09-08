import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Callout, Marker, Polyline } from '../../components/PlatformMap';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';

export default function AdminEmployeeLocationHistoryScreen({ navigation, route }) {
    const { user } = useAuth();
    const { employee } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [dateRange, setDateRange] = useState('7'); // Last 7 days
    const [mapRegion, setMapRegion] = useState({
        latitude: 18.5204,
        longitude: 73.8567,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });
    const [showDateModal, setShowDateModal] = useState(false);

    useEffect(() => {
        if (employee) {
            loadEmployeeLocationHistory();
        }
    }, [employee, dateRange]);

    const loadEmployeeLocationHistory = async () => {
        try {
            setLoading(true);

            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(dateRange));

            // Fetch all attendance records for this employee
            const attendanceSnapshot = await db.collection('attendance')
                .where('companyId', '==', user.companyId);

            const records = attendanceSnapshot.docs
                .map(doc => doc.data())
                .filter(record => {
                    // Filter by employee
                    if (record.userId !== employee.uid && record.employeeId !== employee.employeeId) {
                        return false;
                    }

                    // Filter by date range
                    const recordDate = new Date(record.date);
                    if (recordDate < startDate || recordDate > endDate) {
                        return false;
                    }

                    // Must have location data
                    const hasCheckInLocation = record.location &&
                        record.location.latitude &&
                        record.location.longitude;
                    const hasCheckOutLocation = record.checkoutLocation &&
                        record.checkoutLocation.latitude &&
                        record.checkoutLocation.longitude;

                    return hasCheckInLocation || hasCheckOutLocation;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            setAttendanceHistory(records);

            // Auto-center map on first location
            if (records.length > 0 && records[0].location) {
                const firstLocation = records[0].location;
                setMapRegion({
                    latitude: firstLocation.latitude,
                    longitude: firstLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }

            // Auto-select first record
            if (records.length > 0) {
                setSelectedRecord(records[0]);
            }
        } catch (error) {
            console.error('Error loading employee location history:', error);
            Alert.alert('Error', 'Failed to load location history');
        } finally {
            setLoading(false);
        }
    };

    const renderMarkers = () => {
        if (!selectedRecord) return null;

        const markers = [];

        // Check-in marker
        if (selectedRecord.location && selectedRecord.location.latitude && selectedRecord.location.longitude) {
            markers.push(
                <Marker
                    key="checkin"
                    coordinate={{
                        latitude: selectedRecord.location.latitude,
                        longitude: selectedRecord.location.longitude,
                    }}
                    pinColor="#4CAF50"
                >
                    <View style={[styles.customMarker, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="log-in" size={24} color="#FFF" />
                    </View>
                    <Callout style={styles.callout}>
                        <View style={styles.calloutContainer}>
                            <Text style={styles.calloutTitle}>Check-In</Text>
                            <Text style={styles.calloutTime}>{selectedRecord.checkInTime}</Text>
                            <Text style={styles.calloutDate}>{selectedRecord.date}</Text>
                            <Text style={styles.calloutCoords}>
                                📍 {selectedRecord.location.latitude.toFixed(6)}, {selectedRecord.location.longitude.toFixed(6)}
                            </Text>
                            {selectedRecord.isLate && (
                                <View style={styles.lateTag}>
                                    <Text style={styles.lateTagText}>Late by {selectedRecord.lateMinutes} min</Text>
                                </View>
                            )}
                        </View>
                    </Callout>
                </Marker>
            );
        }

        // Check-out marker
        if (selectedRecord.checkoutLocation && selectedRecord.checkoutLocation.latitude && selectedRecord.checkoutLocation.longitude) {
            markers.push(
                <Marker
                    key="checkout"
                    coordinate={{
                        latitude: selectedRecord.checkoutLocation.latitude,
                        longitude: selectedRecord.checkoutLocation.longitude,
                    }}
                    pinColor="#F44336"
                >
                    <View style={[styles.customMarker, { backgroundColor: '#F44336' }]}>
                        <Ionicons name="log-out" size={24} color="#FFF" />
                    </View>
                    <Callout style={styles.callout}>
                        <View style={styles.calloutContainer}>
                            <Text style={styles.calloutTitle}>Check-Out</Text>
                            <Text style={styles.calloutTime}>{selectedRecord.checkOutTime}</Text>
                            <Text style={styles.calloutDate}>{selectedRecord.date}</Text>
                            <Text style={styles.calloutCoords}>
                                📍 {selectedRecord.checkoutLocation.latitude.toFixed(6)}, {selectedRecord.checkoutLocation.longitude.toFixed(6)}
                            </Text>
                            <Text style={styles.calloutWorkHours}>
                                Work Hours: {selectedRecord.workHours?.toFixed(1)} hrs
                            </Text>
                        </View>
                    </Callout>
                </Marker>
            );
        }

        return markers;
    };

    const renderPolyline = () => {
        if (!selectedRecord) return null;

        const hasCheckIn = selectedRecord.location && selectedRecord.location.latitude && selectedRecord.location.longitude;
        const hasCheckOut = selectedRecord.checkoutLocation && selectedRecord.checkoutLocation.latitude && selectedRecord.checkoutLocation.longitude;

        if (hasCheckIn && hasCheckOut) {
            return (
                <Polyline
                    coordinates={[
                        {
                            latitude: selectedRecord.location.latitude,
                            longitude: selectedRecord.location.longitude,
                        },
                        {
                            latitude: selectedRecord.checkoutLocation.latitude,
                            longitude: selectedRecord.checkoutLocation.longitude,
                        },
                    ]}
                    strokeColor="#4A90E2"
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                />
            );
        }

        return null;
    };

    const handleRecordSelect = (record) => {
        setSelectedRecord(record);
        if (record.location) {
            setMapRegion({
                latitude: record.location.latitude,
                longitude: record.location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    const renderHistoryItem = ({ item }) => {
        const isSelected = selectedRecord && selectedRecord.date === item.date;
        const hasCheckIn = item.location && item.location.latitude;
        const hasCheckOut = item.checkoutLocation && item.checkoutLocation.latitude;

        return (
            <TouchableOpacity
                style={[styles.historyCard, isSelected && styles.historyCardSelected]}
                onPress={() => handleRecordSelect(item)}
            >
                <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.historyDetails}>
                    <View style={styles.historyRow}>
                        <Ionicons name="log-in" size={16} color={hasCheckIn ? '#4CAF50' : '#CCC'} />
                        <Text style={styles.historyLabel}>In: </Text>
                        <Text style={styles.historyValue}>{item.checkInTime || '--:--'}</Text>
                    </View>
                    <View style={styles.historyRow}>
                        <Ionicons name="log-out" size={16} color={hasCheckOut ? '#F44336' : '#CCC'} />
                        <Text style={styles.historyLabel}>Out: </Text>
                        <Text style={styles.historyValue}>{item.checkOutTime || '--:--'}</Text>
                    </View>
                    <View style={styles.historyRow}>
                        <Ionicons name="time" size={16} color="#4A90E2" />
                        <Text style={styles.historyLabel}>Hours: </Text>
                        <Text style={styles.historyValue}>{item.workHours?.toFixed(1) || '0.0'} hrs</Text>
                    </View>
                </View>

                <View style={styles.locationIndicators}>
                    {hasCheckIn && (
                        <View style={styles.locationTag}>
                            <Ionicons name="location" size={12} color="#4CAF50" />
                            <Text style={styles.locationTagText}>Check-in tracked</Text>
                        </View>
                    )}
                    {hasCheckOut && (
                        <View style={styles.locationTag}>
                            <Ionicons name="location" size={12} color="#F44336" />
                            <Text style={styles.locationTagText}>Check-out tracked</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return '#E8F5E9';
            case 'absent': return '#FFEBEE';
            case 'late': return '#FFF3E0';
            case 'half_day': return '#F3E5F5';
            default: return '#F5F5F5';
        }
    };

    if (!employee) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={60} color="#F44336" />
                <Text style={styles.errorText}>No employee selected</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>{employee.name || 'Employee'}</Text>
                    <Text style={styles.headerSubtitle}>Location History - Last {dateRange} days</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setShowDateModal(true)}
                    style={styles.filterButton}
                >
                    <Ionicons name="calendar" size={22} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loadingText}>Loading location history...</Text>
                </View>
            ) : (
                <View style={styles.content}>
                    {/* Map Section */}
                    <View style={styles.mapSection}>
                        {attendanceHistory.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="location-outline" size={60} color="#BDC3C7" />
                                <Text style={styles.emptyText}>No location data found</Text>
                                <Text style={styles.emptySubtext}>
                                    This employee hasn't punched in/out in the last {dateRange} days
                                </Text>
                            </View>
                        ) : (
                            <MapView
                                style={styles.map}
                                region={mapRegion}
                                onRegionChangeComplete={setMapRegion}
                                showsUserLocation={false}
                                showsMyLocationButton={true}
                                showsCompass={true}
                            >
                                {renderMarkers()}
                                {renderPolyline()}
                            </MapView>
                        )}
                    </View>

                    {/* History List Section */}
                    <View style={styles.historySection}>
                        <View style={styles.historySectionHeader}>
                            <Text style={styles.historySectionTitle}>Attendance History</Text>
                            <Text style={styles.historySectionCount}>{attendanceHistory.length} records</Text>
                        </View>
                        <FlatList
                            data={attendanceHistory}
                            renderItem={renderHistoryItem}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={styles.historyList}
                            ListEmptyComponent={
                                <Text style={styles.emptyListText}>No records found</Text>
                            }
                        />
                    </View>
                </View>
            )}

            {/* Date Range Modal */}
            <Modal
                visible={showDateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Date Range</Text>
                            <TouchableOpacity onPress={() => setShowDateModal(false)}>
                                <Ionicons name="close" size={24} color="#2C3E50" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            {['7', '15', '30', '60', '90'].map((days) => (
                                <TouchableOpacity
                                    key={days}
                                    style={[
                                        styles.dateOption,
                                        dateRange === days && styles.dateOptionSelected
                                    ]}
                                    onPress={() => {
                                        setDateRange(days);
                                        setShowDateModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dateOptionText,
                                        dateRange === days && styles.dateOptionTextSelected
                                    ]}>
                                        Last {days} days
                                    </Text>
                                    {dateRange === days && (
                                        <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerBackButton: {
        padding: 5,
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#7F8C8D',
        marginTop: 2,
    },
    filterButton: {
        padding: 8,
        backgroundColor: '#EBF5FF',
        borderRadius: 8,
    },
    content: {
        flex: 1,
    },
    mapSection: {
        height: '50%',
    },
    map: {
        flex: 1,
    },
    customMarker: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    callout: {
        width: 220,
    },
    calloutContainer: {
        padding: 12,
    },
    calloutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 4,
    },
    calloutTime: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4A90E2',
        marginBottom: 2,
    },
    calloutDate: {
        fontSize: 12,
        color: '#7F8C8D',
        marginBottom: 8,
    },
    calloutCoords: {
        fontSize: 10,
        color: '#7F8C8D',
        marginBottom: 4,
    },
    calloutWorkHours: {
        fontSize: 12,
        color: '#4A90E2',
        fontWeight: '600',
        marginTop: 4,
    },
    lateTag: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 6,
    },
    lateTagText: {
        fontSize: 11,
        color: '#EF6C00',
        fontWeight: '600',
    },
    historySection: {
        height: '50%',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 15,
    },
    historySectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    historySectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    historySectionCount: {
        fontSize: 14,
        color: '#4A90E2',
        fontWeight: '600',
    },
    historyList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    historyCard: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    historyCardSelected: {
        backgroundColor: '#EBF5FF',
        borderColor: '#4A90E2',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    historyDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    historyDetails: {
        marginBottom: 10,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    historyLabel: {
        fontSize: 13,
        color: '#7F8C8D',
        marginLeft: 8,
    },
    historyValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2C3E50',
    },
    locationIndicators: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    locationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    locationTagText: {
        fontSize: 10,
        color: '#7F8C8D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#7F8C8D',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        textAlign: 'center',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#95A5A6',
        textAlign: 'center',
    },
    emptyListText: {
        textAlign: 'center',
        color: '#95A5A6',
        fontSize: 14,
        paddingVertical: 20,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#F44336',
        textAlign: 'center',
    },
    backButton: {
        marginTop: 20,
        backgroundColor: '#4A90E2',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    modalBody: {
        padding: 20,
    },
    dateOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
    },
    dateOptionSelected: {
        backgroundColor: '#EBF5FF',
        borderWidth: 2,
        borderColor: '#4A90E2',
    },
    dateOptionText: {
        fontSize: 16,
        color: '#2C3E50',
        fontWeight: '500',
    },
    dateOptionTextSelected: {
        color: '#4A90E2',
        fontWeight: '600',
    },
});
