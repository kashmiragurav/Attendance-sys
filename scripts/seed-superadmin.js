const fetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : require('node-fetch');

const PROJECT_ID = 'attendance-3519f';
const API_KEY = 'AIzaSyAn8PQG85atGyDptxCMBj_LgKug-Sfd7nQ';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const simpleHash = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

const toFirestoreValue = (value) => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') return { integerValue: value.toString() };
    if (typeof value === 'boolean') return { booleanValue: value };
    return { stringValue: JSON.stringify(value) };
};

async function createSuperAdmin() {
    const email = 'superadmin@system.com';
    const password = 'admin123';
    const uid = 'user_super_admin_001';

    console.log('🚀 Creating Super Admin...');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    const userData = {
        uid,
        employeeId: 'SA001',
        email,
        passwordHash: simpleHash(password),
        name: 'System Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyId: 'SYSTEM', // System level
    };

    const fields = {};
    Object.entries(userData).forEach(([key, value]) => {
        fields[key] = toFirestoreValue(value);
    });

    try {
        const response = await fetch(
            `${BASE_URL}/users/${uid}?key=${API_KEY}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields }),
            }
        );

        if (response.ok) {
            console.log('✅ Super Admin created successfully!');
            console.log('You can now login with:');
            console.log(`Identifier: ${email}`);
            console.log(`Password: ${password}`);
        } else {
            const error = await response.text();
            console.error('❌ Failed to create Super Admin:', error);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

createSuperAdmin();
