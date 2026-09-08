import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
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
import { db } from '../../services/firebaseConfig';

export default function AdminEmployeeDetailScreen({ route, navigation }) {
    const { employee } = route.params;
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleDeactivate = () => {
        Alert.alert(
            'Confirm Status Change',
            `Are you sure you want to ${employee.isActive ? 'deactivate' : 'activate'} ${employee.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: employee.isActive ? 'Deactivate' : 'Activate',
                    style: employee.isActive ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            await db.collection('users').doc(employee.uid).update({
                                isActive: !employee.isActive,
                                updatedAt: new Date().toISOString()
                            });
                            Alert.alert('Success', `Employee ${employee.isActive ? 'deactivated' : 'activated'} successfully`);
                            navigation.goBack();
                        } catch (error) {
                            console.error('Update status error:', error);
                            Alert.alert('Error', 'Failed to update status');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Employee',
            `Are you sure you want to permanently delete ${employee.name}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await db.collection('users').doc(employee.uid).delete();
                            if (result.success) {
                                Alert.alert('Deleted', 'Employee has been removed successfully');
                                navigation.goBack();
                            } else {
                                throw new Error(result.error);
                            }
                        } catch (error) {
                            console.error('Delete employee error:', error);
                            Alert.alert('Error', 'Failed to delete employee');
                        }
                    },
                },
            ]
        );
    };

    const handleResetFace = () => {
        Alert.alert(
            'Reset Face Data',
            `Are you sure you want to delete the face registration for ${employee.name}? They will need to re-register their face.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.collection('users').doc(employee.uid).update({
                                faceRegistered: false,
                                faceEmbedding: '',
                                updatedAt: new Date().toISOString()
                            });
                            Alert.alert('Success', 'Face data cleared');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reset face data');
                        }
                    },
                },
            ]
        );
    };

    const handleResetDevice = () => {
        Alert.alert(
            'Reset Device Binding',
            `Are you sure you want to clear the registered device for ${employee.name}? They will be able to bind a new device on their next scan.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Device',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await db.collection('users').doc(employee.uid).update({
                                deviceId: '',
                                updatedAt: new Date().toISOString()
                            });
                            Alert.alert('Success', 'Device binding has been cleared.');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reset device binding');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {employee.profilePhoto ? (
                            <Image source={{ uri: employee.profilePhoto }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person" size={50} color="#1a2a6c" />
                        )}
                    </View>
                    <Text style={styles.profileName}>{employee.name}</Text>
                    <Text style={styles.profileEmail}>{employee.email}</Text>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Badge */}
                <View style={styles.statusSection}>
                    <View style={[styles.statusBadge, { backgroundColor: employee.isActive ? '#E8F5E9' : '#FFEBEE' }]}>
                        <View style={[styles.statusDot, { backgroundColor: employee.isActive ? '#4CAF50' : '#F44336' }]} />
                        <Text style={[styles.statusTag, { color: employee.isActive ? '#2E7D32' : '#C62828' }]}>
                            {employee.isActive ? 'Active Employee' : 'Inactive Employee'}
                        </Text>
                    </View>
                </View>

                {/* Security Credentials */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security Credentials</Text>
                    <View style={styles.card}>
                        <InfoRow
                            icon="mail"
                            label="Login Email"
                            value={employee.email}
                        />

                        {/* Password with Show/Hide Toggle */}
                        <View style={styles.infoRow}>
                            <View style={styles.infoLeft}>
                                <Ionicons name="key" size={20} color="#7F8C8D" />
                                <Text style={styles.infoLabel}>Password</Text>
                            </View>
                            <View style={styles.passwordRight}>
                                <Text style={styles.infoValue}>
                                    {(employee.plainPassword || employee.password)
                                        ? (showPassword ? (employee.plainPassword || employee.password) : '••••••••')
                                        : '•••••• (Hashed)'}
                                </Text>
                                {(employee.plainPassword || employee.password) && (
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off" : "eye"}
                                            size={20}
                                            color="#3498DB"
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <Text style={styles.securityHint}>
                            {(employee.plainPassword || employee.password)
                                ? (showPassword
                                    ? "⚠️ Password is now visible. Tap the eye icon to hide it."
                                    : "👁️ Tap the eye icon to view the actual password.")
                                : "Note: Only hashed password exists for this old account."}
                        </Text>
                    </View>
                </View>

                {/* Device & Hardware */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hardware & Biometrics</Text>
                    <View style={styles.card}>
                        <InfoRow
                            icon="phone-portrait"
                            label="Bound Device"
                            value={employee.deviceId ? employee.deviceId.substring(0, 15) + '...' : 'Not Linked'}
                        />
                        <InfoRow
                            icon="scan"
                            label="Face Data"
                            value={employee.faceRegistered ? 'Registered' : 'Not Registered'}
                        />
                    </View>
                </View>

                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Employee Identity</Text>
                    <View style={styles.card}>
                        <InfoRow icon="id-card" label="Employee ID" value={employee.employeeId} />
                        <InfoRow icon="business" label="Branch" value={employee.branchName || 'Nagpur Main'} />
                        <InfoRow icon="layers" label="Department" value={employee.department || 'General'} />
                        <InfoRow icon="briefcase" label="Designation" value={employee.designation || 'Staff'} />
                    </View>
                </View>

                {/* Contact Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Details</Text>
                    <View style={styles.card}>
                        <InfoRow icon="call" label="Phone" value={employee.phone || 'N/A'} />
                        <InfoRow icon="mail" label="Email" value={employee.email} />
                        <InfoRow icon="calendar" label="Joined On" value={employee.joinDate || 'N/A'} />
                    </View>
                </View>

                {/* Control Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Administrative Controls</Text>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('AdminEmployeeHistory', { employee })}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#4A90E2" />
                        <Text style={styles.actionButtonText}>View Full Attendance Calendar</Text>
                        <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('AdminEmployeeLocationHistory', { employee })}
                    >
                        <Ionicons name="map-outline" size={20} color="#9B59B6" />
                        <Text style={styles.actionButtonText}>View Location History on Map</Text>
                        <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('EmploymentDetails', { targetEmployee: employee })}
                    >
                        <Ionicons name="briefcase-outline" size={20} color="#16a085" />
                        <Text style={styles.actionButtonText}>Edit Employment Profile</Text>
                        <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleResetDevice}
                    >
                        <Ionicons name="phone-portrait-outline" size={20} color="#E67E22" />
                        <Text style={styles.actionButtonText}>Reset Device Binding</Text>
                        <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleResetFace}
                    >
                        <Ionicons name="scan-outline" size={20} color="#F39C12" />
                        <Text style={styles.actionButtonText}>Reset Face Scanning Data</Text>
                        <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
                    </TouchableOpacity>


                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowPasswordModal(true)}
                    >
                        <Ionicons name="key-outline" size={20} color="#9B59B6" />
                        <Text style={styles.actionButtonText}>Change Login Password</Text>
                        <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, employee.isActive ? styles.deactivateBtn : styles.activateBtn]}
                        onPress={handleDeactivate}
                    >
                        <Ionicons
                            name={employee.isActive ? "person-remove-outline" : "person-add-outline"}
                            size={20}
                            color={employee.isActive ? "#E74C3C" : "#2ECC71"}
                        />
                        <Text style={[styles.actionButtonText, { color: employee.isActive ? "#E74C3C" : "#2ECC71" }]}>
                            {employee.isActive ? 'Deactivate Employee' : 'Activate Employee'}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={employee.isActive ? "#E74C3C" : "#2ECC71"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { marginTop: 20, borderColor: '#FFEBEE', borderWidth: 1 }]}
                        onPress={handleDelete}
                    >
                        <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                        <Text style={[styles.actionButtonText, { color: '#E74C3C', fontWeight: 'bold' }]}>
                            Delete Employee Profile
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>

            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Set New Password</Text>
                        <Text style={styles.modalSubtitle}>For: {employee.name}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            autoFocus={true}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setNewPassword('');
                                }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.updateBtn]}
                                onPress={async () => {
                                    if (!newPassword || newPassword.length < 4) {
                                        Alert.alert('Error', 'Minimum 4 characters required');
                                        return;
                                    }
                                    try {
                                        const simpleHash = (password) => {
                                            let hash = 0;
                                            for (let i = 0; i < password.length; i++) {
                                                const char = password.charCodeAt(i);
                                                hash = ((hash << 5) - hash) + char;
                                                hash = hash & hash;
                                            }
                                            return hash.toString(36);
                                        };
                                        const passwordHash = simpleHash(newPassword);
                                        await db.collection('users').doc(employee.uid).update({
                                            passwordHash,
                                            plainPassword: newPassword,
                                            updatedAt: new Date().toISOString()
                                        });
                                        Alert.alert('Success', 'Password updated and saved successfully.');
                                        setShowPasswordModal(false);
                                        setNewPassword('');
                                        navigation.goBack();
                                    } catch (error) {
                                        Alert.alert('Error', 'Update failed');
                                    }
                                }}
                            >
                                <Text style={styles.updateBtnText}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
            <Ionicons name={icon} size={20} color="#1a2a6c" />
            <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 40,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileHeader: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 10,
        overflow: 'hidden',
    },
    avatarImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    profileName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    content: {
        flex: 1,
    },
    statusSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusTag: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    section: {
        padding: 20,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 12,
        marginLeft: 5,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#95A5A6',
    },
    infoValue: {
        fontSize: 14,
        color: '#2C3E50',
        fontWeight: '600',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
    },
    actionButtonText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#2C3E50',
        marginLeft: 12,
    },
    deactivateBtn: {
        borderWidth: 1,
        borderColor: '#FFEBEE',
    },
    activateBtn: {
        borderWidth: 1,
        borderColor: '#E8F5E9',
    },
    securityHint: {
        fontSize: 11,
        color: '#7F8C8D',
        marginTop: 10,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    passwordRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    eyeButton: {
        padding: 5,
        borderRadius: 5,
        backgroundColor: '#EBF5FF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 25,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 5,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#7F8C8D',
        marginBottom: 20,
    },
    modalInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#DDD',
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
    },
    modalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    cancelBtn: {
        backgroundColor: '#EEE',
    },
    updateBtn: {
        backgroundColor: '#4A90E2',
    },
    cancelBtnText: {
        color: '#333',
        fontWeight: '600',
    },
    updateBtnText: {
        color: '#FFF',
        fontWeight: '600',
    },
});
