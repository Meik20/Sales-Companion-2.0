// delete-companies.js
// Lancer : node server/delete-companies.js
require('dotenv').config();
const { db } = require('./firebase-config');

async function deleteCollection(collectionName, batchSize = 50) {
  console.log(`\n🗑️  Suppression de "${collectionName}"...`);
  let total = 0;
  let errors = 0;

  while (true) {
    try {
      const snap = await db.collection(collectionName).limit(batchSize).get();
      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      total += snap.size;
      console.log(`   ${total} documents supprimés...`);

      // Pause très longue pour éviter le quota
      await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
      if (e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('Quota exceeded')) {
        errors++;
        console.log(`   ⚠️  Quota dépassé (${errors}/3) — pause de 30s...`);
        if (errors >= 3) {
          console.log(`   ❌ Trop d'erreurs de quota. Arrêt.`);
          break;
        }
        await new Promise(r => setTimeout(r, 30000));
      } else {
        console.error(`   ❌ Erreur inattendue:`, e.message);
        throw e;
      }
    }
  }

  console.log(`✅ "${collectionName}" vidée — ${total} documents supprimés`);
}

async function main() {
  try {
    await deleteCollection('companies');
    // Décommentez si vous voulez aussi vider les logs :
    // await deleteCollection('usage_logs');
    console.log('\n🎉 Terminé !');
    process.exit(0);
  } catch(e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  }
}

main();