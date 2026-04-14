/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase - hardcodée pour production
 */

// Initialize Firebase with production config
const firebaseConfig = {
  apiKey: 'AIzaSyCVJxyeysHWDQ7yECTb-GApJz7u8s5l7N0',
  authDomain: 'sales-companion-9cf56.firebaseapp.com',
  projectId: 'sales-companion-9cf56',
  storageBucket: 'sales-companion-9cf56.firebasestorage.app',
  messagingSenderId: '385537597968',
  appId: '1:385537597968:web:8c7e0f4e1d6c3b9a2e5f7c1d',
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
