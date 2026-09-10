import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function BottomNavigation() {
    const navigation = useNavigation();
    const route = useRoute();

    const tabs = [
        {
            id: 'punch',
            label: 'Punch',
            icon: 'finger-print',
            screen: 'Dashboard',
            activeScreens: ['Dashboard', 'AttendanceScan', 'FaceScanVerification'],
        },
        {
            id: 'activity',
            label: 'Activity',
            icon: 'calendar',
            screen: 'AttendanceHistory',
            activeScreens: ['AttendanceHistory'],
        },
        {
            id: 'account',
            label: 'Account',
            icon: 'person',
            screen: 'Account',
            activeScreens: ['Account', 'ProfileDetails', 'PersonalDetails', 'EmploymentDetails', 'ShiftTimings', 'BankDetails', 'Documents', 'ProfilePhoto'],
        },
    ];

    const isTabActive = (tab) => {
        return tab.activeScreens.includes(route.name);
    };

    const handleTabPress = (tab) => {
        if (!isTabActive(tab)) {
            navigation.navigate(tab.screen);
        }
    };

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = isTabActive(tab);
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tab}
                        onPress={() => handleTabPress(tab)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={24}
                            color={isActive ? '#4A90E2' : '#95A5A6'}
                        />
                        <Text style={[styles.label, isActive && styles.labelActive]}>
                            {tab.label}
                        </Text>
                        {isActive && <View style={styles.indicator} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingTop: 8,
        paddingBottom: 25,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 10,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 12,
    },
    label: {
        fontSize: 11,
        color: '#8E8E93',
        marginTop: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    labelActive: {
        color: '#4A90E2',
    },
    indicator: {
        position: 'absolute',
        top: 0,
        width: 32,
        height: 3,
        backgroundColor: '#4A90E2',
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
    },
});
