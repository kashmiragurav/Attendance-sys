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

async function seedCompanies() {
    const companies = [
        {
            id: 'comp_default',
            data: {
                name: 'Digisahyadri PVT LTD',
                slug: 'digisahyadri',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        },
        {
            id: 'SYSTEM',
            data: {
                name: 'System Admin Company',
                slug: 'system',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        }
    ];

    console.log('🚀 Seeding Company Documents...');

    for (const comp of companies) {
        const fields = {};
        Object.entries(comp.data).forEach(([key, value]) => {
            fields[key] = toFirestoreValue(value);
        });

        try {
            const response = await fetch(
                `${BASE_URL}/companies/${comp.id}?key=${API_KEY}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields }),
                }
            );

            if (response.ok) {
                console.log(`✅ Company '${comp.id}' (${comp.data.name}) seeded successfully!`);
            } else {
                const error = await response.text();
                console.error(`❌ Failed to seed company '${comp.id}':`, error);
            }
        } catch (err) {
            console.error(`❌ Error seeding company '${comp.id}':`, err.message);
        }
    }
}

seedCompanies();
