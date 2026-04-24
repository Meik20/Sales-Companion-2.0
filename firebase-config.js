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

try {
  // ── Initialisation de l'app ──────────────────────────────────────
  const app = firebase.initializeApp(firebaseConfig);
  console.log('✓ Firebase app initialized');

  // ── Services ─────────────────────────────────────────────────────
  const auth = firebase.auth();
  const storage = firebase.storage ? firebase.storage() : null;

  // ── Firestore — API moderne sans dépréciation ─────────────────────
  // On utilise uniquement db.settings() — plus d'enablePersistence()
  // ni enableMultiTabIndexedDbPersistence() qui sont dépréciés
  const db = firebase.firestore();

  // Cache illimité (remplace enablePersistence)
  try {
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
  } catch (settingsErr) {
    // settings() doit être appelé avant toute opération Firestore
    // Si déjà initialisé, ignorer l'erreur
    console.warn('⚠️ Firestore settings déjà appliqués:', settingsErr.message);
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
