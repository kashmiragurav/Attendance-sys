import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors, { gradients, shadows } from '../constants/Colors';
import BottomNavigation from '../components/BottomNavigation';

export default function AccountScreen({ navigation }) {
    const { user, logout } = useAuth();

    const menuItems = [
        {
            id: 'profile',
            title: 'Profile Details',
            icon: 'person-outline',
            iconColor: '#4A90E2',
            screen: 'ProfileDetails',
        },
        {
            id: 'attendance',
            title: 'View Attendance',
            icon: 'calendar-outline',
            iconColor: '#4A90E2',
            screen: 'AttendanceHistory',
        },
        {
            id: 'work-report',
            title: 'Work Report',
            icon: 'document-text-outline',
            iconColor: '#4A90E2',
            screen: null,
        },
        {
            id: 'logout',
            title: 'Logout',
            icon: 'log-out-outline',
            iconColor: '#FF3B30',
            screen: null,
        },
    ];

    const handleMenuPress = (item) => {
        if (item.id === 'logout') {
            Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
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
            return;
        }

        if (item.screen) {
            navigation.navigate(item.screen);
        } else {
            // Coming soon alert
            alert('Coming Soon', `${item.title} feature will be available soon`);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Account Settings</Text>
                    <TouchableOpacity style={styles.headerBtn}>
                        <Ionicons name="settings-outline" size={22} color="#1C1C1E" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.profileSection}>
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
                        <View style={styles.statusBadge}>
                            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                        </View>
                    </View>
                    <View style={styles.nameContainer}>
                        <Text style={styles.userName}>{user?.name || 'User Name'}</Text>
                        {user?.faceRegistered && (
                            <Ionicons name="checkmark-circle" size={18} color="#4A90E2" />
                        )}
                    </View>
                    <Text style={styles.userBranch}>{user?.branchName || 'Governance Unit'}</Text>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                index === menuItems.length - 1 && styles.menuItemLast,
                            ]}
                            onPress={() => handleMenuPress(item)}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}20` }]}>
                                    <Ionicons name={item.icon} size={24} color={item.iconColor} />
                                </View>
                                <Text style={styles.menuItemText}>{item.title}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <BottomNavigation />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 15,
        paddingHorizontal: 25,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F2F2F7',
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
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
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
    statusBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 2,
        ...shadows.small,
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userBranch: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
        marginTop: 4,
    },
    menuContainer: {
        backgroundColor: '#FFFFFF',
        marginTop: 10,
        paddingHorizontal: 25,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
    }
});
