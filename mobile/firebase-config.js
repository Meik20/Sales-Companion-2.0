/**
 * Firebase Configuration pour Mobile PWA
 * Utilise les modules ES6 Firebase
 */

// Import Firebase modules (doivent être disponibles via le script principal index.html)
// Vérifiez que index.html charge le script type="module" avec les imports Firebase

(async function initializeFirebaseApp() {
  try {
    console.log('[Firebase Config] Waiting for Firebase SDK to load...');
    
    // Attendre que les fonctions Firebase soient disponibles
    let attempts = 0;
    while (!window.firebase && attempts < 100) {
      await new Promise(r => setTimeout(r, 50));
      attempts++;
    }
    
    if (!window.firebase) {
      console.error('❌ Firebase SDK not loaded. Verify index.html has ES6 module script.');
      return;
    }

    // Configuration Firebase publique
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

    // Initialize Firebase app
    const app = window.firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase app initialized');

    // Get Firebase services
    window.auth = window.firebase.getAuth(app);
    window.db = window.firebase.getFirestore(app);
    window.storage = window.firebase.getStorage(app);
    console.log('✓ Firebase Auth, Firestore, and Storage initialized');

    // Enable persistence
    window.db.enablePersistence().catch((error) => {
      if (error.code === 'failed-precondition') {
        console.info('⚠️ Multiple tabs, persistence disabled');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Browser does not support persistence');
      }
    });

    window.auth.languageCode = 'fr';
    console.log('✓ Firebase language set to French');
    console.log('✓ Firebase initialization complete');
    
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
})();
