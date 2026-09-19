const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Load environment variables from .env.local
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_ADMIN_SDK_KEY;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY non trouvée.");
  process.exit(1);
}

let credential = JSON.parse(serviceAccountRaw);
const app = initializeApp({
  credential: cert(credential),
});

const db = getFirestore(app);

const PLAN_LIMITS = {
  free: 10,
  starter: 50,
  pro: 150,
  enterprise: 500,
};

async function main() {
  console.log("=== VÉRIFICATION ET SYNCHRONISATION DES ÉQUIPES ===");

  // 1. Rechercher Ivan Kevin MBAYE EYOUM (ou mbaye_ivan@outlook.fr)
  const ivanByEmail = await db.collection('users').where('email', '==', 'mbaye_ivan@outlook.fr').get();
  let ivanDoc = null;

  if (!ivanByEmail.empty) {
    ivanDoc = ivanByEmail.docs[0];
  } else {
    const ivanByName = await db.collection('users').where('name', '==', 'Ivan Kevin MBAYE EYOUM').get();
    if (!ivanByName.empty) {
      ivanDoc = ivanByName.docs[0];
    }
  }

  if (!ivanDoc) {
    console.error("Manager Ivan non trouvé !");
    return;
  }

  const ivanData = ivanDoc.data();
  const ivanUid = ivanDoc.id;
  const targetPlan = ivanData.plan || 'enterprise';
  const targetDailyLimit = PLAN_LIMITS[targetPlan] ?? 500;

  console.log(`Manager trouvé: ${ivanData.name} (${ivanData.email}) [UID: ${ivanUid}]`);
  console.log(`Plan du manager: ${targetPlan} (dailyLimit: ${targetDailyLimit})`);

  // 2. Chercher kevin mbaye (landrymbaye3@gmail.com)
  const kevinSnap = await db.collection('users').where('email', '==', 'landrymbaye3@gmail.com').get();
  if (kevinSnap.empty) {
    console.log("Membre Kevin (landrymbaye3@gmail.com) non trouvé dans 'users'");
  } else {
    kevinSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`Utilisateur kevin trouvé: id=${doc.id}, role=${d.role}, plan=${d.plan}, managerUid=${d.managerUid}`);
    });
  }

  // 3. Chercher tous les membres ayant managerUid === ivanUid et role === 'member'
  const membersSnap = await db.collection('users')
    .where('managerUid', '==', ivanUid)
    .where('role', '==', 'member')
    .get();

  console.log(`Nombre de membres trouvés dans 'users' pour Ivan: ${membersSnap.size}`);

  const userBatch = db.batch();
  membersSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(` -> Mise à jour user ${data.email || doc.id}: ${data.plan} => ${targetPlan}`);
    userBatch.update(doc.ref, {
      plan: targetPlan,
      dailyLimit: targetDailyLimit,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // Si Kevin n'a pas encore managerUid sur son doc user mais qu'il est membre d'Ivan dans team_accesses
  if (!kevinSnap.empty) {
    const kDoc = kevinSnap.docs[0];
    const kData = kDoc.data();
    if (kData.role === 'member' && kData.managerUid !== ivanUid) {
      console.log(` -> Attribution du managerUid ${ivanUid} à Kevin (${kDoc.id})`);
      userBatch.update(kDoc.ref, {
        managerUid: ivanUid,
        plan: targetPlan,
        dailyLimit: targetDailyLimit,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (kData.role === 'member' && kData.plan !== targetPlan) {
      console.log(` -> Alignement du plan de Kevin (${kDoc.id}) sur ${targetPlan}`);
      userBatch.update(kDoc.ref, {
        plan: targetPlan,
        dailyLimit: targetDailyLimit,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  await userBatch.commit();
  console.log("Mise à jour de la collection 'users' terminée.");

  // 4. Mettre à jour team_accesses
  const accessSnap = await db.collection('team_accesses')
    .where('managerUid', '==', ivanUid)
    .where('role', '==', 'member')
    .get();

  console.log(`Nombre d'accès 'member' trouvés dans team_accesses pour Ivan: ${accessSnap.size}`);
  if (!accessSnap.empty) {
    const accessBatch = db.batch();
    accessSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(` -> Mise à jour team_accesses ${data.email || data.accessId || doc.id}: ${data.plan} => ${targetPlan}`);
      accessBatch.update(doc.ref, {
        plan: targetPlan,
        dailyLimit: targetDailyLimit,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await accessBatch.commit();
    console.log("Mise à jour de 'team_accesses' terminée.");
  }

  // Vérifier également si Kevin a un document dans team_accesses sous son email
  const kevinAccessSnap = await db.collection('team_accesses')
    .where('email', '==', 'landrymbaye3@gmail.com')
    .get();

  if (!kevinAccessSnap.empty) {
    const kAccessBatch = db.batch();
    kevinAccessSnap.docs.forEach(doc => {
      const d = doc.data();
      if (d.role === 'member') {
        console.log(` -> team_accesses kevin trouvé: id=${doc.id}, plan=${d.plan} => ${targetPlan}`);
        kAccessBatch.update(doc.ref, {
          plan: targetPlan,
          dailyLimit: targetDailyLimit,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
    await kAccessBatch.commit();
  }

  console.log("=== SYNCHRONISATION TERMINÉE AVEC SUCCÈS ===");
}

main().catch(err => {
  console.error("Erreur lors de l'exécution:", err);
  process.exit(1);
});
