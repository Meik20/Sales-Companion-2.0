/**
 * Firebase Configuration & Initialization
 * Version robuste pour Railway + local
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let firebaseApp = null;

// ── VALIDATION DES VARIABLES D'ENV ─────────────────────────────
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);

// ── INITIALISATION FIREBASE ────────────────────────────────────
if (missingVars.length === 0) {
  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL ||
        'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized (production)');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
}

// ── FALLBACK LOCAL DEV ─────────────────────────────────────────
else if (process.env.NODE_ENV === 'development') {
  try {
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase initialized (local file)');
  } catch (error) {
    console.warn('⚠️ No Firebase service account file found (dev mode)');
  }
}

// ── LOG SI CONFIG MANQUANTE ────────────────────────────────────
else {
  console.error('❌ Missing Firebase environment variables:', missingVars);
  console.error('👉 Add them in Railway → Variables');
}

// ── SERVICES FIREBASE (SAFE) ───────────────────────────────────
let db = null;
let auth = null;

if (firebaseApp) {
  db = admin.firestore();
  auth = admin.auth();

  // Optionnel : config Firestore
  if (process.env.NODE_ENV === 'development') {
    db.settings({ ignoreUndefinedProperties: true });
  }
}

// ── EXPORTS ────────────────────────────────────────────────────
module.exports = {
  admin,
  firebaseApp,
  db,
  auth,
};