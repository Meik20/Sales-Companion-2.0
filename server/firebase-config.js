/**
 * Firebase Configuration & Initialization
 * Admin SDK pour backend
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // Option 1: Via Environment Variables (recommandé pour production)
  if (process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
    console.log('✅ Firebase Admin SDK initialized (via env)');
  }

  // Option 2: Via Firebase Config File (pour développement local)
  else if (process.env.NODE_ENV === 'development') {
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    try {
      const serviceAccount = require(serviceAccountPath);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized (via service account file)');
    } catch {
      console.warn('⚠️ Firebase service account file not found. Using emulator mode.');
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

// Get Firebase services
const db = admin.firestore();
const auth = admin.auth();

// Set Firestore settings for development
if (process.env.NODE_ENV === 'development') {
  db.settings({ ignoreUndefinedProperties: true });
}

module.exports = {
  admin,
  firebaseApp,
  db,
  auth,
};
