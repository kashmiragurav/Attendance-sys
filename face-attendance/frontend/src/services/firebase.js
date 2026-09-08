// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase config (from user)
const firebaseConfig = {
  apiKey: "AIzaSyAn8PQG85atGyDptxCMBj_LgKug-Sfd7nQ",
  authDomain: "attendance-3519f.firebaseapp.com",
  projectId: "attendance-3519f",
  storageBucket: "attendance-3519f.firebasestorage.app",
  messagingSenderId: "354209684908",
  appId: "1:354209684908:web:9fe6d5791232a58e33ee09",
  measurementId: "G-R5VPM2ZCH3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
