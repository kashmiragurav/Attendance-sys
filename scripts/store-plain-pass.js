const fetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : require('node-fetch');

const PROJECT_ID = 'attendance-3519f';
const API_KEY = 'AIzaSyAn8PQG85atGyDptxCMBj_LgKug-Sfd7nQ';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const toFirestoreValue = (value) => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') return { integerValue: value.toString() };
    if (typeof value === 'boolean') return { booleanValue: value };
    return { stringValue: JSON.stringify(value) };
};

async function updateSuperAdminPassword() {
    const uid = 'user_super_admin_001';
    const plainPassword = 'admin123';

    console.log(`🔄 Adding plain password to Super Admin document...`);

    const fields = {
        plainPassword: toFirestoreValue(plainPassword)
    };

    try {
        const response = await fetch(
            `${BASE_URL}/users/${uid}?key=${API_KEY}&updateMask.fieldPaths=plainPassword`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields }),
            }
        );

        if (response.ok) {
            console.log('✅ Success! Plain password stored in database for reference.');
        } else {
            const error = await response.text();
            console.error('❌ Failed:', error);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

updateSuperAdminPassword();
