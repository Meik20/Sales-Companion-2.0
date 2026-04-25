require('dotenv').config();
const { db } = require('./firebase-config');

(async () => {
  try {
    console.log('Testing Firestore collections...\n');
    
    const collections = ['users', 'companies', 'usage_logs'];
    
    for (const col of collections) {
      try {
        const snapshot = await db.collection(col).get();
        console.log(`📦 ${col}: ${snapshot.size} documents`);
        
        if (snapshot.size > 0) {
          const sample = snapshot.docs[0].data();
          console.log(`   Sample keys: ${Object.keys(sample).slice(0, 5).join(', ')}`);
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
      }
    }
  } catch (e) {
    console.error('Fatal error:', e.message);
  }
  process.exit(0);
})();
