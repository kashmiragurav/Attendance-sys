import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * A wrapper component that conditionally renders its children
 * based on whether a specific SaaS feature is enabled for the company.
 */
export const FeatureGate = ({ feature, children, fallback = null, showUpgradePrompt = false }) => {
    const { isFeatureEnabled, company } = useAuth();
    const enabled = isFeatureEnabled(feature);

    // Debug logging
    if (feature === 'wfh_mode') {
        console.log('GATE CHECK - WFH:', enabled, '| Overrides:', company?.featureOverrides);
    }

    if (enabled) {
        return <>{children}</>;
    }

    if (showUpgradePrompt) {
        return (
            <View style={styles.upgradeContainer}>
                <View style={styles.upgradeIcon}>
                    <Ionicons name="lock-closed" size={24} color="#F39C12" />
                </View>
                <Text style={styles.upgradeTitle}>Premium Feature</Text>
                <Text style={styles.upgradeText}>
                    The "{feature.replace(/_/g, ' ')}" feature is only available in higher plans.
                </Text>
                <TouchableOpacity style={styles.upgradeBtn}>
                    <Text style={styles.upgradeBtnText}>UPGRADE PLAN</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return fallback;
};

const styles = StyleSheet.create({
    upgradeContainer: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#F39C12',
        alignItems: 'center',
        marginVertical: 10,
    },
    upgradeIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F39C1220',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    upgradeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 5,
    },
    upgradeText: {
        fontSize: 14,
        color: '#7F8C8D',
        textAlign: 'center',
        marginBottom: 15,
    },
    upgradeBtn: {
        backgroundColor: '#F39C12',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    upgradeBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    }
});
