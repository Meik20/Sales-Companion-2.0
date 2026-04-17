/**
 * Firebase Configuration pour Mobile PWA (v9 modulaire)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

try {
  console.log('[Firebase Config] Initializing...');

  const firebaseConfig = {
    apiKey: 'AIzaSyCVJxyeysHWDQ7yECTb-GApJz7u8s5l7N0',
    authDomain: 'sales-companion-9cf56.firebaseapp.com',
    projectId: 'sales-companion-9cf56',
    storageBucket: 'sales-companion-9cf56.firebasestorage.app',
    messagingSenderId: '385537597968',
    appId: '1:385537597968:web:8c7e0f4e1d6c3b9a2e5f7c1d',
  };

  const app = initializeApp(firebaseConfig);
  console.log('✓ Firebase app initialized');

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  console.log('✓ Services initialized');

  // Persistence offline
  enableIndexedDbPersistence(db).catch((error) => {
    if (error.code === 'failed-precondition') {
      console.info('⚠️ Multiple tabs ouvertes');
    } else if (error.code === 'unimplemented') {
      console.warn('⚠️ Navigateur non supporté');
    }
  });

  auth.languageCode = 'fr';

  // Exposer globalement (optionnel)
  window.auth = auth;
  window.db = db;
  window.storage = storage;

  console.log('✓ Firebase ready');

} catch (error) {
  console.error('❌ Firebase init error:', error);
}