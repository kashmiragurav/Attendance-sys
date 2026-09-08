import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserData } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Fetch additional user data from Firestore
          const data = await getUserData(firebaseUser.uid);
          setUserData(data || {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'user',
            name: firebaseUser.displayName || 'User',
            department: 'General',
            createdAt: new Date(),
          });
        } else {
          setUser(null);
          setUserData(null);
        }
        setError(null);
      } catch (err) {
        console.error('Auth context error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userData,
    isLoading,
    error,
    isAdmin: userData?.role === 'admin',
    isAuthenticated: !!user,
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
