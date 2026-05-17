import 'dotenv/config'
import { adminDb, adminAuth } from './src/firebase/admin'

async function testFirebaseInit() {
  console.log('Testing Firebase Admin SDK Initialization...')
  try {
    // Test Firestore
    console.log('Testing Firestore connection...')
    const collections = await adminDb.listCollections()
    console.log(`✅ Firestore connected. Found ${collections.length} collections.`)

    console.log('\nTesting Firestore Read/Write operations...')
    const testDocRef = adminDb.collection('_test_connection').doc('ping')

    // Write
    await testDocRef.set({ timestamp: new Date(), message: 'Hello Firestore' })
    console.log(`✅ Firestore Write successful.`)

    // Read
    const docSnap = await testDocRef.get()
    if (docSnap.exists) {
      console.log(`✅ Firestore Read successful. Data:`, docSnap.data())
    }

    // Delete
    await testDocRef.delete()
    console.log(`✅ Firestore Delete successful (Cleaned up test document).`)

    // Test Auth
    console.log('Testing Firebase Auth connection...')
    const users = await adminAuth.listUsers(1)
    console.log(`✅ Firebase Auth connected. Retrieved users batch.`)

    console.log('\n🎉 All Firebase Admin services initialized successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Firebase Initialization Failed:')
    console.error(error)
    process.exit(1)
  }
}

testFirebaseInit()
