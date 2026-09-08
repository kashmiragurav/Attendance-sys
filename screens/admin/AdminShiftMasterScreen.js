import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';

export default function AdminShiftMasterScreen({ navigation }) {
    const { user } = useAuth();
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        try {
            setLoading(true);
            // 1. Fetch all employees for this company
            const empSnapshot = await db.collection('users').where('companyId', '==', user.companyId);
            const allEmployees = empSnapshot.docs.map(doc => doc.data());

            // 2. Fetch real office settings
            const settingsDoc = await db.collection('office_settings').doc('settings_default').get();
            const settings = settingsDoc.exists ? settingsDoc.data() : { officeStartTime: '09:30', officeEndTime: '18:30' };

            // 3. Count employees per shift
            const counts = {
                'General Shift': allEmployees.filter(e => e.selectedShift === 'General Shift' || !e.selectedShift).length,
                'Morning Shift': allEmployees.filter(e => e.selectedShift === 'Morning Shift').length,
                'Night Shift': allEmployees.filter(e => e.selectedShift === 'Night Shift').length,
            };

            // 4. Create dynamic shifts list
            const activeShifts = [
                {
                    id: '1',
                    name: 'General Shift',
                    start: settings.officeStartTime.includes('AM') || settings.officeStartTime.includes('PM') ? settings.officeStartTime : `${settings.officeStartTime} AM`,
                    end: settings.officeEndTime.includes('AM') || settings.officeEndTime.includes('PM') ? settings.officeEndTime : `${settings.officeEndTime} PM`,
                    employees: counts['General Shift'],
                    color: '#4A90E2'
                },
                { id: '2', name: 'Morning Shift', start: '07:00 AM', end: '03:00 PM', employees: counts['Morning Shift'], color: '#2ECC71' },
                { id: '3', name: 'Night Shift', start: '10:00 PM', end: '06:00 AM', employees: counts['Night Shift'], color: '#9B59B6' },
            ];
            setShifts(activeShifts);
        } catch (error) {
            console.error('Error loading dynamic shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shift Management</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add-circle" size={28} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={20} color="#4A90E2" />
                    <Text style={styles.infoText}>
                        Configure office timings, grace periods and shift rotations for your organization.
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>Active Shifts</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 50 }} />
                ) : (
                    shifts.map(shift => (
                        <TouchableOpacity key={shift.id} style={styles.shiftCard}>
                            <View style={[styles.shiftIndicator, { backgroundColor: shift.color }]} />
                            <View style={styles.shiftInfo}>
                                <Text style={styles.shiftName}>{shift.name}</Text>
                                <View style={styles.timeRow}>
                                    <Ionicons name="time-outline" size={14} color="#7F8C8D" />
                                    <Text style={styles.shiftTime}>{shift.start} - {shift.end}</Text>
                                </View>
                            </View>
                            <View style={styles.employeeCount}>
                                <Text style={styles.countText}>{shift.employees}</Text>
                                <Text style={styles.countLabel}>Staff</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
                        </TouchableOpacity>
                    ))
                )}

                <View style={styles.bannerContainer}>
                    <LinearGradient
                        colors={['#6C5CE7', '#A29BFE']}
                        style={styles.premiumBanner}
                    >
                        <View style={styles.bannerTextContainer}>
                            <Text style={styles.bannerTitle}>Auto Rotation</Text>
                            <Text style={styles.bannerDesc}>Enable AI-based automatic shift allocation.</Text>
                        </View>
                        <View style={styles.bannerBadge}>
                            <Text style={styles.bannerBadgeText}>AI ACTIVE</Text>
                        </View>
                    </LinearGradient>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    addButton: {
        padding: 5,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#EBF5FF',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 25,
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        color: '#34495E',
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 15,
    },
    shiftCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    shiftIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: 15,
    },
    shiftInfo: {
        flex: 1,
    },
    shiftName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shiftTime: {
        fontSize: 13,
        color: '#7F8C8D',
        marginLeft: 5,
    },
    employeeCount: {
        alignItems: 'center',
        marginRight: 15,
        paddingHorizontal: 12,
        borderLeftWidth: 1,
        borderColor: '#ECF0F1',
    },
    countText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    countLabel: {
        fontSize: 10,
        color: '#BDC3C7',
        textTransform: 'uppercase',
    },
    bannerContainer: {
        marginTop: 20,
    },
    premiumBanner: {
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    bannerDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    bannerBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    bannerBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    }
});
