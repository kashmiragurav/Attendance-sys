const fetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : require('node-fetch');

async function checkDB() {
    const PROJECT_ID = 'attendance-3519f';
    const API_KEY = 'AIzaSyAn8PQG85atGyDptxCMBj_LgKug-Sfd7nQ';
    const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/companies?key=${API_KEY}`;

    try {
        const res = await fetch(BASE_URL);
        const data = await res.json();
        console.log('--- DB DATA ---');
        if (data.error) {
            console.error('API Error:', data.error);
        } else if (data.documents) {
            data.documents.forEach(doc => {
                const fields = doc.fields;
                const name = fields.name ? fields.name.stringValue : 'N/A';
                const slug = fields.slug ? fields.slug.stringValue : 'MISSING';
                console.log(`Company: ${name} | Slug: ${slug}`);
            });
        } else {
            console.log('No documents found in "companies" collection (or database is empty):', data);
        }
        console.log('--- END ---');
    } catch (e) {
        console.error(e);
    }
}

checkDB();
