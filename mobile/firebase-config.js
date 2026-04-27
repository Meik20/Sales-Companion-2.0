/**
 * Firebase Configuration pour Mobile PWA (utilisant les globals CDN)
 */

try {
  console.log('[Firebase Config] Initializing...');

  const firebaseConfig = {
    apiKey: 'AIzaSyB4N62OBpJ9xYkV34VKsJrYbR6Z6_NpSPg',  // Public API key
    authDomain: 'sales-companion-237.firebaseapp.com',
    projectId: 'sales-companion-237',
    storageBucket: 'sales-companion-237.firebasestorage.app',
    messagingSenderId: '1075913757125',
    appId: '1:1075913757125:web:71cc06fb7f55100c5fbbac',
  };

  const app = firebase.initializeApp(firebaseConfig);
  console.log('✓ Firebase app initialized');

  const auth = firebase.auth(app);
  let db = null;
  const storage = (firebase.storage) ? firebase.storage(app) : null;

  console.log('✓ Services initialized');

  // Initialize Firestore (compat) simply
  try {
    db = firebase.firestore(app);
  } catch (e) {
    console.warn('⚠️ Firestore initialization failed:', e && e.message ? e.message : e);
    db = null;
  }

  auth.languageCode = 'fr';

  // Exposer globalement
  window.auth = auth;
  window.db = db;
  window.storage = storage;

  console.log('✓ Firebase ready');

  // Maps Embed API key (set in environment or before loading the script)
  // Example: window.MAPS_EMBED_API_KEY = 'YOUR_KEY';
  if (typeof window.MAPS_EMBED_API_KEY === 'undefined') window.MAPS_EMBED_API_KEY = '';

} catch (error) {
  console.error('❌ Firebase init error:', error);
}