const { db } = require('./services/firebaseConfig');

async function check() {
    const doc = await db.collection('companies').doc('comp_1769147004783').get();
    if (doc.exists) {
        console.log('DATA:', JSON.stringify(doc.data(), null, 2));
    } else {
        console.log('NOT FOUND');
    }
}

check();
