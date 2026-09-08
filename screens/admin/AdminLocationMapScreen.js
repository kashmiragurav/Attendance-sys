import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Callout, Marker } from '../../components/PlatformMap';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';
import { formatDate } from '../../utils/attendance';

export default function AdminLocationMapScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mapRegion, setMapRegion] = useState({
        latitude: 18.5204,
        longitude: 73.8567,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    useEffect(() => {
        loadLocationData();
    }, [selectedDate]);

    const loadLocationData = async () => {
        try {
            setLoading(true);

            // Fetch attendance records with location data
            // Note: The REST API wrapper doesn't support chaining .where() calls
            const attendanceSnapshot = await db.collection('attendance')
                .where('companyId', '==', user.companyId);

            const records = attendanceSnapshot.docs
                .map(doc => doc.data())
                .filter(record => {
                    // Filter by selected date
                    if (record.date !== selectedDate) return false;

                    // Filter records that have location data
                    const hasCheckInLocation = record.location &&
                        record.location.latitude &&
                        record.location.longitude;
                    const hasCheckOutLocation = record.checkoutLocation &&
                        record.checkoutLocation.latitude &&
                        record.checkoutLocation.longitude;

                    return hasCheckInLocation || hasCheckOutLocation;
                });

            // Filter by search query if present
            const filteredRecords = searchQuery.trim() === ''
                ? records
                : records.filter(record =>
                    record.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    record.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
                );

            setAttendanceData(filteredRecords);

            // Auto-center map on first location if available
            if (filteredRecords.length > 0 && filteredRecords[0].location) {
                const firstLocation = filteredRecords[0].location;
                setMapRegion({
                    latitude: firstLocation.latitude,
                    longitude: firstLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }
        } catch (error) {
            console.error('Error loading location data:', error);
            Alert.alert('Error', 'Failed to load location data');
        } finally {
            setLoading(false);
        }
    };

    const getMarkerColor = (type) => {
        return type === 'check-in' ? '#4CAF50' : '#F44336';
    };

    const renderMarkers = () => {
        const markers = [];

        attendanceData.forEach((record, index) => {
            // Check-in marker
            if (record.location && record.location.latitude && record.location.longitude) {
                markers.push(
                    <Marker
                        key={`checkin-${index}`}
                        coordinate={{
                            latitude: record.location.latitude,
                            longitude: record.location.longitude,
                        }}
                        pinColor={getMarkerColor('check-in')}
                    >
                        <View style={[styles.customMarker, { backgroundColor: '#4CAF50' }]}>
                            <Ionicons name="log-in" size={20} color="#FFF" />
                        </View>
                        <Callout style={styles.callout}>
                            <View style={styles.calloutContainer}>
                                <Text style={styles.calloutTitle}>{record.employeeName}</Text>
                                <Text style={styles.calloutSubtitle}>ID: {record.employeeId}</Text>
                                <View style={styles.calloutDivider} />
                                <Text style={styles.calloutLabel}>Check-In</Text>
                                <Text style={styles.calloutTime}>{record.checkInTime}</Text>
                                <Text style={styles.calloutCoords}>
                                    📍 {record.location.latitude.toFixed(6)}, {record.location.longitude.toFixed(6)}
                                </Text>
                                {record.isLate && (
                                    <View style={styles.lateTag}>
                                        <Text style={styles.lateTagText}>Late by {record.lateMinutes} min</Text>
                                    </View>
                                )}
                            </View>
                        </Callout>
                    </Marker>
                );
            }

            // Check-out marker
            if (record.checkoutLocation && record.checkoutLocation.latitude && record.checkoutLocation.longitude) {
                markers.push(
                    <Marker
                        key={`checkout-${index}`}
                        coordinate={{
                            latitude: record.checkoutLocation.latitude,
                            longitude: record.checkoutLocation.longitude,
                        }}
                        pinColor={getMarkerColor('check-out')}
                    >
                        <View style={[styles.customMarker, { backgroundColor: '#F44336' }]}>
                            <Ionicons name="log-out" size={20} color="#FFF" />
                        </View>
                        <Callout style={styles.callout}>
                            <View style={styles.calloutContainer}>
                                <Text style={styles.calloutTitle}>{record.employeeName}</Text>
                                <Text style={styles.calloutSubtitle}>ID: {record.employeeId}</Text>
                                <View style={styles.calloutDivider} />
                                <Text style={styles.calloutLabel}>Check-Out</Text>
                                <Text style={styles.calloutTime}>{record.checkOutTime}</Text>
                                <Text style={styles.calloutCoords}>
                                    📍 {record.checkoutLocation.latitude.toFixed(6)}, {record.checkoutLocation.longitude.toFixed(6)}
                                </Text>
                                <Text style={styles.calloutWorkHours}>
                                    Work Hours: {record.workHours?.toFixed(1)} hrs
                                </Text>
                            </View>
                        </Callout>
                    </Marker>
                );
            }
        });

        return markers;
    };

    const handleDateChange = () => {
        Alert.alert(
            'Select Date',
            'Date picker functionality - integrate with a date picker library',
            [{ text: 'OK' }]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Location Map</Text>
                    <Text style={styles.headerSubtitle}>Employee Punch Locations</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setFilterModalVisible(true)}
                    style={styles.filterButton}
                >
                    <Ionicons name="filter" size={22} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            {/* Date Bar */}
            <View style={styles.dateBar}>
                <TouchableOpacity onPress={handleDateChange} style={styles.dateSelector}>
                    <Ionicons name="calendar" size={18} color="#00796B" />
                    <Text style={styles.dateText}>{selectedDate}</Text>
                    <Ionicons name="chevron-down" size={18} color="#00796B" />
                </TouchableOpacity>
            </View>

            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.statText}>Check-In</Text>
                </View>
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.statText}>Check-Out</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statCount}>{attendanceData.length} Records</Text>
                </View>
            </View>

            {/* Map */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loadingText}>Loading locations...</Text>
                </View>
            ) : attendanceData.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="location-outline" size={60} color="#BDC3C7" />
                    <Text style={styles.emptyText}>No location data for this date</Text>
                    <Text style={styles.emptySubtext}>
                        Employees need to punch in/out to track locations
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
                    showsScale={true}
                >
                    {renderMarkers()}
                </MapView>
            )}

            {/* Filter Modal */}
            <Modal
                visible={filterModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Locations</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#2C3E50" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Search Employee</Text>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#95A5A6" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Name or ID..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#95A5A6"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={() => {
                                    setFilterModalVisible(false);
                                    loadLocationData();
                                }}
                            >
                                <Text style={styles.applyButtonText}>Apply Filter</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => {
                                    setSearchQuery('');
                                    loadLocationData();
                                }}
                            >
                                <Text style={styles.clearButtonText}>Clear Filter</Text>
                            </TouchableOpacity>
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
    backButton: {
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
    dateBar: {
        backgroundColor: '#E0F2F1',
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateText: {
        fontWeight: '600',
        color: '#00796B',
        fontSize: 15,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statText: {
        fontSize: 13,
        color: '#2C3E50',
        fontWeight: '500',
    },
    statCount: {
        fontSize: 13,
        color: '#4A90E2',
        fontWeight: '600',
    },
    map: {
        flex: 1,
    },
    customMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        marginBottom: 2,
    },
    calloutSubtitle: {
        fontSize: 12,
        color: '#7F8C8D',
        marginBottom: 8,
    },
    calloutDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 8,
    },
    calloutLabel: {
        fontSize: 11,
        color: '#95A5A6',
        marginBottom: 2,
    },
    calloutTime: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 6,
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
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 20,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#2C3E50',
    },
    applyButton: {
        backgroundColor: '#4A90E2',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 12,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    clearButton: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7F8C8D',
    },
});
