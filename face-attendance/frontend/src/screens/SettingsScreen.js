import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function SettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    faceLivenessCheck: true,
    darkMode: false,
    rememberMe: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load settings from AsyncStorage if needed
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Settings would be loaded from persistent storage
    // For now using default values
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: Strings.cancel,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              setLoading(true);
              await signOut(auth);
              // Navigation will be handled by AuthContext
            } catch (error) {
              Alert.alert(Strings.error, error.message);
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Data',
      'This will clear all local data. This action cannot be undone.',
      [
        {
          text: Strings.cancel,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => {
            // Handle data clearing
            Alert.alert(Strings.success, 'Local data cleared');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const SettingRow = ({ title, subtitle, value, onValueChange, isToggle = true }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {isToggle ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
          thumbColor={value ? Colors.primary : Colors.textTertiary}
        />
      ) : (
        <View style={styles.rightArrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* General Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>GENERAL</Text>
        <View style={styles.settingsGroup}>
          <SettingRow
            title="Notifications"
            subtitle="Receive attendance alerts"
            value={settings.notifications}
            onValueChange={(value) => handleSettingChange('notifications', value)}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Dark Mode"
            subtitle="Use dark theme"
            value={settings.darkMode}
            onValueChange={(value) => handleSettingChange('darkMode', value)}
          />
        </View>
      </View>

      {/* Security & Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>SECURITY & PRIVACY</Text>
        <View style={styles.settingsGroup}>
          <SettingRow
            title="Face Liveness Check"
            subtitle="Verify real person during scan"
            value={settings.faceLivenessCheck}
            onValueChange={(value) => handleSettingChange('faceLivenessCheck', value)}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Remember Me"
            subtitle="Keep me logged in"
            value={settings.rememberMe}
            onValueChange={(value) => handleSettingChange('rememberMe', value)}
          />
        </View>
      </View>

      {/* App Information */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>APP INFORMATION</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>App Version</Text>
              <Text style={styles.settingSubtitle}>Face Recognition Attendance v1.0.0</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Build</Text>
              <Text style={styles.settingSubtitle}>Build 2024.01.17</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Account ID</Text>
              <Text style={styles.settingSubtitle}>{user?.uid?.substring(0, 16)}...</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>DATA MANAGEMENT</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleClearData}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: Colors.warning }]}>
                Clear Local Data
              </Text>
              <Text style={styles.settingSubtitle}>Remove cached data</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.logoutButtonText}>{Strings.logout}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Face Recognition Attendance System</Text>
        <Text style={styles.footerSubtext}>© 2024 All rights reserved</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsGroup: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  rightArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 24,
    color: Colors.textTertiary,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.error,
    marginHorizontal: 0,
  },
  logoutButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
});
