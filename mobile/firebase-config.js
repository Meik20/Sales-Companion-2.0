/**
 * Firebase Configuration pour Mobile PWA
 * Même configuration que le client Electron
 */

// Attendre que Firebase soit chargé (depuis CDN ou import)
try {
  // Initialiser Firebase
  const firebaseConfig = {
    apiKey: localStorage.getItem('firebase_api_key') || window.FIREBASE_API_KEY || '',
    authDomain: localStorage.getItem('firebase_auth_domain') || window.FIREBASE_AUTH_DOMAIN || '',
    projectId: localStorage.getItem('firebase_project_id') || window.FIREBASE_PROJECT_ID || '',
    storageBucket: localStorage.getItem('firebase_storage_bucket') || window.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: localStorage.getItem('firebase_messaging_sender_id') || window.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: localStorage.getItem('firebase_app_id') || window.FIREBASE_APP_ID || '',
  };

  if (!window.firebase) {
    console.warn('Firebase SDK not loaded. Include Firebase CDN in HTML.');
  } else {
    firebase.initializeApp(firebaseConfig);

    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = firebase.storage();

    // Enable persistence
    window.db.enablePersistence().catch((error) => {
      if (error.code === 'failed-precondition') {
        console.info('Multiple tabs, persistence disabled');
      }
    });

    window.auth.languageCode = 'fr';
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}
