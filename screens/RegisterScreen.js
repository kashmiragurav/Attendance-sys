import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors, { gradients, shadows } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebaseConfig';

// Simple validation functions
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateEmployeeId = (id) => /^EMP\d{3,}$/i.test(id);
const validatePhone = (phone) => /^[+]?[91]?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''));

export default function RegisterScreen({ navigation, route }) {
  const params = route.params || {};
  const { register, loading, user, getUserLimit } = useAuth();
  const [currentUserCount, setCurrentUserCount] = useState(0);

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    companyId: params.companyId || user?.companyId || 'comp_default',
    companyName: params.companyName || user?.companyName || 'Digisahyadri PVT LTD',
    branchName: '',
    password: '',
    confirmPassword: '',
  });
  const [companies, setCompanies] = useState([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const snapshot = await db.collection('companies').getDocs();
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(c => c.status === 'active');
      setCompanies(list);

      // Also fetch user count if admin
      if (user?.companyId) {
        const uSnap = await db.collection('users').where('companyId', '==', user.companyId);
        setCurrentUserCount(uSnap.docs.length);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.employeeId || !formData.name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill all required fields');
      return false;
    }

    if (!validateEmployeeId(formData.employeeId)) {
      Alert.alert('Error', 'Employee ID must be in format: EMP001, EMP002, etc.');
      return false;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    // Auto-assign admin role if Department is 'Admin' or 'HR'
    const role = ['admin', 'hr', 'administration'].includes(formData.department.toLowerCase()) ? 'admin' : 'employee';

    const result = await register({ ...formData, role });

    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    } else {
      Alert.alert(
        'Success',
        'Account created successfully! Please register your face for attendance.',
        [{
          text: 'OK',
          onPress: () => {
            // If admin is registering, clear form and stay on page
            if (user?.role === 'admin' || user?.role === 'COMPANY_ADMIN') {
              setFormData({
                employeeId: '',
                name: '',
                email: '',
                phone: '',
                department: '',
                designation: '',
                companyId: formData.companyId,
                companyName: formData.companyName,
                branchName: '',
                password: '',
                confirmPassword: '',
              });
            }
          }
        }]
      );
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { strength: 0, label: '', color: Colors.border };
    if (password.length < 6) return { strength: 33, label: 'Weak', color: Colors.error };
    if (password.length < 10) return { strength: 66, label: 'Medium', color: Colors.warning };
    return { strength: 100, label: 'Strong', color: Colors.success };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.headerSubtitle}>Register as new employee</Text>
          {(user?.role === 'admin' || user?.role === 'COMPANY_ADMIN') && user?.plan !== 'Enterprise' && (
            <View style={styles.slotBadge}>
              <Text style={styles.slotText}>
                {Math.max(0, getUserLimit() - currentUserCount)} Slots Left
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            {/* Employee ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee ID <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="id-card" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="EMP001"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.employeeId}
                  onChangeText={(text) => updateField('employeeId', text.replace(/\s/g, '').toUpperCase())}
                  autoCapitalize="characters"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.name}
                  onChangeText={(text) => updateField('name', text)}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="john.doe@company.com"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.email}
                  onChangeText={(text) => updateField('email', text.toLowerCase())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+91-9876543210"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.phone}
                  onChangeText={(text) => updateField('phone', text)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Department */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Engineering"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.department}
                  onChangeText={(text) => updateField('department', text)}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Company Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Name <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={[styles.inputContainer, (user?.role === 'admin' || user?.role === 'COMPANY_ADMIN') && { backgroundColor: '#F5F5F5' }]}
                onPress={() => !(user?.role === 'admin' || user?.role === 'COMPANY_ADMIN') && setShowCompanyModal(true)}
              >
                <Ionicons name="business-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.input, { paddingVertical: 14, color: (user?.role === 'admin' || user?.role === 'COMPANY_ADMIN') ? '#7F8C8D' : Colors.text }]}>
                  {formData.companyName}
                </Text>
                {!(user?.role === 'admin' || user?.role === 'COMPANY_ADMIN') && (
                  <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Branch Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Branch Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Nagpur, Pune"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.branchName}
                  onChangeText={(text) => updateField('branchName', text)}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Designation */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Designation</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="briefcase" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Software Developer"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.designation}
                  onChangeText={(text) => updateField('designation', text)}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.password}
                  onChangeText={(text) => updateField('password', text)}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Password Strength */}
              {formData.password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        { width: `${passwordStrength.strength}%`, backgroundColor: passwordStrength.color }
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateField('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={gradients.primary}
                style={styles.registerButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color={Colors.textInverse} />
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link - Only show if not logged in as Admin */}
            {user?.role !== 'admin' && (
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  disabled={loading}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.infoText}>
              After registration, you'll need to register your face for attendance marking.
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
              <Text style={styles.modalTitle}>Select Company</Text>
              <TouchableOpacity onPress={() => setShowCompanyModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={companies}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateField('companyId', item.id);
                    updateField('companyName', item.name);
                    setShowCompanyModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
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
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    ...shadows.medium,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  eyeIcon: {
    padding: 8,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
    ...shadows.medium,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
    ...shadows.small,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '60%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  slotBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  slotText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  }
});
