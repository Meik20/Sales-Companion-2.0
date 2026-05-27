const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.slice(0, firstEquals).trim();
    let val = trimmed.slice(firstEquals + 1).trim();
    // Remove quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY non trouvée.");
  process.exit(1);
}

let credential = JSON.parse(serviceAccountRaw);
const app = initializeApp({
  credential: cert(credential),
});

const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  const name = "Ivan Kevin MBAYE EYOUM";
  console.log(`Recherche de l'utilisateur : ${name}...`);

  const snap = await db.collection('users').where('name', '==', name).get();
  if (snap.empty) {
    console.error("Utilisateur introuvable !");
    process.exit(1);
  }

  const userDoc = snap.docs[0];
  const uid = userDoc.id;
  const data = userDoc.data();

  console.log(`Utilisateur trouvé : ID=${uid}, email=${data.email}, rôle actuel=${data.role}`);

  // Update role to admin
  await db.collection('users').doc(uid).update({
    role: 'admin',
    updatedAt: new Date()
  });

  // Set admin custom claim
  await auth.setCustomUserClaims(uid, { role: 'admin' });

  console.log(`Rôle mis à jour avec succès vers 'admin' dans Firestore et Auth Claims.`);
  process.exit(0);
}

run().catch(console.error);
