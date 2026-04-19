// reset-firestore.js
// Réinitialisation complète de Firestore
// ATTENTION: Supprime TOUTES les données!
// Lancer : node server/reset-firestore.js
require('dotenv').config();
const { db } = require('./firebase-config');

const COLLECTIONS_TO_RESET = [
  'companies',
  'users',
  'usage_logs',
  'saved_searches',
  'config',
  'admin_logs'
];

async function deleteCollection(collectionName, batchSize = 10) {
  console.log(`\n🗑️  Suppression de "${collectionName}"...`);
  let total = 0;
  let errors = 0;
  const maxErrors = 5;

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
      await new Promise(r => setTimeout(r, 10000)); // 10 secondes
    } catch (e) {
      if (e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('Quota exceeded')) {
        errors++;
        console.log(`   ⚠️  Quota dépassé (${errors}/${maxErrors}) — pause de 60s...`);
        if (errors >= maxErrors) {
          console.log(`   ❌ Trop d'erreurs de quota. Abandon de "${collectionName}".`);
          break;
        }
        await new Promise(r => setTimeout(r, 60000)); // 60 secondes
      } else {
        console.error(`   ❌ Erreur inattendue:`, e.message);
        throw e;
      }
    }
  }

  console.log(`✅ "${collectionName}" vidée — ${total} documents supprimés`);
  return total;
}

async function recreateConfig() {
  console.log('\n⚙️  Recréation de la configuration par défaut...');

  try {
    // Configuration par défaut (sans clé API Groq)
    await db.collection('config').doc('groq_api_key').set({
      value: null,
      description: 'Clé API Groq pour l\'assistant IA',
      updated_at: new Date().toISOString()
    });

    console.log('✅ Configuration recréée');
  } catch (e) {
    console.error('❌ Erreur lors de la recréation de config:', e.message);
  }
}

async function main() {
  console.log('🚨 ATTENTION: Cette opération va SUPPRIMER TOUTES les données Firestore!');
  console.log('Collections concernées:', COLLECTIONS_TO_RESET.join(', '));
  console.log('Cette action est IRRÉVERSIBLE!\n');

  // Confirmation manuelle requise
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Tapez "RESET-ALL-DATA" pour confirmer: ', async (answer) => {
    if (answer !== 'RESET-ALL-DATA') {
      console.log('❌ Confirmation incorrecte. Abandon.');
      rl.close();
      process.exit(1);
    }

    rl.question('Tapez "JE SUIS SUR" pour confirmer une deuxième fois: ', async (answer2) => {
      if (answer2 !== 'JE SUIS SUR') {
        console.log('❌ Confirmation incorrecte. Abandon.');
        rl.close();
        process.exit(1);
      }

      console.log('\n🔄 Démarrage de la réinitialisation...\n');

      try {
        let totalDeleted = 0;

        for (const collection of COLLECTIONS_TO_RESET) {
          const deleted = await deleteCollection(collection);
          totalDeleted += deleted;
        }

        await recreateConfig();

        console.log(`\n🎉 Réinitialisation terminée!`);
        console.log(`📊 Total supprimé: ${totalDeleted} documents`);
        console.log(`🔄 Configuration recréée`);

      } catch (e) {
        console.error('\n❌ Erreur lors de la réinitialisation:', e.message);
        process.exit(1);
      }

      rl.close();
    });
  });
}

main();