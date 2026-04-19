/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase - hardcodée pour production
 */

// Initialize Firebase with production config
const firebaseConfig = {
  apiKey: 'AIzaSyB4N62OBpJ9xYkV34VKsJrYbR6Z6_NpSPg',
  authDomain: 'sales-companion-237.firebaseapp.com',
  projectId: 'sales-companion-237',
  storageBucket: 'sales-companion-237.firebasestorage.app',
  messagingSenderId: '1075913757125',
  appId: '1:1075913757125:web:71cc06fb7f55100c5fbbac',
};

console.log('[Firebase Config] Using production Firebase configuration');

// Validate that config is present
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('❌ Firebase config incomplet - Firebase initialization failed');
}

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
console.log('✓ Firebase app initialized');

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
console.log('✓ Firebase services initialized (auth, db, storage)');

// Enable persistence
db.enablePersistence().catch((error) => {
  if (error.code === 'failed-precondition') {
    console.warn('⚠️ Multiple tabs open, persistence disabled');
  } else if (error.code === 'unimplemented') {
    console.warn('⚠️ Browser does not support persistence');
  }
});

// Set auth language
auth.languageCode = 'fr';

export { app, auth, db, storage };
