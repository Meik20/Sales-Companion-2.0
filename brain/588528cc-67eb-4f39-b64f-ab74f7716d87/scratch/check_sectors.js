const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), 'apps', 'web', '.env.local') });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
  console.error('Missing Firebase environment variables. Check apps/web/.env.local');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkSectors() {
  const snap = await db.collection('companies').limit(100).get();
  console.log('--- Sample Sectors ---');
  const sectorsSet = new Set();
  snap.forEach(d => {
    const data = d.data();
    sectorsSet.add(data.sector || data.activite_principale || 'N/A');
  });
  
  Array.from(sectorsSet).forEach(s => console.log(`- [${s}]`));
  
  // Specifically look for BTP
  const btpSnap = await db.collection('companies').get();
  let btpCount = 0;
  let constructionCount = 0;
  btpSnap.forEach(d => {
    const sector = (d.data().sector || d.data().activite_principale || '').toLowerCase();
    if (sector.includes('btp')) btpCount++;
    if (sector.includes('construction')) constructionCount++;
  });
  
  console.log(`\nTotal companies with "BTP" in sector: ${btpCount}`);
  console.log(`Total companies with "Construction" in sector: ${constructionCount}`);
}

checkSectors().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
