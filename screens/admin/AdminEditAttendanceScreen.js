import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from '../../components/PlatformMap';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';

export default function AdminEditAttendanceScreen({ route, navigation }) {
    const { user: currentUser } = useAuth();
    const { record, employee } = route.params;

    // Fallback if record doesn't exist (e.g., adding for an absent day)
    const initialStatus = record?.status || 'absent';
    const initialCheckIn = record?.checkInTime || '09:00';
    const initialCheckOut = record?.checkOutTime || '18:00';

    const [status, setStatus] = useState(initialStatus);
    const [checkIn, setCheckIn] = useState(initialCheckIn);
    const [checkOut, setCheckOut] = useState(initialCheckOut);
    const [loading, setLoading] = useState(false);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locationTitle, setLocationTitle] = useState('');

    const handleSave = async () => {
        try {
            setLoading(true);

            // Basic time validation (HH:MM)
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            const isNoTimeStatus = status === 'absent' || status === 'paid_leave';

            if (!isNoTimeStatus && (!timeRegex.test(checkIn) || !timeRegex.test(checkOut))) {
                Alert.alert('Error', 'Please enter valid times in HH:MM format');
                return;
            }

            // Calculate work hours
            let workHours = 0;
            const isWorkingStatus = status !== 'absent' && status !== 'paid_leave';
            if (isWorkingStatus) {
                const [inH, inM] = checkIn.split(':').map(Number);
                const [outH, outM] = checkOut.split(':').map(Number);
                const totalInM = inH * 60 + inM;
                const totalOutM = outH * 60 + outM;
                workHours = Math.max(0, (totalOutM - totalInM) / 60);
            }

            const attendanceDate = record?.date || route.params.date;
            const docId = record?.id || `att_${employee.uid}_${attendanceDate}`;

            const updatedData = {
                status,
                checkInTime: isNoTimeStatus ? '' : checkIn,
                checkOutTime: isNoTimeStatus ? '' : checkOut,
                workHours: isNoTimeStatus ? 0 : workHours,
                updatedAt: new Date().toISOString(),
                // Ensure core fields exist if creating new
                userId: employee.uid,
                employeeId: employee.employeeId,
                employeeName: employee.name,
                companyId: employee.companyId,
                date: attendanceDate,
            };

            await db.collection('attendance').doc(docId).set(updatedData);

            Alert.alert('Success', 'Attendance updated successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Error saving attendance:', error);
            Alert.alert('Error', 'Failed to save attendance');
        } finally {
            setLoading(false);
        }
    };

    const StatusOption = ({ label, value, activeColor }) => (
        <TouchableOpacity
            style={[
                styles.statusOption,
                status === value && { backgroundColor: activeColor, borderColor: activeColor }
            ]}
            onPress={() => setStatus(value)}
        >
            <Text style={[styles.statusOptionText, status === value && { color: '#FFF' }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={['#1a2a6c', '#b21f1f']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Update Attendance</Text>
                <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.employeeInfo}>
                    <Text style={styles.empName}>{employee.name}</Text>
                    <Text style={styles.empDate}>Editing for: {record?.date || route.params.date}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Attendance Status</Text>
                    <View style={styles.statusGrid}>
                        <StatusOption label="Present" value="present" activeColor="#2ECC71" />
                        <StatusOption label="Late" value="late" activeColor="#F39C12" />
                        <StatusOption label="Half Day" value="half_day" activeColor="#9B59B6" />
                        <StatusOption label="Absent" value="absent" activeColor="#E74C3C" />
                        {/* Only Company Admin or Admin can set Paid Leave */}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                            <StatusOption label="Paid Leave" value="paid_leave" activeColor="#4A90E2" />
                        )}
                    </View>
                </View>

                {(status !== 'absent' && status !== 'paid_leave') && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Time Details (24hr Format HH:MM)</Text>
                        <View style={styles.timeRow}>
                            <View style={styles.timeInputBox}>
                                <Text style={styles.inputLabel}>Check In</Text>
                                <TextInput
                                    style={styles.input}
                                    value={checkIn}
                                    onChangeText={setCheckIn}
                                    placeholder="09:00"
                                    keyboardType="name-phone-pad"
                                />
                            </View>
                            <View style={styles.timeInputBox}>
                                <Text style={styles.inputLabel}>Check Out</Text>
                                <TextInput
                                    style={styles.input}
                                    value={checkOut}
                                    onChangeText={setCheckOut}
                                    placeholder="18:00"
                                    keyboardType="name-phone-pad"
                                />
                            </View>
                        </View>
                    </View>
                )}

                {(record?.checkInImage || record?.checkOutImage) && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Biometric Verification Photos</Text>
                        <View style={styles.imageRow}>
                            {record?.checkInImage && (
                                <View style={styles.imageBox}>
                                    <Text style={styles.imageCaption}>Punch In Photo</Text>
                                    <Image
                                        source={{ uri: record.checkInImage }}
                                        style={styles.punchImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            )}
                            {record?.checkOutImage && (
                                <View style={styles.imageBox}>
                                    <Text style={styles.imageCaption}>Punch Out Photo</Text>
                                    <Image
                                        source={{ uri: record.checkOutImage }}
                                        style={styles.punchImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Location Information - Always Show */}
                <View style={styles.section}>
                    <Text style={styles.label}>📍 Location Information</Text>

                    {!record?.location && !record?.checkoutLocation && (
                        <View style={styles.noLocationCard}>
                            <Ionicons name="location-outline" size={40} color="#95A5A6" />
                            <Text style={styles.noLocationText}>No location data captured</Text>
                            <Text style={styles.noLocationSubtext}>
                                Location tracking was not enabled during punch in/out
                            </Text>
                        </View>
                    )}

                    {record?.location && (
                        <View style={styles.locationCard}>
                            <View style={styles.locationHeader}>
                                <Ionicons name="location" size={20} color="#2ECC71" />
                                <Text style={styles.locationTitle}>Check-In Location</Text>
                            </View>
                            <View style={styles.locationDetails}>
                                {record.location.address ? (
                                    <>
                                        <Text style={styles.locationAddress}>
                                            📍 {record.location.address}
                                        </Text>
                                        <Text style={styles.locationCoords}>
                                            {record.location.latitude?.toFixed(6)}, {record.location.longitude?.toFixed(6)}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.locationText}>
                                            📌 Lat: {record.location.latitude?.toFixed(6)}
                                        </Text>
                                        <Text style={styles.locationText}>
                                            📌 Long: {record.location.longitude?.toFixed(6)}
                                        </Text>
                                    </>
                                )}
                                {record.location.accuracy && (
                                    <Text style={styles.locationAccuracy}>
                                        Accuracy: ±{Math.round(record.location.accuracy)}m
                                    </Text>
                                )}
                                {record.location.timestamp && (
                                    <Text style={styles.locationTime}>
                                        {new Date(record.location.timestamp).toLocaleString()}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.mapButton}
                                onPress={() => {
                                    setSelectedLocation(record.location);
                                    setLocationTitle('Check-In Location');
                                    setMapModalVisible(true);
                                }}
                            >
                                <Ionicons name="map-outline" size={16} color="#4A90E2" />
                                <Text style={styles.mapButtonText}>View on Map</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {record?.checkoutLocation && (
                        <View style={[styles.locationCard, { marginTop: 15 }]}>
                            <View style={styles.locationHeader}>
                                <Ionicons name="location" size={20} color="#E74C3C" />
                                <Text style={styles.locationTitle}>Check-Out Location</Text>
                            </View>
                            <View style={styles.locationDetails}>
                                {record.checkoutLocation.address ? (
                                    <>
                                        <Text style={styles.locationAddress}>
                                            📍 {record.checkoutLocation.address}
                                        </Text>
                                        <Text style={styles.locationCoords}>
                                            {record.checkoutLocation.latitude?.toFixed(6)}, {record.checkoutLocation.longitude?.toFixed(6)}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.locationText}>
                                            📌 Lat: {record.checkoutLocation.latitude?.toFixed(6)}
                                        </Text>
                                        <Text style={styles.locationText}>
                                            📌 Long: {record.checkoutLocation.longitude?.toFixed(6)}
                                        </Text>
                                    </>
                                )}
                                {record.checkoutLocation.accuracy && (
                                    <Text style={styles.locationAccuracy}>
                                        Accuracy: ±{Math.round(record.checkoutLocation.accuracy)}m
                                    </Text>
                                )}
                                {record.checkoutLocation.timestamp && (
                                    <Text style={styles.locationTime}>
                                        {new Date(record.checkoutLocation.timestamp).toLocaleString()}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.mapButton}
                                onPress={() => {
                                    setSelectedLocation(record.checkoutLocation);
                                    setLocationTitle('Check-Out Location');
                                    setMapModalVisible(true);
                                }}
                            >
                                <Ionicons name="map-outline" size={16} color="#4A90E2" />
                                <Text style={styles.mapButtonText}>View on Map</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.disabledBtn]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Text style={styles.saveButtonText}>SAVE UPDATE</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#7F8C8D" />
                    <Text style={styles.infoText}>
                        Manual updates will be logged. Ensure correct times are entered for accurate work hour calculations.
                    </Text>
                </View>
            </ScrollView>

            {/* Map Modal */}
            <Modal
                visible={mapModalVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setMapModalVisible(false)}
            >
                <View style={styles.mapModalContainer}>
                    <View style={styles.mapModalHeader}>
                        <TouchableOpacity onPress={() => setMapModalVisible(false)} style={styles.mapCloseButton}>
                            <Ionicons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.mapModalTitle}>{locationTitle}</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {selectedLocation && (
                        <MapView
                            style={styles.fullMap}
                            initialRegion={{
                                latitude: selectedLocation.latitude,
                                longitude: selectedLocation.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }}
                            showsUserLocation={false}
                            showsMyLocationButton={true}
                        >
                            <Marker
                                coordinate={{
                                    latitude: selectedLocation.latitude,
                                    longitude: selectedLocation.longitude,
                                }}
                                title={locationTitle}
                                description={`${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                            >
                                <View style={styles.markerContainer}>
                                    <Ionicons
                                        name={locationTitle.includes('Check-In') ? 'log-in' : 'log-out'}
                                        size={30}
                                        color={locationTitle.includes('Check-In') ? '#2ECC71' : '#E74C3C'}
                                    />
                                </View>
                            </Marker>
                        </MapView>
                    )}

                    <View style={styles.mapInfoCard}>
                        <Text style={styles.mapInfoTitle}>{employee.name}</Text>
                        <Text style={styles.mapInfoDate}>{record?.date}</Text>
                        {selectedLocation && (
                            <>
                                <View style={styles.mapInfoRow}>
                                    <Text style={styles.mapInfoLabel}>Latitude:</Text>
                                    <Text style={styles.mapInfoValue}>{selectedLocation.latitude.toFixed(6)}</Text>
                                </View>
                                <View style={styles.mapInfoRow}>
                                    <Text style={styles.mapInfoLabel}>Longitude:</Text>
                                    <Text style={styles.mapInfoValue}>{selectedLocation.longitude.toFixed(6)}</Text>
                                </View>
                                {selectedLocation.accuracy && (
                                    <View style={styles.mapInfoRow}>
                                        <Text style={styles.mapInfoLabel}>Accuracy:</Text>
                                        <Text style={styles.mapInfoValue}>±{Math.round(selectedLocation.accuracy)}m</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { padding: 5 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1, padding: 20 },
    employeeInfo: { marginBottom: 25, backgroundColor: '#FFF', padding: 15, borderRadius: 12, elevation: 2 },
    empName: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
    empDate: { fontSize: 14, color: '#7F8C8D', marginTop: 4 },
    section: { marginBottom: 25 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#34495E', marginBottom: 15 },
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statusOption: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#FFF', minWidth: '45%' },
    statusOptionText: { textAlign: 'center', fontWeight: 'bold', color: '#7F8C8D' },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeInputBox: { width: '48%' },
    inputLabel: { fontSize: 12, color: '#7F8C8D', marginBottom: 5, marginLeft: 5 },
    input: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#DDD', fontSize: 16, color: '#2C3E50', fontWeight: 'bold' },
    saveButton: { backgroundColor: '#2CC771', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3 },
    disabledBtn: { opacity: 0.7 },
    saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    infoBox: { flexDirection: 'row', marginTop: 30, padding: 15, backgroundColor: '#EBF5FB', borderRadius: 10, gap: 10 },
    infoText: { flex: 1, fontSize: 12, color: '#5D6D7E', lineHeight: 18 },
    imageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    imageBox: { flex: 1, alignItems: 'center', backgroundColor: '#F0F3F4', padding: 5, borderRadius: 12, overflow: 'hidden' },
    imageCaption: { fontSize: 10, fontWeight: 'bold', color: '#7F8C8D', marginVertical: 8, textTransform: 'uppercase' },
    punchImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#000' },

    // Location styles
    noLocationCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    noLocationText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7F8C8D',
        marginTop: 12,
    },
    noLocationSubtext: {
        fontSize: 13,
        color: '#95A5A6',
        marginTop: 6,
        textAlign: 'center',
    },
    locationCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#4A90E2'
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8
    },
    locationTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2C3E50'
    },
    locationDetails: {
        marginLeft: 28,
        gap: 6
    },
    locationText: {
        fontSize: 13,
        color: '#34495E',
        fontFamily: 'monospace'
    },
    locationAddress: {
        fontSize: 14,
        color: '#2C3E50',
        fontWeight: '600',
        marginBottom: 6,
        lineHeight: 20,
    },
    locationCoords: {
        fontSize: 11,
        color: '#95A5A6',
        fontFamily: 'monospace',
        marginBottom: 6,
    },
    locationAccuracy: {
        fontSize: 11,
        color: '#7F8C8D',
        fontStyle: 'italic',
        marginTop: 4
    },
    locationTime: {
        fontSize: 11,
        color: '#95A5A6',
        marginTop: 4
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EBF5FF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 12,
        gap: 6
    },
    mapButtonText: {
        color: '#4A90E2',
        fontSize: 13,
        fontWeight: '600'
    },

    // Map Modal Styles
    mapModalContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    mapModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: '#1a2a6c',
    },
    mapCloseButton: {
        padding: 5,
    },
    mapModalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    fullMap: {
        flex: 1,
    },
    markerContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#4A90E2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    mapInfoCard: {
        backgroundColor: '#FFF',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    mapInfoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 4,
    },
    mapInfoDate: {
        fontSize: 14,
        color: '#7F8C8D',
        marginBottom: 15,
    },
    mapInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    mapInfoLabel: {
        fontSize: 14,
        color: '#7F8C8D',
    },
    mapInfoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        fontFamily: 'monospace',
    },
});
