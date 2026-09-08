import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebaseConfig';
import Colors, { gradients, shadows } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [companies, setCompanies] = useState([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmployeeId, setIsEmployeeId] = useState(true);
  const { login, loading } = useAuth();

  React.useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const snapshot = await db.collection('companies').getDocs();
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawSlug = data.slug ? String(data.slug).trim() : '';
        const finalSlug = rawSlug.length > 0 ? rawSlug : doc.id;

        return {
          id: doc.id,
          ...data,
          slug: finalSlug
        };
      }).filter(c => c.status === 'active');

      setCompanies(list);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleLogin = async () => {
    if (!identifier || !password || (isEmployeeId && !companySlug)) {
      Alert.alert('Error', isEmployeeId ? 'Please enter Company Slug, ID and Password' : 'Please enter Email and Password');
      return;
    }

    const result = await login(identifier.trim(), password, isEmployeeId ? companySlug : null);

    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  const toggleLoginType = () => {
    setIsEmployeeId(!isEmployeeId);
    setIdentifier('');
    setCompanySlug('');
    setSelectedCompanyName('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full Screen Gradient Background */}
      <LinearGradient
        colors={gradients.premium}
        style={styles.backgroundGradient}
      />

      <View style={styles.headerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="finger-print" size={50} color="#00d2ff" />
        </View>
        <Text style={styles.headerTitle}>SmartAttend</Text>
        <Text style={styles.headerSubtitle}>Enterprise Governance Console</Text>
      </View>

      <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Login Type Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isEmployeeId && styles.toggleButtonActive]}
              onPress={() => !isEmployeeId && toggleLoginType()}
            >
              <Ionicons
                name="id-card-outline"
                size={20}
                color={isEmployeeId ? '#FFF' : 'rgba(255,255,255,0.4)'}
              />
              <Text style={[styles.toggleText, isEmployeeId && styles.toggleTextActive]}>
                Employee ID
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, !isEmployeeId && styles.toggleButtonActive]}
              onPress={() => isEmployeeId && toggleLoginType()}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={!isEmployeeId ? '#FFF' : 'rgba(255,255,255,0.4)'}
              />
              <Text style={[styles.toggleText, !isEmployeeId && styles.toggleTextActive]}>
                Admin Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Identifier Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isEmployeeId ? 'Employee ID' : 'Email Address'}
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name={isEmployeeId ? "id-card" : "mail"}
                  size={20}
                  color="#00d2ff"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={isEmployeeId ? "Enter Employee ID" : "Email Address"}
                  placeholderTextColor="#A1A1A6"
                  value={identifier}
                  onChangeText={(text) => setIdentifier(isEmployeeId ? text.replace(/\s/g, '').toUpperCase() : text)}
                  autoCapitalize={isEmployeeId ? "characters" : "none"}
                  keyboardType={isEmployeeId ? "default" : "email-address"}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Company Slug Dropdown */}
            {isEmployeeId && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Organization</Text>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => {
                    fetchCompanies(); // Re-fetch to get latest slugs
                    setShowCompanyModal(true);
                  }}
                  disabled={loading}
                >
                  <Ionicons
                    name="business"
                    size={20}
                    color="#007AFF"
                    style={styles.inputIcon}
                  />
                  <Text style={[styles.input, { paddingVertical: 14, color: companySlug ? '#1C1C1E' : '#A1A1A6' }]}>
                    {selectedCompanyName || "Select Organization"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#AEAEB2" />
                </TouchableOpacity>
              </View>
            )}

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Security Key</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color="#00d2ff"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Password"
                  placeholderTextColor="#A1A1A6"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#8E8E93"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Info', 'Please contact HR to reset your password')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradients.aurora}
                style={styles.loginButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>AUTHENTICATE</Text>
                    <Ionicons name="shield-checkmark" size={20} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Removed public register link - registration is now an admin-only function */}
          </View>

          {/* Quick Login Info */}
          <View style={styles.infoCard}>
            <Ionicons name="shield-outline" size={20} color="#00d2ff" />
            <Text style={styles.infoText}>
              Secured Enterprise Login. Use your assigned credentials.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Company Selection Modal */}
      <Modal
        visible={showCompanyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompanyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Organization</Text>
              <TouchableOpacity onPress={() => setShowCompanyModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={companies}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.companyList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.companyItem}
                  onPress={() => {
                    setCompanySlug(item.slug);
                    setSelectedCompanyName(item.name);
                    setShowCompanyModal(false);
                  }}
                >
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyNameText}>{item.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  headerContent: {
    height: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 25,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#007AFF20',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1C1C1E',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6C6C70',
    marginTop: 5,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 15,
    padding: 5,
    marginBottom: 25,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#007AFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#1C1C1E',
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 15,
    overflow: 'hidden',
    height: 60,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 15,
    padding: 15,
    marginTop: 25,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    height: '70%',
    padding: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  companyNameText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  companySlugText: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
