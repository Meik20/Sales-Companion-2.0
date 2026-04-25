/**
 * Quick test to verify companies count in Firestore
 */

require('dotenv').config();
const { auth } = require('./firebase-config');
const admin = require('firebase-admin');

async function test() {
  console.log('\n🔍 Testing companies count in Firestore\n');
  
  try {
    const db = admin.firestore();
    
    // Count documents in companies collection
    const snapshot = await db.collection('companies').get();
    console.log('📊 Total companies in Firestore:', snapshot.size);
    
    // Get first 5 companies as sample
    if (snapshot.size > 0) {
      console.log('\n📋 First 5 companies:');
      snapshot.docs.slice(0, 5).forEach((doc, i) => {
        const data = doc.data();
        console.log(`  ${i+1}. ${data.raisonSociale || data.raison_sociale || '—'} (${doc.id})`);
      });
    }
    
    // Count by region
    const regionMap = {};
    snapshot.forEach(doc => {
      const region = doc.data().region || 'unknown';
      regionMap[region] = (regionMap[region] || 0) + 1;
    });
    
    console.log('\n🗺️  Companies by region:');
    Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([region, count]) => {
      console.log(`  ${region}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
