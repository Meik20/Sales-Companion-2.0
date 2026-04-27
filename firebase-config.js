/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase - production
 */

console.log('[Firebase Config] Initializing...');

const firebaseConfig = {
  apiKey: '' || '',  // Set in environment via /api/config/firebase
  authDomain: 'sales-companion-237.firebaseapp.com',
  projectId: 'sales-companion-237',
  storageBucket: 'sales-companion-237.firebasestorage.app',
  messagingSenderId: '1075913757125',
  appId: '1:1075913757125:web:71cc06fb7f55100c5fbbac',
};

// Validate config
if (!firebaseConfig.projectId) {
  console.warn('⚠️ Firebase config: projectId manquant');
}

// If apiKey is not set, skip automatic initialization. Admin UI will
// fetch runtime config from `/api/config/firebase` and call
// `firebase.initializeApp(cfg)` itself. This prevents invalid-api-key
// errors when the static file contains placeholders.
if (!firebaseConfig.apiKey) {
  console.log('[Firebase Config] apiKey empty — skipping automatic init');
  // expose helper for consumers that want to initialize from server config
  window.initFirebaseFromServer = async function() {
    try {
      const res = await fetch('/api/config/firebase');
      const cfg = await res.json();
      if (!cfg || !cfg.apiKey) throw new Error('No firebase config from server');
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      return { ok: true };
    } catch (e) {
      console.error('[initFirebaseFromServer] failed:', e.message || e);
      return { ok: false, error: e };
    }
  };

} else {
  try {
    // ── Initialisation de l'app ──────────────────────────────────────
    const app = firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase app initialized');

  // ── Services ─────────────────────────────────────────────────────
  const auth = firebase.auth();
  const storage = firebase.storage ? firebase.storage() : null;

  // ── Firestore — simple compat initialization (avoid advanced persistence)
  var db = null;
  try {
    db = firebase.firestore();
  } catch (e) {
    console.warn('⚠️ Firestore initialization failed, falling back to null:', e && e.message ? e.message : e);
    db = null;
  }

  // ── Langue ───────────────────────────────────────────────────────
  auth.languageCode = 'fr';

  // ── Exposition globale ────────────────────────────────────────────
  window.firebaseApp = { app, auth, db, storage };

  console.log('✓ Services initialized');
  console.log('✓ Firebase ready');

} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('Vérifiez votre configuration Firebase.');
}

// End of file - close else block if necessary

