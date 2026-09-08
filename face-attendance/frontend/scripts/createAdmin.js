#!/usr/bin/env node

/**
 * Create Admin Account Script
 * 
 * This script creates the admin account in Firebase Auth and Firestore
 * Usage: node scripts/createAdmin.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// Make sure you have a service account key file
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'attendance-3519f',
  });
} catch (error) {
  console.error('❌ Service account key not found!');
  console.error('Please follow these steps:');
  console.error('1. Go to Firebase Console → Project Settings');
  console.error('2. Service Accounts tab');
  console.error('3. Generate new private key');
  console.error('4. Save as: face-attendance/frontend/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

// Admin credentials
const ADMIN_EMAIL = 'admin@company.com';
const ADMIN_PASSWORD = 'AdminPassword123';
const ADMIN_NAME = 'Admin User';

async function createAdminAccount() {
  try {
    console.log('🔄 Creating admin account...\n');

    // Step 1: Create Firebase Auth user
    console.log(`📝 Creating Firebase Auth user: ${ADMIN_EMAIL}`);
    let userRecord;
    
    try {
      // Try to get existing user first
      userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log(`✅ User already exists with UID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        userRecord = await auth.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: ADMIN_NAME,
        });
        console.log(`✅ Firebase Auth user created: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }

    // Step 2: Create Firestore document
    console.log(`📝 Creating Firestore admin document...`);
    
    const adminData = {
      uid: userRecord.uid,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      department: 'Management',
      role: 'admin',  // IMPORTANT: This makes them an admin
      phone: '9876543210',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(adminData, { merge: true });
    console.log(`✅ Firestore admin document created`);

    // Step 3: Verify
    console.log(`\n🔍 Verifying admin account...`);
    const savedDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!savedDoc.exists) {
      throw new Error('Document was not saved!');
    }

    const savedData = savedDoc.data();
    console.log(`✅ Admin account verified:\n`);
    console.log(`   Email: ${savedData.email}`);
    console.log(`   Name: ${savedData.name}`);
    console.log(`   Role: ${savedData.role}`);
    console.log(`   UID: ${savedData.uid}`);

    console.log(`\n✨ SUCCESS! Admin account is ready!\n`);
    console.log(`📱 You can now login with:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error creating admin account:`);
    console.error(error.message);
    process.exit(1);
  }
}

// Run the script
createAdminAccount();
