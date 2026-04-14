/**
 * Firebase Client Module
 * Initializes Firebase SDK for use in Electron renderer
 */

const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyCVJxyeysHWDQ7yECTb-GApJz7u8s5l7N0',
  authDomain: 'sales-companion-9cf56.firebaseapp.com',
  projectId: 'sales-companion-9cf56',
  storageBucket: 'sales-companion-9cf56.firebasestorage.app',
  messagingSenderId: '1058275289756',
  appId: '1:1058275289756:web:8c3a2f9b4e1d7c6f5a4b9e8d7c6f5a4b'
};

console.log('[Firebase] Initializing Firebase with config:', firebaseConfig.projectId);

try {
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  
  auth.languageCode = 'fr';
  
  console.log('✅ Firebase initialized successfully');
  console.log('✅ Auth and Firestore ready');
  
  // Export for use in renderer
  module.exports = {
    firebaseApp,
    auth,
    db,
    initializeApp,
    getAuth,
    getFirestore
  };
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  module.exports = {
    error: error.message
  };
}
