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

export default function PersonalDetailsScreen({ navigation }) {
    const { user, updateProfile } = useAuth();

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        dateOfBirth: user?.dateOfBirth || '',
        gender: user?.gender || '',
        maritalStatus: user?.maritalStatus || '',
        bloodGroup: user?.bloodGroup || '',
        guardianName: user?.guardianName || '',
        guardianNumber: user?.guardianNumber || '',
        emergencyContact: user?.emergencyContact || '',
    });

    const [loading, setLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const result = await updateProfile(formData);
            if (result.success) {
                Alert.alert('Success', 'Personal details updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', result.error || 'Failed to update details');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
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
                <Text style={styles.headerTitle}>Personal Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                    {/* Employee Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Employee Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(value) => handleInputChange('name', value)}
                            placeholder="Enter your name"
                            placeholderTextColor="#95A5A6"
                        />
                    </View>

                    {/* Email - Read Only */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: '#E9ECEF' }]}
                            value={formData.email}
                            editable={false}
                        />
                    </View>

                    {/* Mobile Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <View style={styles.phoneInput}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+91</Text>
                            </View>
                            <TextInput
                                style={styles.phoneNumberInput}
                                value={formData.phone}
                                onChangeText={(value) => handleInputChange('phone', value)}
                                placeholder="9022410301"
                                placeholderTextColor="#95A5A6"
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>
                    </View>

                    {/* Address */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.address}
                            onChangeText={(value) => handleInputChange('address', value)}
                            placeholder="Address"
                            placeholderTextColor="#95A5A6"
                            multiline
                        />
                    </View>

                    {/* Date of Birth */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.dateOfBirth}
                            onChangeText={(value) => handleInputChange('dateOfBirth', value)}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor="#95A5A6"
                        />
                    </View>

                    {/* Gender */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.pickerContainer}>
                            <TextInput
                                style={styles.input}
                                value={formData.gender}
                                onChangeText={(value) => handleInputChange('gender', value)}
                                placeholder="Select"
                                placeholderTextColor="#95A5A6"
                            />
                        </View>
                    </View>

                    {/* Marital Status */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Marital Status</Text>
                        <View style={styles.pickerContainer}>
                            <TextInput
                                style={styles.input}
                                value={formData.maritalStatus}
                                onChangeText={(value) => handleInputChange('maritalStatus', value)}
                                placeholder="Select"
                                placeholderTextColor="#95A5A6"
                            />
                        </View>
                    </View>

                    {/* Blood Group */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Group</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.bloodGroup}
                            onChangeText={(value) => handleInputChange('bloodGroup', value)}
                            placeholder="O+"
                            placeholderTextColor="#95A5A6"
                        />
                    </View>

                    {/* Guardian's Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Guardian's Name <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={formData.guardianName}
                            onChangeText={(value) => handleInputChange('guardianName', value)}
                            placeholder="Enter Guardian's Name"
                            placeholderTextColor="#95A5A6"
                        />
                    </View>

                    {/* Guardian's Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Guardian's Number<Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.phoneInput}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+91</Text>
                            </View>
                            <TextInput
                                style={styles.phoneNumberInput}
                                value={formData.guardianNumber}
                                onChangeText={(value) => handleInputChange('guardianNumber', value)}
                                placeholder="0000000000"
                                placeholderTextColor="#95A5A6"
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>
                    </View>

                    {/* Emergency Contact Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Emergency Contact Number <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.phoneInput}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+91</Text>
                            </View>
                            <TextInput
                                style={styles.phoneNumberInput}
                                value={formData.emergencyContact}
                                onChangeText={(value) => handleInputChange('emergencyContact', value)}
                                placeholder="0000000000"
                                placeholderTextColor="#95A5A6"
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>
                    </View>
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
    required: {
        color: '#E74C3C',
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
    phoneInput: {
        flexDirection: 'row',
        gap: 12,
    },
    countryCode: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    countryCodeText: {
        fontSize: 15,
        color: '#2C3E50',
        fontWeight: '500',
    },
    phoneNumberInput: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#2C3E50',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    pickerContainer: {
        // Container for picker-style inputs
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
