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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getUserData } from '../services/api';
import { Colors } from '../constants/colors';
import { logger } from '../utils/logger';

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email');
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter valid email');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleAdminLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log('🔑 Attempting admin login with email:', email);

      // Sign in with Firebase Auth
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Firebase Auth successful');
      } catch (authErr) {
        // If user not found and trying to login as admin, create account
        if (authErr.code === 'auth/user-not-found' && email === 'admin@company.com') {
          console.log('🔧 Admin account not found, creating it...');
          
          // Create Firebase Auth user
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          console.log('✅ Firebase Auth user created:', userCredential.user.uid);
          
          // Save admin data to Firestore
          const adminData = {
            uid: userCredential.user.uid,
            email: email,
            name: 'Admin User',
            department: 'Management',
            role: 'admin',
            phone: '',
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          
          await setDoc(doc(db, 'users', userCredential.user.uid), adminData);
          console.log('✅ Admin profile saved to Firestore:', adminData);
        } else {
          throw authErr;
        }
      }

      // Check if user is admin
      const userData = await getUserData(userCredential.user.uid);
      console.log('📋 User data from Firestore:', userData);

      if (!userData) {
        console.log('⚠️ User data not found, creating default...');
        // Create default admin profile
        const adminData = {
          uid: userCredential.user.uid,
          email: email,
          name: 'Admin User',
          department: 'Management',
          role: 'admin',
          phone: '',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), adminData);
        console.log('✅ Admin profile created:', adminData);
      } else if (userData.role !== 'admin') {
        console.log('❌ User is not admin. Role:', userData.role);
        Alert.alert('Error', 'You do not have admin access');
        await auth.signOut();
        return;
      }

      console.log('✅ Admin login successful');
      // Navigation is handled by AuthContext
    } catch (err) {
      console.error('❌ Admin login failed:', err);
      if (err.code === 'auth/user-not-found') {
        Alert.alert('Error', 'Admin account not found. Please use: admin@company.com');
      } else if (err.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Incorrect password');
      } else if (err.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'Email already in use');
      } else {
        Alert.alert('Error', err.message);
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
          <Text style={styles.appTitle}>👨‍💼 Admin Portal</Text>
          <Text style={styles.appSubtitle}>Administrator Login</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@example.com"
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
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleAdminLogin}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.mainButton, loading && styles.buttonDisabled]}
            onPress={handleAdminLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textLight} />
            ) : (
              <Text style={styles.mainButtonText}>Admin Login</Text>
            )}
          </TouchableOpacity>

          {/* Back to Regular Login */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Not an admin? </Text>
            <TouchableOpacity
              disabled={loading}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.toggleButton}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Text */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Only administrators can access the admin portal. Contact your system administrator if you need admin access.
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
    backgroundColor: '#FF6B35',
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
