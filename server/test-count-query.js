/**
 * Test count query on Firestore companies collection
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { auth } = require('./firebase-config'); // This initializes Firebase

async function test() {
  console.log('\n🧪 Testing count() on Firestore\n');
  
  try {
    const db = admin.firestore();
    
    // Test 1: Direct count().get()
    console.log('Test 1: Direct count().get()');
    try {
      const countSnap = await db.collection('companies').count().get();
      console.log('✅ count() works!');
      console.log('   Count value:', countSnap.data().count);
    } catch (e) {
      console.log('❌ count() error:', e.code, e.message);
    }
    
    // Test 2: Regular get() for comparison
    console.log('\nTest 2: Regular get() with limit');
    try {
      const snap = await db.collection('companies').limit(1000).get();
      console.log('✅ get() works!');
      console.log('   Documents loaded:', snap.docs.length);
    } catch (e) {
      console.log('❌ get() error:', e.message);
    }
    
    // Test 3: Get all docs (no limit) - might be slow
    console.log('\nTest 3: Get ALL documents (no limit)');
    try {
      const snap = await db.collection('companies').get();
      console.log('✅ Full get() works!');
      console.log('   Total documents:', snap.docs.length);
    } catch (e) {
      console.log('❌ get() error:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

test();
