import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { saveUserData } from '../services/api';
import { logger } from '../utils/logger';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert(Strings.error, 'Please enter email');
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert(Strings.error, Strings.invalidEmail);
      return false;
    }

    if (!password) {
      Alert.alert(Strings.error, 'Please enter password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert(Strings.error, Strings.passwordTooShort);
      return false;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert(Strings.error, Strings.passwordMismatch);
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      logger.info('Attempting login with email:', email);
      
      // Try to sign in
      try {
        await signInWithEmailAndPassword(auth, email, password);
        logger.info('Login successful');
        // Navigation is handled by AuthContext
      } catch (authErr) {
        // If user-not-found and this is admin account, create it automatically
        if (authErr.code === 'auth/user-not-found' && email === 'admin@company.com') {
          logger.info('Admin account not found, creating it...');
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Save admin data to Firestore
          await saveUserData(userCredential.user.uid, {
            email,
            name: 'Admin User',
            department: 'Management',
            role: 'admin',
            phone: '',
            isActive: true,
            createdAt: new Date(),
          });
          
          logger.info('Admin account created successfully');
          Alert.alert('✅ Success', 'Admin account created! You are now logged in.');
          // Navigation is handled by AuthContext
        } else {
          throw authErr;
        }
      }
    } catch (err) {
      logger.error('Login failed:', err.message);
      Alert.alert(Strings.error, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      logger.info('Attempting signup with email:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save user data to Firestore
      await saveUserData(userCredential.user.uid, {
        email,
        name: email.split('@')[0],
        department: 'General',
        role: 'user',
        phone: '',
        createdAt: new Date(),
      });

      logger.info('Signup successful');
      Alert.alert(Strings.success, 'Account created successfully! Please login.');
      
      // Reset form and switch to login
      setPassword('');
      setConfirmPassword('');
      setIsSignUp(false);
      
    } catch (err) {
      logger.error('Signup failed:', err.message);
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert(Strings.error, Strings.userAlreadyExists);
      } else {
        Alert.alert(Strings.error, err.message);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>Face Recognition</Text>
          <Text style={styles.appSubtitle}>Attendance System</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{Strings.email}</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{Strings.password}</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              returnKeyType={isSignUp ? 'next' : 'done'}
              onSubmitEditing={() => isSignUp ? confirmPasswordRef.current?.focus() : handleLogin()}
            />
          </View>

          {/* Confirm Password Input (Sign Up Only) */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{Strings.confirmPassword}</Text>
              <TextInput
                ref={confirmPasswordRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
            </View>
          )}

          {/* Main Action Button */}
          <TouchableOpacity
            style={[styles.mainButton, loading && styles.buttonDisabled]}
            onPress={isSignUp ? handleSignup : handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textLight} />
            ) : (
              <Text style={styles.mainButtonText}>
                {isSignUp ? Strings.signUpButton : Strings.loginButton}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Sign Up / Login */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity
              disabled={loading}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
                setConfirmPassword('');
              }}
            >
              <Text style={styles.toggleButton}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Admin Login Button */}
          {!isSignUp && (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => navigation.navigate('AdminLogin')}
              disabled={loading}
            >
              <Text style={styles.adminButtonText}>👨‍💼 Admin Login</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Text */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Use face recognition to mark your attendance easily and securely.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  formContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
  },
  mainButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  mainButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  toggleButton: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  adminButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoBox: {
    backgroundColor: Colors.primaryLight + '20',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    color: Colors.primary,
    fontSize: 13,
    lineHeight: 18,
  },
});
