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
  const targetExpiresAt = ivanData.subscriptionExpiresAt ?? ivanData.planExpiresAt ?? null;
  const targetStartedAt = ivanData.subscriptionStartedAt ?? null;
  const targetExpired = ivanData.subscriptionExpired ?? false;

  console.log(`Manager trouvé: ${ivanData.name} (${ivanData.email}) [UID: ${ivanUid}]`);
  console.log(`Plan du manager: ${targetPlan} (dailyLimit: ${targetDailyLimit})`);
  console.log(`Validité abonnement: ${targetExpiresAt}`);

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

  // 3. Chercher Jules EYOUM (didibala87@gmail.com)
  const julesSnap = await db.collection('users').where('email', '==', 'didibala87@gmail.com').get();
  if (julesSnap.empty) {
    console.log("Support Agent Jules (didibala87@gmail.com) non trouvé dans 'users'");
  } else {
    julesSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`Utilisateur jules trouvé: id=${doc.id}, role=${d.role}, plan=${d.plan}, managerUid=${d.managerUid}`);
    });
  }

  // 4. Chercher tous les comptes associés ayant managerUid === ivanUid
  const teamUsersSnap = await db.collection('users')
    .where('managerUid', '==', ivanUid)
    .get();

  console.log(`Nombre d'utilisateurs associés trouvés dans 'users' pour Ivan: ${teamUsersSnap.size}`);

  const userBatch = db.batch();
  teamUsersSnap.docs.forEach(doc => {
    const data = doc.data();
    const isSupport = data.role === 'support_agent';
    console.log(` -> Mise à jour user ${data.email || doc.id} (${data.role}): validité => ${targetExpiresAt}`);

    const payload = {
      plan: targetPlan,
      subscriptionExpiresAt: targetExpiresAt,
      subscriptionStartedAt: targetStartedAt,
      subscriptionExpired: targetExpired,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!isSupport) {
      payload.dailyLimit = targetDailyLimit;
    }
    userBatch.update(doc.ref, payload);
  });

  // Si Kevin n'a pas encore managerUid sur son doc user mais qu'il est membre d'Ivan
  if (!kevinSnap.empty) {
    const kDoc = kevinSnap.docs[0];
    const kData = kDoc.data();
    console.log(` -> Alignement de Kevin (${kDoc.id}) sur validité=${targetExpiresAt}`);
    userBatch.update(kDoc.ref, {
      managerUid: ivanUid,
      plan: targetPlan,
      dailyLimit: targetDailyLimit,
      subscriptionExpiresAt: targetExpiresAt,
      subscriptionStartedAt: targetStartedAt,
      subscriptionExpired: targetExpired,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Si Jules n'a pas encore managerUid sur son doc user mais qu'il est support agent d'Ivan
  if (!julesSnap.empty) {
    const jDoc = julesSnap.docs[0];
    const jData = jDoc.data();
    console.log(` -> Alignement de Jules (${jDoc.id}) sur validité=${targetExpiresAt}`);
    userBatch.update(jDoc.ref, {
      managerUid: ivanUid,
      plan: targetPlan,
      subscriptionExpiresAt: targetExpiresAt,
      subscriptionStartedAt: targetStartedAt,
      subscriptionExpired: targetExpired,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await userBatch.commit();
  console.log("Mise à jour de la collection 'users' terminée.");

  // 5. Mettre à jour team_accesses
  const accessSnap = await db.collection('team_accesses')
    .where('managerUid', '==', ivanUid)
    .get();

  console.log(`Nombre d'accès trouvés dans team_accesses pour Ivan: ${accessSnap.size}`);
  if (!accessSnap.empty) {
    const accessBatch = db.batch();
    accessSnap.docs.forEach(doc => {
      const data = doc.data();
      const isSupport = data.role === 'support_agent';
      console.log(` -> Mise à jour team_accesses ${data.email || data.accessId || doc.id} (${data.role})`);
      const payload = {
        plan: targetPlan,
        subscriptionExpiresAt: targetExpiresAt,
        subscriptionStartedAt: targetStartedAt,
        subscriptionExpired: targetExpired,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!isSupport) {
        payload.dailyLimit = targetDailyLimit;
      }
      accessBatch.update(doc.ref, payload);
    });
    await accessBatch.commit();
    console.log("Mise à jour de 'team_accesses' terminée.");
  }

  // Mettre à jour l'accès de Kevin spécifiquement
  if (!kevinAccessSnap.empty) {
    const kAccessBatch = db.batch();
    kevinAccessSnap.docs.forEach(doc => {
      kAccessBatch.update(doc.ref, {
        plan: targetPlan,
        dailyLimit: targetDailyLimit,
        subscriptionExpiresAt: targetExpiresAt,
        subscriptionStartedAt: targetStartedAt,
        subscriptionExpired: targetExpired,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await kAccessBatch.commit();
  }

  // Mettre à jour l'accès de Jules spécifiquement
  const julesAccessSnap = await db.collection('team_accesses')
    .where('email', '==', 'didibala87@gmail.com')
    .get();

  if (!julesAccessSnap.empty) {
    const jAccessBatch = db.batch();
    julesAccessSnap.docs.forEach(doc => {
      jAccessBatch.update(doc.ref, {
        plan: targetPlan,
        subscriptionExpiresAt: targetExpiresAt,
        subscriptionStartedAt: targetStartedAt,
        subscriptionExpired: targetExpired,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await jAccessBatch.commit();
  }

  console.log("=== SYNCHRONISATION TERMINÉE AVEC SUCCÈS ===");
}

main().catch(err => {
  console.error("Erreur lors de l'exécution:", err);
  process.exit(1);
});
