const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'attendance-3519f',
  databaseURL: 'https://attendance-3519f.firebaseio.com'
});

const auth = admin.auth();
const db = admin.firestore();

async function setupAdmin() {
  try {
    console.log('🔧 Creating admin account...');
    
    const email = 'admin@company.com';
    const password = 'AdminPassword123';
    
    // Create auth user
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: 'Admin User'
    });
    
    const uid = userRecord.uid;
    console.log('✅ Admin auth user created:', uid);
    
    // Create Firestore document
    await db.collection('employees').doc(uid).set({
      uid: uid,
      email: email,
      name: 'Admin User',
      department: 'Management',
      phone: '',
      isActive: true,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
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
