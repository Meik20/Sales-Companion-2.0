/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase - hardcodée pour production
 */

// Initialize Firebase with production config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '', // Set in .env
  authDomain: 'sales-companion-237.firebaseapp.com',
  projectId: 'sales-companion-237',
  storageBucket: 'sales-companion-237.firebasestorage.app',
  messagingSenderId: '1075913757125',
  appId: '1:1075913757125:web:71cc06fb7f55100c5fbbac',
};

console.log('[Firebase Config] Using production Firebase configuration');

let app = null;
let auth = null;
let db = null;
let storage = null;

try {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase app initialized');
  } else {
    app = firebase.apps[0];
    console.log('✓ Firebase app already initialized, reusing');
  }

  auth = firebase.auth(app);
  storage = (firebase.storage) ? firebase.storage(app) : null;

  try {
    db = firebase.firestore(app);
  } catch (e) {
    console.warn('⚠️ Firestore initialization failed:', e?.message || e);
    db = null;
  }

  auth.languageCode = 'fr';

  // Expose globals for older scripts expecting them
  if (typeof window !== 'undefined') {
    window.auth = auth;
    window._auth = auth;
    window.db = db;
    window._db = db;
    window.storage = storage;
    if (typeof window.MAPS_EMBED_API_KEY === 'undefined') window.MAPS_EMBED_API_KEY = '';
  }

  console.log('✓ Firebase ready');
} catch (error) {
  console.error('❌ Firebase init error:', error);
}

export { app, auth, db, storage };
