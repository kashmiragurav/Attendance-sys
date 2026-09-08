// src/services/api.js
import { auth, db, storage, functions } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  doc,
  setDoc
} from 'firebase/firestore';

export async function uploadBase64Image(base64, path) {
  const storageRef = ref(storage, path);
  // base64 should not include data:image/... prefix
  await uploadString(storageRef, base64, 'base64', { contentType: 'image/jpeg' });
  const url = await getDownloadURL(storageRef);
  return url;
}

export async function callComputeEmbedding(imageUrl, uid) {
  try {
    const compute = httpsCallable(functions, 'computeEmbedding');
    const res = await compute({ imageUrl, uid });
    return res.data;
  } catch (err) {
    // If function not deployed, return error-friendly value
    return { error: err.message || 'computeEmbedding not available' };
  }
}

export async function callMatchFace(imageUrl) {
  try {
    const match = httpsCallable(functions, 'matchFace');
    const res = await match({ imageUrl });
    return res.data;
  } catch (err) {
    return { error: err.message || 'matchFace not available' };
  }
}

export async function saveAttendanceRecord(record) {
  const col = collection(db, 'attendance');
  await addDoc(col, { ...record, createdAt: serverTimestamp() });
}

export async function saveFaceRecord(uid, imageUrl, embeddingId = null) {
  const docRef = doc(db, 'faces', uid);
  await setDoc(docRef, { uid, imageUrl, embeddingId, createdAt: serverTimestamp() });
}

export async function getMyAttendance(uid) {
  const col = collection(db, 'attendance');
  const q = query(col, where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllAttendance() {
  const col = collection(db, 'attendance');
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserData(uid) {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
    if (snap.docs.length > 0) {
      return snap.docs[0].data();
    }
    return null;
  } catch (err) {
    console.error('Error fetching user data:', err);
    return null;
  }
}

export async function saveUserData(uid, userData) {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, { uid, ...userData, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error('Error saving user data:', err);
    throw err;
  }
}

export async function checkTodayAttendance(uid) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const col = collection(db, 'attendance');
    const q = query(
      col,
      where('uid', '==', uid),
      where('createdAt', '>=', today),
      where('createdAt', '<', tomorrow),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.length > 0 ? snap.docs[0].data() : null;
  } catch (err) {
    console.error('Error checking today attendance:', err);
    return null;
  }
}

export async function getAttendanceStats(uid) {
  try {
    const col = collection(db, 'attendance');
    const q = query(col, where('uid', '==', uid));
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => d.data());

    const stats = {
      total: records.length,
      present: records.filter((r) => r.type === 'checkin').length,
      absent: records.filter((r) => r.type === 'checkout').length,
      month: records.filter((r) => {
        const date = r.createdAt?.toDate?.();
        const now = new Date();
        return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,
    };
    return stats;
  } catch (err) {
    console.error('Error getting attendance stats:', err);
    return { total: 0, present: 0, absent: 0, month: 0 };
  }
}

export async function searchAttendance(searchTerm) {
  try {
    const col = collection(db, 'attendance');
    const q = query(col, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const allRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    return allRecords.filter((record) =>
      record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (err) {
    console.error('Error searching attendance:', err);
    return [];
  }
}

/**
 * Get all employees from Firestore users collection
 * @returns {Promise<Array>} Array of employee objects with their data
 */
export async function getAllEmployees() {
  try {
    const col = collection(db, 'users');
    const snap = await getDocs(col);
    return snap.docs.map((d) => ({
      id: d.id,
      uid: d.id,
      ...d.data(),
    }));
  } catch (err) {
    console.error('Error fetching all employees:', err);
    return [];
  }
}

/**
 * Search employees by name, email, or department
 * @param {string} searchTerm - Search keyword
 * @returns {Promise<Array>} Filtered employee array
 */
export async function searchEmployees(searchTerm) {
  try {
    const employees = await getAllEmployees();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return employees.filter((emp) =>
      emp.name?.toLowerCase().includes(lowerSearchTerm) ||
      emp.email?.toLowerCase().includes(lowerSearchTerm) ||
      emp.department?.toLowerCase().includes(lowerSearchTerm) ||
      emp.uid?.toLowerCase().includes(lowerSearchTerm)
    );
  } catch (err) {
    console.error('Error searching employees:', err);
    return [];
  }
}

/**
 * Get single employee profile by UID
 * @param {string} uid - Employee UID
 * @returns {Promise<Object>} Employee data with all details
 */
export async function getEmployeeProfile(uid) {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
    
    if (snap.docs.length > 0) {
      const data = snap.docs[0].data();
      return {
        id: snap.docs[0].id,
        uid: uid,
        ...data,
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching employee profile:', err);
    return null;
  }
}

/**
 * Get employee attendance records
 * @param {string} uid - Employee UID
 * @param {number} days - Number of days to fetch (default 30)
 * @returns {Promise<Array>} Attendance records for the employee
 */
export async function getEmployeeAttendanceRecords(uid, days = 30) {
  try {
    const col = collection(db, 'attendance');
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const q = query(
      col,
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(d.data().createdAt),
    }));
  } catch (err) {
    console.error('Error fetching employee attendance:', err);
    return [];
  }
}
