#!/usr/bin/env node
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdmin() {
  try {
    console.log('🔧 Creating admin account...');
    
    const email = 'admin@company.com';
    const password = 'AdminPassword123';
    
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    console.log('✅ Admin auth user created:', uid);
    
    // Create Firestore document
    await setDoc(doc(db, 'employees', uid), {
      uid: uid,
      email: email,
      name: 'Admin User',
      department: 'Management',
      phone: '',
      isActive: true,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ Admin profile created in Firestore');
    console.log('\n📌 Admin Account Details:');
    console.log('   Email: admin@company.com');
    console.log('   Password: AdminPassword123');
    console.log('   UID:', uid);
    
    process.exit(0);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('⚠️  Admin account already exists');
      process.exit(0);
    }
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setupAdmin();
