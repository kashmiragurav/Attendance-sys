import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

export default function ShiftTimingsScreen({ navigation }) {
    const { user, updateProfile } = useAuth();

    const daysOfWeek = [
        { id: 'mon', label: 'Mon', required: true },
        { id: 'tue', label: 'Tue', required: true },
        { id: 'wed', label: 'Wed', required: true },
        { id: 'thu', label: 'Thu', required: true },
        { id: 'fri', label: 'Fri', required: true },
        { id: 'sat', label: 'Sat', required: true },
        { id: 'sun', label: 'Sun', required: true },
    ];

    const [workTimings, setWorkTimings] = useState({
        mon: { weekOff: false, shift: user?.workTimings?.mon?.shift || '09:00 AM - 05:00 PM' },
        tue: { weekOff: false, shift: user?.workTimings?.tue?.shift || '09:00 AM - 05:00 PM' },
        wed: { weekOff: false, shift: user?.workTimings?.wed?.shift || '09:00 AM - 05:00 PM' },
        thu: { weekOff: false, shift: user?.workTimings?.thu?.shift || '09:00 AM - 05:00 PM' },
        fri: { weekOff: false, shift: user?.workTimings?.fri?.shift || '09:00 AM - 05:00 PM' },
        sat: { weekOff: false, shift: user?.workTimings?.sat?.shift || '09:00 AM - 05:00 PM' },
        sun: { weekOff: true, shift: 'All Sundays Week Off' },
    });

    const [loading, setLoading] = useState(false);

    const toggleWeekOff = (day) => {
        setWorkTimings(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                weekOff: !prev[day].weekOff,
                shift: !prev[day].weekOff ? 'Week Off' : '09:00 AM - 05:00 PM',
            },
        }));
    };

    const handleShiftChange = (day, shift) => {
        setWorkTimings(prev => ({
            ...prev,
            [day]: { ...prev[day], shift },
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const result = await updateProfile({ workTimings });
            if (result.success) {
                Alert.alert('Success', 'Shift timings updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', result.error || 'Failed to update timings');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleAutomationRules = () => {
        Alert.alert('Coming Soon', 'Automation rules feature will be available soon');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Work Timings</Text>

                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Day</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Weekoff</Text>
                        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Shifts</Text>
                    </View>

                    {/* Table Rows */}
                    {daysOfWeek.map((day) => (
                        <View key={day.id} style={styles.tableRow}>
                            <View style={[styles.tableCell, { flex: 0.8 }]}>
                                <Text style={styles.dayText}>
                                    {day.label}
                                    {day.required && <Text style={styles.required}>*</Text>}
                                </Text>
                            </View>

                            <View style={[styles.tableCell, { flex: 1.2 }]}>
                                <TouchableOpacity
                                    style={styles.checkbox}
                                    onPress={() => toggleWeekOff(day.id)}
                                >
                                    <View style={[
                                        styles.checkboxInner,
                                        workTimings[day.id].weekOff && styles.checkboxChecked
                                    ]}>
                                        {workTimings[day.id].weekOff && (
                                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.tableCell, { flex: 2 }]}>
                                <TextInput
                                    style={[
                                        styles.shiftInput,
                                        workTimings[day.id].weekOff && styles.shiftInputDisabled
                                    ]}
                                    value={workTimings[day.id].shift}
                                    onChangeText={(value) => handleShiftChange(day.id, value)}
                                    editable={!workTimings[day.id].weekOff}
                                    placeholder="09:00 AM - 05:00 PM"
                                    placeholderTextColor="#BDC3C7"
                                />
                            </View>
                        </View>
                    ))}

                    {/* Automation Rules Button */}
                    <TouchableOpacity
                        style={styles.automationButton}
                        onPress={handleAutomationRules}
                    >
                        <Text style={styles.automationButtonText}>
                            Set Automation Rules<Text style={styles.required}>*</Text>
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="#37B46F" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={styles.saveButtonText}>
                        {loading ? 'SAVING...' : 'SAVE DETAILS'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: '#2C3E50',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: '#D5F4E6',
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 16,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#95A5A6',
    },
    tableHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tableCell: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2C3E50',
    },
    required: {
        color: '#E74C3C',
    },
    checkbox: {
        padding: 4,
    },
    checkboxInner: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#37B46F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#37B46F',
    },
    shiftInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: '#2C3E50',
        textAlign: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    shiftInputDisabled: {
        backgroundColor: '#ECF0F1',
        color: '#95A5A6',
    },
    automationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#37B46F',
    },
    automationButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#37B46F',
    },
    footer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    saveButton: {
        backgroundColor: '#37B46F',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
