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

export default function BankDetailsScreen({ navigation }) {
    const { user, updateProfile } = useAuth();

    const [activeTab, setActiveTab] = useState('bank'); // 'bank' or 'upi'
    const [loading, setLoading] = useState(false);

    const [bankData, setBankData] = useState({
        accountHolderName: user?.bankDetails?.accountHolderName || user?.name || '',
        accountNumber: user?.bankDetails?.accountNumber || '',
        bankName: user?.bankDetails?.bankName || '',
        ifscCode: user?.bankDetails?.ifscCode || '',
    });

    const [upiData, setUpiData] = useState({
        upiId: user?.upiDetails?.upiId || '',
    });

    const handleBankInputChange = (field, value) => {
        setBankData(prev => ({ ...prev, [field]: value }));
    };

    const handleUpiInputChange = (field, value) => {
        setUpiData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updateData = {
                bankDetails: bankData,
                upiDetails: upiData,
            };

            const result = await updateProfile(updateData);
            if (result.success) {
                Alert.alert('Success', 'Bank details updated successfully', [
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
                <Text style={styles.headerTitle}>Bank Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'bank' && styles.tabActive]}
                        onPress={() => setActiveTab('bank')}
                    >
                        <Ionicons
                            name="card"
                            size={20}
                            color={activeTab === 'bank' ? '#37B46F' : '#7F8C8D'}
                        />
                        <Text style={[styles.tabText, activeTab === 'bank' && styles.tabTextActive]}>
                            Bank Details
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'upi' && styles.tabActive]}
                        onPress={() => setActiveTab('upi')}
                    >
                        <Ionicons
                            name="wallet"
                            size={20}
                            color={activeTab === 'upi' ? '#37B46F' : '#7F8C8D'}
                        />
                        <Text style={[styles.tabText, activeTab === 'upi' && styles.tabTextActive]}>
                            UPI ID
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Bank Details Form */}
                {activeTab === 'bank' && (
                    <View style={styles.form}>
                        {/* Account Holder's Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Account Holder's Name</Text>
                            <TextInput
                                style={styles.input}
                                value={bankData.accountHolderName}
                                onChangeText={(value) => handleBankInputChange('accountHolderName', value)}
                                placeholder="Aditya Vijay Jamdade"
                                placeholderTextColor="#95A5A6"
                            />
                        </View>

                        {/* Account Number */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Account Number<Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={bankData.accountNumber}
                                onChangeText={(value) => handleBankInputChange('accountNumber', value)}
                                placeholder="Enter Account Number"
                                placeholderTextColor="#95A5A6"
                                keyboardType="number-pad"
                            />
                        </View>

                        {/* Bank Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Bank Name<Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={bankData.bankName}
                                onChangeText={(value) => handleBankInputChange('bankName', value)}
                                placeholder="Enter Bank Name"
                                placeholderTextColor="#95A5A6"
                            />
                        </View>

                        {/* IFSC Code */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                IFSC Code<Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={bankData.ifscCode}
                                onChangeText={(value) => handleBankInputChange('ifscCode', value)}
                                placeholder="Enter IFSC Code"
                                placeholderTextColor="#95A5A6"
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>
                )}

                {/* UPI Details Form */}
                {activeTab === 'upi' && (
                    <View style={styles.form}>
                        {/* UPI ID */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                UPI ID<Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={upiData.upiId}
                                onChangeText={(value) => handleUpiInputChange('upiId', value)}
                                placeholder="yourname@upi"
                                placeholderTextColor="#95A5A6"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={20} color="#37B46F" />
                            <Text style={styles.infoText}>
                                Enter your UPI ID for salary payments and reimbursements
                            </Text>
                        </View>
                    </View>
                )}

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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        gap: 8,
    },
    tabActive: {
        borderColor: '#37B46F',
        backgroundColor: '#E8F5E9',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#7F8C8D',
    },
    tabTextActive: {
        color: '#37B46F',
        fontWeight: '600',
    },
    form: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        marginTop: 10,
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
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 8,
        gap: 12,
        marginTop: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#2C3E50',
        lineHeight: 18,
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
