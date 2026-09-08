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
import { db } from '../services/firebaseConfig';
import Colors from '../constants/Colors';

export default function EmploymentDetailsScreen({ navigation, route }) {
    const { user, updateProfile } = useAuth();
    const targetEmployee = route?.params?.targetEmployee;
    const isEditingOther = !!targetEmployee;
    const effectiveUser = targetEmployee || user;

    const [formData, setFormData] = useState({
        branchName: effectiveUser?.branchName || '',
        department: effectiveUser?.department || '',
        designation: effectiveUser?.designation || '',
        dateOfJoining: effectiveUser?.joinDate || '',
        employeeType: effectiveUser?.employeeType || '',
        employeeId: effectiveUser?.employeeId || '',
        pfNumber: effectiveUser?.pfNumber || '',
        esiNumber: effectiveUser?.esiNumber || '',
    });

    const [loading, setLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates = {
                branchName: formData.branchName,
                department: formData.department,
                designation: formData.designation,
                joinDate: formData.dateOfJoining,
                employeeType: formData.employeeType,
                pfNumber: formData.pfNumber,
                esiNumber: formData.esiNumber,
            };

            let success = false;
            let errorMsg = '';

            if (isEditingOther) {
                // Admin editing an employee
                const updatedDoc = { ...targetEmployee, ...updates, updatedAt: new Date().toISOString() };
                await db.collection('users').doc(targetEmployee.uid).set(updatedDoc);
                success = true;
            } else {
                // User editing self
                const result = await updateProfile(updates);
                success = result.success;
                errorMsg = result.error;
            }

            if (success) {
                Alert.alert('Success', 'Employment details updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', errorMsg || 'Failed to update details');
            }
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = user?.role === 'COMPANY_ADMIN';

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
                <Text style={styles.headerTitle}>Current Employment</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                    {/* Branch Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Branch Name</Text>
                        <TextInput
                            style={[styles.input, !isAdmin && styles.disabledInput]}
                            value={formData.branchName}
                            onChangeText={(value) => handleInputChange('branchName', value)}
                            placeholder="Enter branch name"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                        />
                    </View>

                    {/* Department */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Department</Text>
                        <TextInput
                            style={[styles.input, !isAdmin && styles.disabledInput]}
                            value={formData.department}
                            onChangeText={(value) => handleInputChange('department', value)}
                            placeholder="Web Developer"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                        />
                    </View>

                    {/* Designation */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Designation</Text>
                        <TextInput
                            style={[styles.input, !isAdmin && styles.disabledInput]}
                            value={formData.designation}
                            onChangeText={(value) => handleInputChange('designation', value)}
                            placeholder="Software Engineer"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                        />
                    </View>

                    {/* Date of Joining */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Joining</Text>
                        <TextInput
                            style={[styles.input, !isAdmin && styles.disabledInput]}
                            value={formData.dateOfJoining}
                            onChangeText={(value) => handleInputChange('dateOfJoining', value)}
                            placeholder="02/08/2025"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                        />
                    </View>

                    {/* Employee Type */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Employee Type</Text>
                        <TextInput
                            style={[styles.input, !isAdmin && styles.disabledInput]}
                            value={formData.employeeType}
                            onChangeText={(value) => handleInputChange('employeeType', value)}
                            placeholder="eg.Permanent"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                        />
                    </View>

                    {/* Employee ID */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Employee ID</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={formData.employeeId}
                            editable={false}
                            placeholder="Enter Unique ID eg. ABC11.."
                            placeholderTextColor="#95A5A6"
                        />
                    </View>

                    {/* PF A/C No. */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PF A/C No.</Text>
                        <TextInput
                            style={[styles.input, !isAdmin && styles.disabledInput]}
                            value={formData.pfNumber}
                            onChangeText={(value) => handleInputChange('pfNumber', value)}
                            placeholder="Enter PF No"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                        />
                    </View>

                    {/* ESI A/C No. */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>ESI A/C No.</Text>
                        <TextInput
                            style={[styles.input, !isAdmin && styles.disabledInput]}
                            value={formData.esiNumber}
                            onChangeText={(value) => handleInputChange('esiNumber', value)}
                            placeholder="Enter ESI No"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                        />
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Save Button - Only visible for Admin */}
            {isAdmin && (
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
            )}
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
    form: {
        backgroundColor: '#FFFFFF',
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#2C3E50',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    disabledInput: {
        backgroundColor: '#F0F0F0',
        color: '#7F8C8D',
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
