// Firebase REST API Integration - No SDK needed!
// Project: attendance-3519f
// This uses Firebase Firestore REST API directly

const PROJECT_ID = 'attendance-3519f';
const API_KEY = 'AIzaSyAn8PQG85atGyDptxCMBj_LgKug-Sfd7nQ';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper function to convert data to Firestore format
const toFirestoreValue = (value) => {
  if (value === undefined) return { nullValue: null }; // Avoid "type unset" error
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return {
        arrayValue: {
          values: value.map(toFirestoreValue)
        }
      };
    }
    if (value === null) return { nullValue: null };
    return {
      mapValue: {
        fields: Object.entries(value).reduce((acc, [k, v]) => {
          if (v !== undefined) {
            acc[k] = toFirestoreValue(v);
          }
          return acc;
        }, {})
      }
    };
  }
  return { stringValue: String(value) };
};

// Helper function to convert Firestore format back to JS
const fromFirestoreValue = (firestoreValue) => {
  if (!firestoreValue) return null;
  if (firestoreValue.stringValue !== undefined) return firestoreValue.stringValue;
  if (firestoreValue.integerValue !== undefined) return parseInt(firestoreValue.integerValue);
  if (firestoreValue.doubleValue !== undefined) return typeof firestoreValue.doubleValue === 'string' ? parseFloat(firestoreValue.doubleValue) : firestoreValue.doubleValue;
  if (firestoreValue.booleanValue !== undefined) return firestoreValue.booleanValue;
  if (firestoreValue.nullValue !== undefined) return null;
  if (firestoreValue.mapValue && firestoreValue.mapValue.fields) {
    return Object.entries(firestoreValue.mapValue.fields).reduce((acc, [k, v]) => {
      acc[k] = fromFirestoreValue(v);
      return acc;
    }, {});
  }
  if (firestoreValue.arrayValue) {
    return (firestoreValue.arrayValue.values || []).map(fromFirestoreValue);
  }
  return firestoreValue;
};

export const db = {
  collection: (collectionName) => ({
    doc: (docId) => ({
      set: async (data) => {
        try {
          const fields = {};
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
              fields[key] = toFirestoreValue(value);
            }
          });

          const response = await fetch(
            `${BASE_URL}/${collectionName}/${docId}?key=${API_KEY}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
          console.log(`✅ Document saved: ${collectionName}/${docId}`);
          return response.json();
        } catch (error) {
          console.error('Error saving document:', error);
          throw error;
        }
      },

      update: async (data) => {
        try {
          const fields = {};
          const updateMask = [];
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
              fields[key] = toFirestoreValue(value);
              updateMask.push(`updateMask.fieldPaths=${key}`);
            }
          });

          const maskQuery = updateMask.join('&');
          const response = await fetch(
            `${BASE_URL}/${collectionName}/${docId}?${maskQuery}&key=${API_KEY}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
          console.log(`✅ Document updated: ${collectionName}/${docId}`);
          return response.json();
        } catch (error) {
          console.error('Error updating document:', error);
          throw error;
        }
      },

      get: async () => {
        try {
          const response = await fetch(
            `${BASE_URL}/${collectionName}/${docId}?key=${API_KEY}`,
            { method: 'GET' }
          );

          if (response.status === 404) {
            return { exists: false, data: () => null };
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const doc = await response.json();
          const data = doc.fields ? Object.entries(doc.fields).reduce((acc, [key, value]) => {
            acc[key] = fromFirestoreValue(value);
            return acc;
          }, {}) : {};

          return { exists: true, data: () => data };
        } catch (error) {
          console.error('Error getting document:', error);
          return { exists: false, data: () => null };
        }
      },

      delete: async () => {
        try {
          const response = await fetch(
            `${BASE_URL}/${collectionName}/${docId}?key=${API_KEY}`,
            { method: 'DELETE' }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          console.log(`✅ Document deleted: ${collectionName}/${docId}`);
          return { success: true };
        } catch (error) {
          console.error('Error deleting document:', error);
          return { success: false, error: error.message };
        }
      },

      onSnapshot: (callback) => {
        let lastDataString = null;
        let isStopped = false;

        const checkChanges = async () => {
          if (isStopped) return;
          try {
            const response = await fetch(
              `${BASE_URL}/${collectionName}/${docId}?key=${API_KEY}`,
              { method: 'GET' }
            );

            if (response.status === 404) {
              callback({ exists: false, data: () => null });
              return;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const doc = await response.json();
            const data = doc.fields ? Object.entries(doc.fields).reduce((acc, [key, value]) => {
              acc[key] = fromFirestoreValue(value);
              return acc;
            }, {}) : {};

            const currentDataString = JSON.stringify(data);
            if (currentDataString !== lastDataString) {
              lastDataString = currentDataString;
              callback({
                exists: true,
                id: docId,
                data: () => data
              });
            }
          } catch (error) {
            console.error('onSnapshot Error:', error);
          }
        };

        checkChanges();
        const intervalId = setInterval(checkChanges, 5000);

        return () => {
          isStopped = true;
          clearInterval(intervalId);
        };
      }
    }),

    getDocs: async () => {
      try {
        console.log(`📥 Fetching ${collectionName} collection...`);
        const response = await fetch(
          `${BASE_URL}/${collectionName}?pageSize=1000&key=${API_KEY}`,
          { method: 'GET' }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const docs = (result.documents || []).map((doc) => {
          const docId = doc.name.split('/').pop();
          const data = doc.fields ? Object.entries(doc.fields).reduce((acc, [key, value]) => {
            acc[key] = fromFirestoreValue(value);
            return acc;
          }, {}) : {};
          return { id: docId, data: () => data };
        });

        console.log(`✅ Retrieved ${docs.length} documents from ${collectionName}`);
        return { docs };
      } catch (error) {
        console.error('❌ Error getting documents:', error);
        return { docs: [] };
      }
    },

    where: async (field, operator, value) => {
      try {
        console.log(`📥 Querying ${collectionName} where ${field} ${operator} ${value}...`);

        const response = await fetch(
          `${BASE_URL}/${collectionName}?pageSize=1000&key=${API_KEY}`,
          { method: 'GET' }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const allDocs = (result.documents || []).map((doc) => {
          const docId = doc.name.split('/').pop();
          const data = doc.fields ? Object.entries(doc.fields).reduce((acc, [key, value]) => {
            acc[key] = fromFirestoreValue(value);
            return acc;
          }, {}) : {};
          return { id: docId, data: () => data };
        });

        let filtered = allDocs;
        if (operator === '==') {
          filtered = allDocs.filter(doc => {
            const val = doc.data()[field];
            if (val === undefined || val === null) return false;
            return String(val).toLowerCase() === String(value).toLowerCase();
          });
        } else if (operator === '>') {
          filtered = allDocs.filter(doc => doc.data()[field] > value);
        } else if (operator === '<') {
          filtered = allDocs.filter(doc => doc.data()[field] < value);
        } else if (operator === '>=') {
          filtered = allDocs.filter(doc => doc.data()[field] >= value);
        } else if (operator === '<=') {
          filtered = allDocs.filter(doc => doc.data()[field] <= value);
        }

        console.log(`✅ Query returned ${filtered.length} documents (Total fetched: ${allDocs.length})`);
        return { docs: filtered };
      } catch (error) {
        console.error('❌ Error querying documents:', error);
        return { docs: [] };
      }
    },
  }),
};

// Helper functions for attendance operations
export const attendanceHelpers = {
  getUserByEmployeeId: async (employeeId) => {
    try {
      const snapshot = await db.collection('users').getDocs();
      const user = snapshot.docs.find(doc => {
        const docId = doc.data().employeeId;
        return typeof docId === 'string' && docId.toLowerCase() === employeeId.toLowerCase();
      });
      return user ? { success: true, user: user.data() } : { success: false, error: 'User not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getUserByEmail: async (email) => {
    try {
      const snapshot = await db.collection('users').getDocs();
      const user = snapshot.docs.find(doc => {
        const docEmail = doc.data().email;
        return typeof docEmail === 'string' && docEmail.toLowerCase() === email.toLowerCase();
      });
      return user ? { success: true, user: user.data() } : { success: false, error: 'User not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getAttendanceByDate: async (userId, date) => {
    try {
      const snapshot = await db.collection('attendance').getDocs();
      const attendance = snapshot.docs.find(
        doc => doc.data().userId === userId && doc.data().date === date
      );
      return attendance
        ? { success: true, attendance: attendance.data() }
        : { success: false, error: 'Attendance not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getUserAttendance: async (userId) => {
    try {
      const snapshot = await db.collection('attendance').getDocs();
      const records = snapshot.docs
        .filter(doc => {
          const docUserId = doc.data().userId;
          return typeof docUserId === 'string' && typeof userId === 'string'
            ? docUserId.toLowerCase() === userId.toLowerCase()
            : docUserId === userId;
        })
        .map(doc => doc.data())
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return { success: true, records };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getOfficeSettings: async () => {
    try {
      const docSnap = await db.collection('office_settings').doc('settings_default').get();
      if (docSnap.exists) {
        return { success: true, settings: docSnap.data() };
      }
      return {
        success: true,
        settings: {
          officeStartTime: '09:00',
          officeEndTime: '18:00',
          gracePeriodMinutes: 15,
          halfDayHours: 4,
          fullDayHours: 8,
          weekendDays: [0, 6],
          holidays: [],
          geoFencing: { enabled: false },
          faceMatchThreshold: 0.75,
          allowDuplicateAttendance: false,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getCompanyById: async (companyId) => {
    try {
      const docSnap = await db.collection('companies').doc(companyId).get();
      return docSnap.exists ? { success: true, company: docSnap.data() } : { success: false, error: 'Company not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export const auth = {
  currentUser: null,
  signOut: () => Promise.resolve(),
};

export const storage = {
  ref: () => ({}),
};

console.log('✅ Firestore REST API initialized for attendance-3519f');

export default {
  auth,
  db,
  storage,
  attendanceHelpers,
};
