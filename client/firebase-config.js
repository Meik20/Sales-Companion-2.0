/**
 * Firebase Configuration pour Client (Electron & Mobile)
 * Configuration Web SDK Firebase
 */

// Initialize Firebase
// Les valeurs sont injectées depuis index.html ou retriées du serveur
const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: window.FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: window.FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: window.FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: window.FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Import Firebase modules (utilisez CDN ou imports ES6)
// Pour Electron: npm install firebase
// Pour Web: utiliser les CDN Firebase

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable persistence
db.enablePersistence().catch((error) => {
  if (error.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence disabled');
  } else if (error.code === 'unimplemented') {
    console.warn('Browser does not support persistence');
  }
});

// Set auth language
auth.languageCode = 'fr';

export { app, auth, db, storage };
