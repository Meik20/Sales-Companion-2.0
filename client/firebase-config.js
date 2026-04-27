/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase - hardcodée pour production
 */

// Initialize Firebase with production config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',  // Set in .env
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
let db = null;
const storage = (firebase.storage) ? firebase.storage() : null;
console.log('✓ Firebase services initialized (auth, storage)');

// Initialize Firestore (compat) without enabling advanced persistence here
try {
  db = firebase.firestore();
} catch (e) {
  console.warn('⚠️ Firestore initialization failed:', e && e.message ? e.message : e);
  db = null;
}

// Set auth language
auth.languageCode = 'fr';

export { app, auth, db, storage };
