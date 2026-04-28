/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase - production
 */

console.log('[Firebase Config] Initializing...');

try {
  const firebaseConfig = {
    apiKey: '' || '', // Set in environment via /api/config/firebase
    authDomain: 'sales-companion-237.firebaseapp.com',
    projectId: 'sales-companion-237',
    storageBucket: 'sales-companion-237.firebasestorage.app',
    messagingSenderId: '1075913757125',
    appId: '1:1075913757125:web:71cc06fb7f55100c5fbbac',
  };

  if (!firebaseConfig.projectId) {
    console.warn('⚠️ Firebase config: projectId manquant');
  }

  let app;
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase app initialized');
  } else {
    app = firebase.apps[0];
    console.log('✓ Firebase app already initialized, reusing');
  }

  const auth = firebase.auth(app);
  let db = null;
  const storage = (firebase.storage) ? firebase.storage(app) : null;

  try {
    db = firebase.firestore(app);
  } catch (e) {
    console.warn('⚠️ Firestore initialization failed:', e?.message || e);
    db = null;
  }

  auth.languageCode = 'fr';

  window.auth = auth;
  window._auth = auth;
  window.db = db;
  window._db = db;
  window.storage = storage;

  if (typeof window.MAPS_EMBED_API_KEY === 'undefined') window.MAPS_EMBED_API_KEY = '';

  console.log('✓ Firebase ready');
} catch (error) {
  console.error('❌ Firebase init error:', error);
}

