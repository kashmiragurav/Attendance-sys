import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Linking,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors, { shadows } from '../constants/Colors';

export default function ProfileDetailsScreen({ navigation }) {
    const { user } = useAuth();

    const profileSections = [
        {
            id: 'personal',
            title: 'Personal Details',
            icon: 'person',
            iconColor: '#37B46F',
            screen: 'PersonalDetails',
        },
        {
            id: 'employment',
            title: 'Current Employment',
            icon: 'briefcase',
            iconColor: '#37B46F',
            screen: 'EmploymentDetails',
        },
        {
            id: 'shift',
            title: 'Set Shift Timings',
            icon: 'time',
            iconColor: '#37B46F',
            screen: 'ShiftTimings',
        },
        {
            id: 'permission',
            title: 'User Permission',
            icon: 'shield-checkmark',
            iconColor: '#37B46F',
            value: user?.role || 'Employee',
        },
        {
            id: 'bank',
            title: 'Bank Details',
            icon: 'card',
            iconColor: '#37B46F',
            screen: 'BankDetails',
        },
        {
            id: 'documents',
            title: 'Documents',
            icon: 'document-text',
            iconColor: '#37B46F',
            screen: 'Documents',
        },
    ];

    const handleCall = () => {
        const phoneNumber = user?.phone || '';
        if (phoneNumber) {
            Linking.openURL(`tel:${phoneNumber}`);
        } else {
            Alert.alert('No Phone Number', 'Phone number not available');
        }
    };

    const handleWhatsApp = () => {
        const phoneNumber = user?.phone?.replace(/[^0-9]/g, '') || '';
        if (phoneNumber) {
            Linking.openURL(`whatsapp://send?phone=${phoneNumber}`);
        } else {
            Alert.alert('No Phone Number', 'Phone number not available');
        }
    };

    const handleLocation = () => {
        Alert.alert('Location', 'Location feature coming soon');
    };

    const handleSectionPress = (section) => {
        if (section.screen) {
            navigation.navigate(section.screen);
        } else if (!section.value) {
            Alert.alert('Coming Soon', `${section.title} feature will be available soon`);
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
                <Text style={styles.headerTitle}>{user?.name || 'User Profile'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
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
                        <TouchableOpacity
                            style={styles.editBadge}
                            onPress={() => navigation.navigate('ProfilePhoto')}
                        >
                            <Ionicons name="camera" size={20} color="#37B46F" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.nameContainer}>
                        <Text style={styles.profileName}>{user?.name || 'User Name'}</Text>
                        {user?.faceRegistered && (
                            <Ionicons name="checkmark-circle" size={18} color="#4A90E2" />
                        )}
                    </View>
                    <Text style={styles.profilePhone}>
                        +91 {user?.phone || '0000000000'}
                    </Text>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                            <View style={[styles.actionIcon, { backgroundColor: '#37B46F' }]}>
                                <Ionicons name="call" size={20} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
                            <View style={[styles.actionIcon, { backgroundColor: '#25D366' }]}>
                                <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleLocation}>
                            <View style={[styles.actionIcon, { backgroundColor: '#37B46F' }]}>
                                <Ionicons name="location" size={20} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Sections */}
                <View style={styles.sectionsContainer}>
                    {profileSections.map((section, index) => (
                        <TouchableOpacity
                            key={section.id}
                            style={[
                                styles.sectionItem,
                                index === profileSections.length - 1 && styles.sectionItemLast,
                            ]}
                            onPress={() => handleSectionPress(section)}
                        >
                            <View style={styles.sectionLeft}>
                                <View style={[styles.sectionIcon, { backgroundColor: `${section.iconColor}20` }]}>
                                    <Ionicons name={section.icon} size={24} color={section.iconColor} />
                                </View>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                            <View style={styles.sectionRight}>
                                {section.value && (
                                    <Text style={styles.sectionValue}>{section.value}</Text>
                                )}
                                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#FFFFFF',
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
    content: {
        flex: 1,
    },
    profileCard: {
        backgroundColor: '#F9F9FB',
        paddingVertical: 35,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
        ...shadows.medium,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 35,
        backgroundColor: '#4A90E2',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    editBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#FFFFFF',
        width: 34,
        height: 34,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.small,
    },
    profileName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    profilePhone: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
        marginBottom: 25,
    },
    quickActions: {
        flexDirection: 'row',
        gap: 20,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.small,
    },
    sectionsContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 25,
        marginTop: 20,
    },
    sectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    sectionItemLast: {
        borderBottomWidth: 0,
    },
    sectionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sectionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    sectionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionValue: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '600',
    },
});
