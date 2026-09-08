import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as SecureStore from 'expo-secure-store';

// JWT Secret Key (In production, store this securely)
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production-2024';
const JWT_EXPIRY = '7d'; // 7 days

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return { success: true, hash };
  } catch (error) {
    console.error('Error hashing password:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (password, hash) => {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return { success: true, isMatch };
  } catch (error) {
    console.error('Error verifying password:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate JWT token
 */
export const generateToken = (payload) => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return { success: true, token };
  } catch (error) {
    console.error('Error generating token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, data: decoded };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Store token securely
 */
export const storeToken = async (token) => {
  try {
    await SecureStore.setItemAsync('userToken', token);
    return { success: true };
  } catch (error) {
    console.error('Error storing token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get stored token
 */
export const getStoredToken = async () => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    return { success: true, token };
  } catch (error) {
    console.error('Error getting token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove stored token
 */
export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync('userToken');
    return { success: true };
  } catch (error) {
    console.error('Error removing token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Simple encryption for face embeddings (Base64 encoding)
 * In production, use proper AES encryption
 */
export const encryptData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const base64 = Buffer.from(jsonString).toString('base64');
    return { success: true, encrypted: base64 };
  } catch (error) {
    console.error('Error encrypting data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Decrypt face embeddings
 */
export const decryptData = (encrypted) => {
  try {
    const jsonString = Buffer.from(encrypted, 'base64').toString('utf-8');
    const data = JSON.parse(jsonString);
    return { success: true, data };
  } catch (error) {
    console.error('Error decrypting data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate unique ID
 */
export const generateUniqueId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate employee ID format
 */
export const validateEmployeeId = (employeeId) => {
  // Format: EMP001, EMP002, etc.
  const regex = /^EMP\d{3,}$/;
  return regex.test(employeeId);
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number (Indian format)
 */
export const validatePhone = (phone) => {
  const regex = /^[+]?[91]?[6-9]\d{9}$/;
  return regex.test(phone.replace(/[\s-]/g, ''));
};
