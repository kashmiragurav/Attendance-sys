import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';
import { FEATURES, PLAN_DEFAULTS } from '../constants/Plans';
import { attendanceHelpers, db, firebaseAuthService } from '../services/firebaseConfig';
import { getUserLimit, isFeatureEnabled } from '../utils/featureAccess';

export const AuthContext = createContext();

// Simple password hashing (for demo - in production use proper bcrypt)
const simpleHash = (password) => {
  // Simple hash using character codes
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

const verifySimpleHash = (password, hash, plainPasswordFromDb) => {
  // 1. Check if matches the plain text password from DB (if exists)
  if (plainPasswordFromDb && password === plainPasswordFromDb) {
    return true;
  }
  // 2. Check if matches the hash
  return simpleHash(password) === hash;
};

// Simple token generation
const generateSimpleToken = (userData) => {
  const tokenData = {
    ...userData,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };
  return JSON.stringify(tokenData);
};

const verifySimpleToken = (token) => {
  try {
    const data = JSON.parse(token);
    if (data.exp < Date.now()) {
      return { success: false, error: 'Token expired' };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const firebaseUid = firebaseUser.uid;
          let userDoc = await db.collection('users').doc(firebaseUid).get();

          if (!userDoc.exists) {
            const byEmail = await attendanceHelpers.getUserByEmail(firebaseUser.email || '');
            if (byEmail.success) {
              const legacyUser = byEmail.user;
              const mergedUser = {
                ...legacyUser,
                uid: firebaseUid,
                firebaseUid,
                updatedAt: new Date().toISOString(),
              };
              await db.collection('users').doc(firebaseUid).set(mergedUser);
              userDoc = { exists: true, data: () => mergedUser };
            }
          }

          if (userDoc.exists) {
            const userData = userDoc.data();
            setUser(userData);
            setIsAuthenticated(true);

            if (userData.companyId) {
              const compDoc = await db.collection('companies').doc(userData.companyId).get();
              if (compDoc.exists) {
                setCompany(compDoc.data());
              }
            }
          }
        } catch (error) {
          console.error('Firebase auth restore failed:', error);
        }
      }

      if (!firebaseUser) {
        checkStoredAuth();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for company data
  useEffect(() => {
    let unsubscribeCompany = () => { };

    if (user?.companyId) {
      console.log('🔄 Attaching real-time listener for company:', user.companyId);
      unsubscribeCompany = db.collection('companies').doc(user.companyId).onSnapshot(doc => {
        if (doc.exists) {
          const compData = doc.data();
          console.log('✅ Company data updated in real-time:', compData.name, '| Plan:', compData.plan);
          setCompany(compData);
        }
      }, err => {
        console.error('Error in company listener:', err);
      });
    }

    return () => unsubscribeCompany();
  }, [user?.companyId]);

  const checkStoredAuth = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      if (token) {
        const verified = verifySimpleToken(token);

        if (verified.success) {
          const userDoc = await db.collection('users').doc(verified.data.uid).get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            setUser(userData);

            // Also fetch company data
            if (userData.companyId) {
              const compDoc = await db.collection('companies').doc(userData.companyId).get();
              if (compDoc.exists) {
                setCompany(compDoc.data());
              }
            }

            setIsAuthenticated(true);
          } else {
            await AsyncStorage.removeItem('userToken');
          }
        } else {
          await AsyncStorage.removeItem('userToken');
        }
      }
    } catch (err) {
      console.error('Error checking stored auth:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateUniqueId = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const register = async (employeeData) => {
    try {
      setError(null);
      setLoading(true);

      const normalizedEmail = employeeData.email.toLowerCase();
      const normalizedEmployeeId = employeeData.employeeId.toUpperCase();
      const { password, name, phone, department, designation, role = 'employee', companyName, branchName } = employeeData;

      if (!normalizedEmail || !password || !normalizedEmployeeId || !name) {
        throw new Error('Required fields missing');
      }

      const existingUser = await attendanceHelpers.getUserByEmail(normalizedEmail);
      if (existingUser.success) {
        throw new Error('Email already registered');
      }

      // Check if Employee ID exists specifically in THIS company
      const companyId = employeeData.companyId || 'comp_default';
      const snapshot = await db.collection('users').where('employeeId', '==', normalizedEmployeeId);
      const companyDocs = snapshot.docs.filter(doc => doc.data().companyId === companyId);

      if (companyDocs.length > 0) {
        throw new Error('Employee ID already exists in this company');
      }

      // --- SaaS PLAN ENFORCEMENT: USER LIMIT ---
      // 1. Fetch Company Data
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (!companyDoc.exists) {
        throw new Error('Associated company not found');
      }
      const companyData = companyDoc.data();

      // 2. Check Expiry (if expired, limit to FREE plan defaults)
      const now = new Date();
      const expiry = companyData.subscription?.expiryDate ? new Date(companyData.subscription.expiryDate) : null;
      const isExpired = expiry && now > expiry;

      const effectivePlan = (isExpired && companyData.plan !== 'Free') ? 'Free' : (companyData.plan || 'Free');
      const limit = PLAN_DEFAULTS[effectivePlan]?.maxUsers || 10;

      // 3. Get current user count for this company
      const usersSnap = await db.collection('users').where('companyId', '==', companyId);
      const currentCount = usersSnap.docs.length;

      if (currentCount >= limit) {
        throw new Error(`User limit reached for your company (${limit} max). Please upgrade your plan.`);
      }
      // --- END ENFORCEMENT ---

      const uid = generateUniqueId('user');
      const passwordHash = simpleHash(password);

      const newUser = {
        uid,
        employeeId: normalizedEmployeeId,
        email: normalizedEmail,
        passwordHash,
        plainPassword: password, // Store plain password for visibility in database
        name,
        phone: phone || '',
        department: department || 'General',
        designation: designation || 'Employee',
        companyId: employeeData.companyId || 'comp_default',
        companyName: companyName || 'Digisahyadri PVT LTD',
        branchName: branchName || '',
        role, // SUPER_ADMIN, COMPANY_ADMIN, employee
        faceEmbedding: '',
        faceRegistered: false,
        isActive: true,
        joinDate: new Date().toISOString().split('T')[0],
        deviceId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('users').doc(uid).set(newUser);

      // Also save to 'employees' collection for legacy compatibility
      try {
        const employeeData = {
          ...newUser,
          password: password, // Legacy field name
          plainPassword: password // New field name
        };
        await db.collection('employees').doc(uid).set(employeeData);
        console.log('✅ Employee also saved to employees collection');
      } catch (legacyError) {
        console.error('Failed to save to employees collection:', legacyError);
      }

      console.log('✅ Employee registered:', uid);

      // Only auto-login if no admin is currently logged in
      if (user?.role !== 'admin') {
        const token = generateSimpleToken({
          uid: newUser.uid,
          email: newUser.email,
          role: newUser.role,
          companyId: newUser.companyId,
        });

        await AsyncStorage.setItem('userToken', token);
        setUser(newUser);
        setIsAuthenticated(true);
      }

      return { success: true, uid };
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      console.error('Registration error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password, passedCompanySlug) => {
    try {
      setError(null);
      setLoading(true);

      if (!identifier || !password) {
        throw new Error('Please enter credentials');
      }

      const trimmedIdentifier = identifier.trim().replace(/\s/g, '');
      const trimmedPassword = password.trim();
      let normalizedIdentifier = trimmedIdentifier.includes('@') ? trimmedIdentifier.toLowerCase() : trimmedIdentifier.toUpperCase();

      if (!normalizedIdentifier.includes('@') && !normalizedIdentifier.startsWith('EMP') && /^\d+$/.test(normalizedIdentifier)) {
        console.log(`ℹ️ Auto-prefixing EMP to ID: ${normalizedIdentifier}`);
        normalizedIdentifier = 'EMP' + normalizedIdentifier;
      }

      let foundUser = null;

      if (normalizedIdentifier.includes('@')) {
        try {
          const firebaseCredential = await firebaseAuthService.signInWithEmail(normalizedIdentifier, trimmedPassword);
          const firebaseUid = firebaseCredential.uid;
          let userDoc = await db.collection('users').doc(firebaseUid).get();

          if (!userDoc.exists) {
            const userResult = await attendanceHelpers.getUserByEmail(normalizedIdentifier);
            if (userResult.success) {
              const legacyUser = {
                ...userResult.user,
                uid: firebaseUid,
                firebaseUid,
                updatedAt: new Date().toISOString(),
              };
              await db.collection('users').doc(firebaseUid).set(legacyUser);
              userDoc = { exists: true, data: () => legacyUser };
            }
          }

          if (userDoc.exists) {
            const userData = userDoc.data();
            if (!userData.isActive) {
              throw new Error('Account is deactivated. Please contact HR.');
            }
            foundUser = userData;
          } else {
            throw new Error('No employee record found for this authenticated account.');
          }
        } catch (firebaseError) {
          const legacyUserResult = await attendanceHelpers.getUserByEmail(normalizedIdentifier);
          if (legacyUserResult.success && verifySimpleHash(trimmedPassword, legacyUserResult.user.passwordHash, legacyUserResult.user.plainPassword)) {
            foundUser = legacyUserResult.user;
          } else {
            throw firebaseError;
          }
        }
      } else if (passedCompanySlug) {
        // Employee ID + Company Slug Login
        const normalizedSlug = passedCompanySlug.trim().toLowerCase();
        console.log(`📍 Searching for company with identifier: [${normalizedSlug}]`);

        // Try searching by slug first
        let companiesSnapshot = await db.collection('companies').where('slug', '==', normalizedSlug);

        // Fallback: Try searching by document ID if slug query fails
        if (companiesSnapshot.docs.length === 0) {
          console.log(`🔍 Slug [${normalizedSlug}] not found. Searching by document ID...`);
          const companyDoc = await db.collection('companies').doc(passedCompanySlug).get();
          if (companyDoc.exists) {
            companiesSnapshot = { docs: [companyDoc] };
          }
        }

        if (companiesSnapshot.docs.length === 0) {
          console.log(`❌ Company not found for identifier: ${passedCompanySlug}`);
          throw new Error(`Organization "${passedCompanySlug}" not found. Please select from the list.`);
        }

        const targetCompanyId = companiesSnapshot.docs[0].id;
        const targetCompanyName = companiesSnapshot.docs[0].data().name;
        console.log(`🏢 Company Found: ${targetCompanyName} (${targetCompanyId}). Searching for ID: ${normalizedIdentifier}`);

        const usersSnapshot = await db.collection('users').where('employeeId', '==', normalizedIdentifier);
        console.log(`👥 ID Search Result: Found ${usersSnapshot.docs.length} user(s) with ID matching [${normalizedIdentifier}]`);

        // 1. Try to find EXACT match for the selected company and ID
        let matchingUserDoc = usersSnapshot.docs.find(doc => {
          const data = doc.data();
          const pMatch = verifySimpleHash(trimmedPassword, data.passwordHash, data.plainPassword);
          const cMatch = String(data.companyId).trim() === String(targetCompanyId).trim();

          if (!cMatch) {
            console.log(`🏢 ID [${normalizedIdentifier}] found but Company Mismatch: User belongs to [${data.companyId}] | Tried to login to [${targetCompanyId}] (${targetCompanyName})`);
          }

          if (!pMatch) {
            console.log(`🔑 ID [${normalizedIdentifier}] found in [${targetCompanyName}] but Password Mismatch.`);
          }

          if (!cMatch && pMatch) {
            console.log(`🚫 Security Alert: User '${data.name}' tried to login but belongs to DIFFERENT company: ${data.companyId} (Selected: ${targetCompanyId})`);
          }

          return cMatch && pMatch;
        });

        if (matchingUserDoc) {
          foundUser = matchingUserDoc.data();
          console.log(`✅ Strict Auth Success: ${foundUser.name} (Company: ${foundUser.companyId})`);
        } else {
          console.log(`❌ Strict Auth Failed: No matching user found for ID [${normalizedIdentifier}] in Organization [${targetCompanyName}] with correct password.`);
          throw new Error('Invalid ID or Password for the selected Organization');
        }
      } else if (!normalizedIdentifier.includes('@')) {
        // ID Login attempt without organization selection
        console.log(`❌ Rejection: Employee ID login attempt without organization slug for [${normalizedIdentifier}]`);
        throw new Error('Please select your Organization');
      }

      if (!foundUser) {
        // Detailed error for debugging (In production, keep it generic)
        console.log(`❌ Login failed for ${normalizedIdentifier}: User not found or password incorrect`);
        throw new Error('Invalid ID or Password');
      }

      if (!foundUser.isActive) {
        throw new Error('Account is deactivated. Please contact HR.');
      }

      // Check Company Subscription (Skip for Super Admin)
      if (foundUser.role !== 'SUPER_ADMIN') {
        const companyId = foundUser.companyId;
        const companySnap = await db.collection('companies').doc(companyId).get();
        if (companySnap.exists) {
          const companyData = companySnap.data();
          const expiryDate = companyData.subscription?.expiryDate;
          if (expiryDate) {
            const today = new Date();
            const expiry = new Date(expiryDate);
            if (today > expiry) {
              throw new Error('Company subscription expired. Please contact support.');
            }
          }
        }
      }

      const token = generateSimpleToken({
        uid: foundUser.uid,
        email: foundUser.email,
        role: foundUser.role,
        companyId: foundUser.companyId,
      });

      await AsyncStorage.setItem('userToken', token);
      if (firebaseAuthService.getCurrentUser() && foundUser.email && foundUser.email.toLowerCase() === firebaseAuthService.getCurrentUser().email?.toLowerCase()) {
        const syncedUser = {
          ...foundUser,
          uid: foundUser.uid || firebaseAuthService.getCurrentUser().uid,
          firebaseUid: firebaseAuthService.getCurrentUser().uid,
          updatedAt: new Date().toISOString(),
        };
        await db.collection('users').doc(syncedUser.uid).set(syncedUser);
        setUser(syncedUser);
        foundUser = syncedUser;
      } else {
        setUser(foundUser);
      }

      // Fetch and set company data
      if (foundUser.companyId) {
        const compDoc = await db.collection('companies').doc(foundUser.companyId).get();
        if (compDoc.exists) {
          setCompany(compDoc.data());
        }
      }

      setIsAuthenticated(true);
      console.log('✅ Login successful:', foundUser.name);

      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      console.error('Login error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      try {
        await firebaseAuthService.signOut();
      } catch (firebaseLogoutError) {
        console.warn('Firebase logout warning:', firebaseLogoutError);
      }
      await AsyncStorage.removeItem('userToken');
      setUser(null);
      setCompany(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateProfile = async (updates) => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        throw new Error('No user logged in');
      }

      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.collection('users').doc(user.uid).set(updatedUser);
      setUser(updatedUser);

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateFaceEmbedding = async (status = 'registered') => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        throw new Error('No user logged in');
      }

      const updatedUser = {
        ...user,
        faceRegistered: status === 'registered',
        faceRegisteredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('users').doc(user.uid).set(updatedUser);
      setUser(updatedUser);

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        throw new Error('No user logged in');
      }

      if (!verifySimpleHash(currentPassword, user.passwordHash)) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = simpleHash(newPassword);

      const updatedUser = {
        ...user,
        passwordHash: newPasswordHash,
        plainPassword: newPassword, // Update plain password in DB
        updatedAt: new Date().toISOString(),
      };

      await db.collection('users').doc(user.uid).set(updatedUser);
      setUser(updatedUser);

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    updateProfile,
    updateFaceEmbedding,
    changePassword,
    company,
    isFeatureEnabled: (featureKey) => isFeatureEnabled(company, featureKey),
    getUserLimit: () => getUserLimit(company),
    refreshCompany: async () => {
      if (user?.companyId) {
        const compDoc = await db.collection('companies').doc(user.companyId).get();
        if (compDoc.exists) setCompany(compDoc.data());
      }
    },
    FEATURES,
    PLAN_DEFAULTS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
