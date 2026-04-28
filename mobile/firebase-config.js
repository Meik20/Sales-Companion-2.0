/**
 * Firebase Configuration pour Mobile PWA (utilisant les globals CDN)
 */

try {
  const firebaseConfig = {
    apiKey: 'AIzaSyB4N62OBpJ9xYkV34VKsJrYbR6Z6_NpSPg',
    authDomain: 'sales-companion-237.firebaseapp.com',
    projectId: 'sales-companion-237',
    storageBucket: 'sales-companion-237.firebasestorage.app',
    messagingSenderId: '1075913757125',
    appId: '1:1075913757125:web:71cc06fb7f55100c5fbbac',
  };

  // ✅ Vérifier si déjà initialisé avant d'appeler initializeApp
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

  // ✅ Exposer sur TOUTES les clés attendues par les autres fichiers
  window.auth = auth;
  window._auth = auth;    // ← utilisé par team-manager-mobile.js et member-access.js
  window.db = db;
  window._db = db;        // ← utilisé partout via getDb()
  window.storage = storage;

  if (typeof window.MAPS_EMBED_API_KEY === 'undefined') window.MAPS_EMBED_API_KEY = '';

  console.log('✓ Firebase ready');
} catch (error) {
  console.error('❌ Firebase init error:', error);
}