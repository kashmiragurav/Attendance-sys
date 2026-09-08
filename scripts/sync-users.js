const fetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : require('node-fetch');

const PROJECT_ID = 'attendance-3519f';
const API_KEY = 'AIzaSyAn8PQG85atGyDptxCMBj_LgKug-Sfd7nQ';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const fromFirestoreValue = (firestoreValue) => {
    if (firestoreValue.stringValue !== undefined) return firestoreValue.stringValue;
    if (firestoreValue.integerValue !== undefined) return parseInt(firestoreValue.integerValue);
    if (firestoreValue.doubleValue !== undefined) return parseFloat(firestoreValue.doubleValue);
    if (firestoreValue.booleanValue !== undefined) return firestoreValue.booleanValue;
    return null;
};

const toFirestoreValue = (value) => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') return { integerValue: value.toString() };
    if (typeof value === 'boolean') return { booleanValue: value };
    return { stringValue: JSON.stringify(value) };
};

async function syncUsers() {
    try {
        console.log('🔄 Fetching all users to sync companyId...');
        const response = await fetch(`${BASE_URL}/users?key=${API_KEY}`);
        const result = await response.json();

        if (!result.documents) {
            console.log('No users found.');
            return;
        }

        for (const doc of result.documents) {
            const uid = doc.name.split('/').pop();
            const fields = doc.fields;
            const role = fromFirestoreValue(fields.role || {});
            const currentCompanyId = fromFirestoreValue(fields.companyId || {});

            // If it's not a super admin and doesn't have a valid companyId, set it to comp_default
            if (role !== 'SUPER_ADMIN' && (!currentCompanyId || currentCompanyId === 'SYSTEM')) {
                console.log(`Updating user ${uid}...`);

                const updatedFields = { ...fields };
                updatedFields.companyId = toFirestoreValue('comp_default');

                await fetch(
                    `${BASE_URL}/users/${uid}?key=${API_KEY}&updateMask.fieldPaths=companyId`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fields: updatedFields }),
                    }
                );
            }
        }
        console.log('✅ User sync complete.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

syncUsers();
