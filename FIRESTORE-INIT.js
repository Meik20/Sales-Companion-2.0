#!/usr/bin/env node

/**
 * 🚀 Firestore Initialization Script
 * 
 * Usage: node FIRESTORE-INIT.js
 * 
 * This script initializes the Firestore database with:
 * - Collections structure
 * - Test data (users, companies, config)
 * - Security rules deployment
 * 
 * Prerequisites:
 * - Firebase Admin SDK configured (.env or service account file)
 * - Node.js v16+
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT || 
                         path.join(__dirname, 'firebase-service-account.json');
  
  if (fs.existsSync(credentialPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(require(credentialPath))
    });
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

// ═══════════════════════════════════════════════════════════════════
// 📊 INITIALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize test users with different roles
 */
async function initializeUsers() {
  console.log('\n📝 Initializing Users Collection...');
  const batch = db.batch();
  
  try {
    // Create test admin user
    console.log('  ↳ Creating admin user...');
    let adminUser;
    try {
      adminUser = await auth.getUserByEmail('admin@salescompanion.cm');
    } catch (e) {
      adminUser = await auth.createUser({
        email: 'admin@salescompanion.cm',
        password: 'Admin@12345'
      });
    }
    
    // Set admin custom claims
    await auth.setCustomUserClaims(adminUser.uid, { admin: true });
    
    // Create admin profile in Firestore
    batch.set(db.collection('users').doc(adminUser.uid), {
      uid: adminUser.uid,
      email: 'admin@salescompanion.cm',
      name: 'Jean Admin',
      role: 'admin',
      plan: 'enterprise',
      daily_limit: 1000,
      daily_used: 0,
      last_reset: new Date(),
      remaining: 1000,
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log(`  ✓ Admin user created: ${adminUser.uid}`);
    
    // Create test regular user
    console.log('  ↳ Creating regular user...');
    let regularUser;
    try {
      regularUser = await auth.getUserByEmail('user@salescompanion.cm');
    } catch (e) {
      regularUser = await auth.createUser({
        email: 'user@salescompanion.cm',
        password: 'User@12345'
      });
    }
    
    // Create user profile in Firestore
    batch.set(db.collection('users').doc(regularUser.uid), {
      uid: regularUser.uid,
      email: 'user@salescompanion.cm',
      name: 'Pierre Utilisateur',
      role: 'user',
      plan: 'starter',
      daily_limit: 50,
      daily_used: 5,
      last_reset: new Date(),
      remaining: 45,
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log(`  ✓ Regular user created: ${regularUser.uid}`);
    
    await batch.commit();
    console.log('✅ Users collection initialized');
    
    return { adminUser, regularUser };
  } catch (error) {
    console.error('❌ Error initializing users:', error.message);
    throw error;
  }
}

/**
 * Initialize companies collection
 */
async function initializeCompanies() {
  console.log('\n📝 Initializing Companies Collection...');
  const batch = db.batch();
  
  try {
    const companies = [
      {
        raison_sociale: 'Acme Construction SARL',
        sigle: 'ACME',
        niu: '1234567890001',
        sector: 'BTP et construction',
        region: 'Littoral',
        city: 'Douala',
        activite_principale: 'Construction bâtiments',
        centre_rattachement: 'Douala/Littoral',
        statut_juridique: 'SARL',
        telephone: '+237612345678',
        email: 'contact@acme.cm',
        site_web: 'www.acme.cm',
        dirigeant: 'Jean Dupont',
        rccm: 'RC/DLA/2024/A/001234',
        adresse: '123 Rue de la Paix, Douala'
      },
      {
        raison_sociale: 'TechHub Cameroon Inc',
        sigle: 'THC',
        niu: '1234567890002',
        sector: 'Informatique et télécommunications',
        region: 'Centre',
        city: 'Yaoundé',
        activite_principale: 'Services informatiques',
        centre_rattachement: 'Yaoundé/Centre',
        statut_juridique: 'SARL',
        telephone: '+237712345678',
        email: 'info@techhub.cm',
        site_web: 'www.techhub.cm',
        dirigeant: 'Marie Kameni',
        rccm: 'RC/YDE/2024/B/002345',
        adresse: '456 Avenue Foch, Yaoundé'
      },
      {
        raison_sociale: 'Agro Export Cameroon Ltd',
        sigle: 'AEC',
        niu: '1234567890003',
        sector: 'Agriculture et agroalimentaire',
        region: 'Sud',
        city: 'Kribi',
        activite_principale: 'Export produits agricoles',
        centre_rattachement: 'Kribi/Sud',
        statut_juridique: 'SARL',
        telephone: '+237812345678',
        email: 'export@agroexport.cm',
        site_web: 'www.agroexport.cm',
        dirigeant: 'Pierre Nzambi',
        rccm: 'RC/KRB/2024/C/003456',
        adresse: '789 Boulevard Maritime, Kribi'
      }
    ];
    
    companies.forEach((company, index) => {
      const docRef = db.collection('companies').doc(`company-${index + 1}`);
      batch.set(docRef, {
        id: `company-${index + 1}`,
        ...company,
        active: true,
        source: 'test_initialization',
        imported_by: 'system',
        imported_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`  ↳ Company added: ${company.raison_sociale}`);
    });
    
    await batch.commit();
    console.log(`✅ ${companies.length} companies initialized`);
  } catch (error) {
    console.error('❌ Error initializing companies:', error.message);
    throw error;
  }
}

/**
 * Initialize config collection
 */
async function initializeConfig() {
  console.log('\n📝 Initializing Config Collection...');
  const batch = db.batch();
  
  try {
    const configs = [
      {
        key: 'app_version',
        value: '2.0.0',
        type: 'public',
        description: 'Version actuelle de l\'application'
      },
      {
        key: 'max_import_rows',
        value: '5000',
        type: 'public',
        description: 'Nombre maximum de lignes par import Excel'
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'public',
        description: 'Mode maintenance de l\'application'
      },
      {
        key: 'groq_api_key',
        value: process.env.GROQ_API_KEY || 'placeholder-groq-key',
        type: 'secret',
        description: 'Clé API Groq pour l\'assistant IA'
      }
    ];
    
    configs.forEach(config => {
      const docRef = db.collection('config').doc(config.key);
      batch.set(docRef, {
        ...config,
        updated_at: new Date(),
        updated_by: 'system'
      });
      console.log(`  ↳ Config added: ${config.key}`);
    });
    
    await batch.commit();
    console.log(`✅ ${configs.length} configs initialized`);
  } catch (error) {
    console.error('❌ Error initializing config:', error.message);
    throw error;
  }
}

/**
 * Initialize subcollection pipeline for a user
 */
async function initializeUserPipeline(userId) {
  console.log('\n📝 Initializing User Pipeline (subcollection)...');
  const batch = db.batch();
  
  try {
    const prospects = [
      {
        company_name: 'Acme Construction SARL',
        company_sector: 'BTP et construction',
        company_city: 'Douala',
        company_phone: '+237612345678',
        company_email: 'contact@acme.cm',
        status: 'prospection',
        note: 'Contact pris via LinkedIn',
        next_action: 'Rappel téléphonique',
        next_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
      },
      {
        company_name: 'TechHub Cameroon Inc',
        company_sector: 'Informatique et télécommunications',
        company_city: 'Yaoundé',
        company_phone: '+237712345678',
        company_email: 'info@techhub.cm',
        status: 'negociation',
        note: 'Proposition commerciale envoyée',
        next_action: 'Suivre réponse',
        next_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // +3 days
      }
    ];
    
    prospects.forEach((prospect, index) => {
      const docRef = db.collection('users').doc(userId)
                       .collection('pipeline').doc(`prospect-${index + 1}`);
      batch.set(docRef, {
        id: `prospect-${index + 1}`,
        ...prospect,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`  ↳ Prospect added: ${prospect.company_name} (${prospect.status})`);
    });
    
    await batch.commit();
    console.log(`✅ ${prospects.length} prospects added to pipeline`);
  } catch (error) {
    console.error('❌ Error initializing pipeline:', error.message);
    throw error;
  }
}

/**
 * Initialize sample saved search
 */
async function initializeSavedSearches(userId) {
  console.log('\n📝 Initializing Saved Searches...');
  
  try {
    const search = {
      uid: userId,
      title: 'BTP Douala — Prospects avril 2026',
      query: 'BTP Douala',
      filters: {
        sector: 'BTP et construction',
        region: 'Littoral',
        city: 'Douala'
      },
      results: [
        {
          id: 'company-1',
          raison_sociale: 'Acme Construction SARL',
          sector: 'BTP et construction',
          city: 'Douala'
        }
      ],
      results_count: 1,
      created_at: new Date(),
      updated_at: new Date(),
      last_accessed: new Date()
    };
    
    await db.collection('saved_searches').add(search);
    console.log(`✅ Saved search initialized`);
  } catch (error) {
    console.error('❌ Error initializing saved searches:', error.message);
    throw error;
  }
}

/**
 * Deploy Firestore Security Rules
 */
async function deploySecurityRules() {
  console.log('\n📝 Deploying Firestore Security Rules...');
  
  try {
    const rulesPath = path.join(__dirname, 'firestore.rules');
    
    if (!fs.existsSync(rulesPath)) {
      console.log('  ⚠️  firestore.rules not found. Skipping rules deployment.');
      console.log('  → See FIRESTORE-COLLECTIONS.md for rules content');
      return;
    }
    
    // Note: Actual deployment requires Firebase CLI
    console.log('  ℹ️  To deploy rules, run:');
    console.log('     firebase deploy --only firestore:rules');
    
  } catch (error) {
    console.error('❌ Error with security rules:', error.message);
  }
}

/**
 * Print summary of initialized data
 */
async function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FIRESTORE INITIALIZATION SUMMARY');
  console.log('═'.repeat(60));
  
  try {
    const collections = ['users', 'companies', 'config', 'usage_logs', 'saved_searches', 'admin_logs'];
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection).limit(1).get();
      const count = snapshot.size;
      console.log(`  ${collection.padEnd(20)} ${count > 0 ? '✓' : '●'} initialized`);
    }
    
    console.log('\n🔑 Test Credentials:');
    console.log('  Admin:');
    console.log('    Email:    admin@salescompanion.cm');
    console.log('    Password: Admin@12345');
    console.log('  Regular User:');
    console.log('    Email:    user@salescompanion.cm');
    console.log('    Password: User@12345');
    
    console.log('\n📚 Next Steps:');
    console.log('  1. Deploy Firebase Security Rules: firebase deploy --only firestore:rules');
    console.log('  2. Create Firestore indexes (if needed): Firebase Console → Indexes');
    console.log('  3. Test authentication: node test-auth.js');
    console.log('  4. Start server: npm start');
    
  } catch (error) {
    console.error('Error printing summary:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('🚀 Starting Firestore Initialization...\n');
  
  try {
    const { adminUser, regularUser } = await initializeUsers();
    await initializeCompanies();
    await initializeConfig();
    await initializeUserPipeline(regularUser.uid);
    await initializeSavedSearches(regularUser.uid);
    await deploySecurityRules();
    await printSummary();
    
    console.log('\n✅ Firestore initialization completed successfully!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { initializeUsers, initializeCompanies, initializeConfig };
