/**
 * Firebase Configuration pour Mobile PWA
 * Configuration publique hardcodée pour production
 */

// Attendre que Firebase soit chargé (depuis CDN)
try {
  // Initialiser Firebase avec configuration publique hardcodée
  const firebaseConfig = {
    apiKey: 'AIzaSyCVJxyeysHWDQ7yECTb-GApJz7u8s5l7N0',
    authDomain: 'sales-companion-9cf56.firebaseapp.com',
    projectId: 'sales-companion-9cf56',
    storageBucket: 'sales-companion-9cf56.firebasestorage.app',
    messagingSenderId: '385537597968',
    appId: '1:385537597968:web:8c7e0f4e1d6c3b9a2e5f7c1d',
  };

  console.log('[Firebase Config] Initializing with:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });

  if (!window.firebase) {
    console.error('❌ Firebase SDK not loaded. Include Firebase CDN in HTML.');
  } else {
    firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase app initialized');

    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = firebase.storage();
    console.log('✓ Firebase Auth, Firestore, and Storage initialized');

    // Enable persistence
    window.db.enablePersistence().catch((error) => {
      if (error.code === 'failed-precondition') {
        console.info('Multiple tabs, persistence disabled');
      }
    });

    window.auth.languageCode = 'fr';
    console.log('✓ Firebase language set to French');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}
