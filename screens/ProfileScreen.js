import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors, { shadows } from '../constants/Colors';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Are you sure you want to logout?',
            '',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('ProfileDetails')}
                >
                    <Ionicons name="create-outline" size={20} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Brief Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatar}>
                            {user?.profilePhoto ? (
                                <Image
                                    source={{ uri: user.profilePhoto }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                                </Text>
                            )}
                        </View>
                        <View style={styles.activeDot} />
                    </View>
                    <View style={styles.nameContainer}>
                        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                        {user?.faceRegistered && (
                            <Ionicons name="checkmark-circle" size={20} color="#007AFF" style={styles.verifiedIcon} />
                        )}
                    </View>
                    <Text style={styles.profileEmail}>{user?.email}</Text>
                </View>

                {/* Face Registration Card */}
                <View style={styles.cardSection}>
                    <TouchableOpacity
                        style={[styles.securityCard, { borderColor: user?.faceRegistered ? '#E1F5FE' : '#FFF3E0' }]}
                        onPress={() => navigation.navigate('FaceRegistration')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: user?.faceRegistered ? '#E1F5FE' : '#FFF3E0' }]}>
                            <Ionicons
                                name="scan-outline"
                                size={28}
                                color={user?.faceRegistered ? '#0288D1' : '#F57C00'}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Face Registration</Text>
                            <Text style={styles.cardStatus}>
                                {user?.faceRegistered ? 'Status: Registered' : 'Action Required: Register Face'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#AEAEB2" />
                    </TouchableOpacity>
                </View>

                {/* Information Sections */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Personal Information</Text>
                    <View style={styles.detailsCard}>
                        <InfoRow icon="id-card-outline" label="Employee ID" value={user?.employeeId} />
                        <InfoRow icon="call-outline" label="Phone" value={user?.phone || 'Not provided'} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Shift & Work</Text>
                    <View style={styles.detailsCard}>
                        <InfoRow icon="business-outline" label="Department" value={user?.department || 'Operations'} />
                        <InfoRow icon="briefcase-outline" label="Designation" value={user?.designation || 'Staff'} />
                        <InfoRow icon="calendar-outline" label="Joined On" value={user?.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'} />
                    </View>
                </View>

                {/* Logout Action */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
                    <Text style={styles.logoutLabel}>Logout Session</Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
            <View style={styles.miniIconBox}>
                <Ionicons name={icon} size={18} color="#4A90E2" />
            </View>
            <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 15,
        paddingHorizontal: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    editBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E1F5FE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 35,
        backgroundColor: '#F9F9FB',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 15,
        ...shadows.medium,
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 40,
        backgroundColor: '#4A90E2',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    activeDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#34C759',
        borderWidth: 4,
        borderColor: '#F9F9FB',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    verifiedIcon: {
        marginTop: 2,
    },
    profileEmail: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 4,
    },
    cardSection: {
        paddingHorizontal: 25,
        marginTop: 25,
    },
    securityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 15,
        borderWidth: 1.5,
        ...shadows.small,
    },
    iconBox: {
        width: 55,
        height: 55,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    cardStatus: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
        marginTop: 2,
    },
    section: {
        paddingHorizontal: 25,
        marginTop: 30,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#AEAEB2',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 5,
    },
    detailsCard: {
        backgroundColor: '#F9F9FB',
        borderRadius: 25,
        padding: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    miniIconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.small,
    },
    infoLabel: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        color: '#1C1C1E',
        fontWeight: '700',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 25,
        marginTop: 40,
        paddingVertical: 18,
        borderRadius: 20,
        backgroundColor: '#FFF1F1',
        gap: 10,
    },
    logoutLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FF3B30',
    },
});
