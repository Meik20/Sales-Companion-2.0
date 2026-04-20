/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase - hardcodée pour production
 */

// Initialize Firebase with production config
const firebaseConfig = {
  apiKey: '' || '',  // Set in environment
  authDomain: 'sales-companion-237.firebaseapp.com',
  projectId: 'sales-companion-237',
  storageBucket: 'sales-companion-237.firebasestorage.app',
  messagingSenderId: '1075913757125',
  appId: '1:1075913757125:web:71cc06fb7f55100c5fbbac',
};

console.log('[Firebase Config] Using production Firebase configuration');

// Validate that config is present
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.warn('⚠️ Firebase config: apiKey may not be set - check environment variables');
}

// Initialize Firebase
try {
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
    } else {
      console.warn('⚠️ Persistence error:', error.message);
    }
  });

  // Set auth language
  auth.languageCode = 'fr';

  // Make globally available for client code
  window.firebaseApp = { app, auth, db, storage };
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('This may be a fatal error. Check your Firebase configuration.');
}

