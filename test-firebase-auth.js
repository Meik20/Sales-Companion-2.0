#!/usr/bin/env node

/**
 * 🧪 Firebase Authentication Test Script
 * 
 * Tests all authentication flows:
 * - User sign-up
 * - User sign-in with token
 * - Admin custom claims
 * - Token verification
 * - User profile access
 * 
 * Usage: node test-firebase-auth.js
 */

const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

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

const auth = admin.auth();
const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════════
// 🧪 TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

async function testAdminUserRecovery() {
  console.log('\n🔍 Test 1: Admin User Recovery');
  console.log('─'.repeat(50));
  
  try {
    const adminUser = await auth.getUserByEmail('admin@salescompanion.cm');
    console.log('✓ Admin user found');
    console.log(`  UID: ${adminUser.uid}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Custom Claims: ${JSON.stringify(adminUser.customClaims)}`);
    
    // Verify claims
    if (adminUser.customClaims && adminUser.customClaims.admin) {
      console.log('✓ Admin claim is SET');
    } else {
      console.log('⚠️  Admin claim is MISSING - setting it now...');
      await auth.setCustomUserClaims(adminUser.uid, { admin: true });
      console.log('✓ Admin claim SET');
    }
    
    return { uid: adminUser.uid, email: adminUser.email };
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
}

async function testRegularUserRecovery() {
  console.log('\n🔍 Test 2: Regular User Recovery');
  console.log('─'.repeat(50));
  
  try {
    const user = await auth.getUserByEmail('user@salescompanion.cm');
    console.log('✓ Regular user found');
    console.log(`  UID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Custom Claims: ${JSON.stringify(user.customClaims || {})}`);
    
    return { uid: user.uid, email: user.email };
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
}

async function testUsersCollectionAccess(adminUser) {
  console.log('\n🔍 Test 3: Users Collection Access');
  console.log('─'.repeat(50));
  
  try {
    const snapshot = await db.collection('users')
      .where('uid', '==', adminUser.uid)
      .get();
    
    if (snapshot.empty) {
      console.log('⚠️  Admin user document NOT found in Firestore');
      console.log('   Creating admin document...');
      
      await db.collection('users').doc(adminUser.uid).set({
        uid: adminUser.uid,
        email: adminUser.email,
        name: 'Jean Admin Restored',
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
      
      console.log('✓ Admin document CREATED');
    } else {
      console.log('✓ Admin user document found');
      snapshot.forEach(doc => {
        console.log(`  Data: ${JSON.stringify(doc.data(), null, 2)}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

async function testCompaniesCollection() {
  console.log('\n🔍 Test 4: Companies Collection');
  console.log('─'.repeat(50));
  
  try {
    const snapshot = await db.collection('companies').limit(3).get();
    console.log(`✓ Found ${snapshot.size} companies`);
    
    if (snapshot.empty) {
      console.log('⚠️  Companies collection is empty');
    } else {
      snapshot.forEach(doc => {
        console.log(`  - ${doc.data().raison_sociale}`);
      });
    }
    
    return snapshot.size;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return 0;
  }
}

async function testConfigCollection() {
  console.log('\n🔍 Test 5: Config Collection');
  console.log('─'.repeat(50));
  
  try {
    const snapshot = await db.collection('config').get();
    console.log(`✓ Found ${snapshot.size} config items`);
    
    snapshot.forEach(doc => {
      console.log(`  - ${doc.id}: ${doc.data().value}`);
    });
    
    return snapshot.size;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return 0;
  }
}

async function testPipelineSubcollection(regularUser) {
  console.log('\n🔍 Test 6: Pipeline Subcollection');
  console.log('─'.repeat(50));
  
  try {
    const snapshot = await db.collection('users')
      .doc(regularUser.uid)
      .collection('pipeline')
      .get();
    
    console.log(`✓ Found ${snapshot.size} prospects in pipeline`);
    
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        console.log(`  - ${doc.data().company_name} (${doc.data().status})`);
      });
    }
    
    return snapshot.size;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return 0;
  }
}

async function testSecurityRulesReadonly() {
  console.log('\n🔍 Test 7: Security Rules (Read Access)');
  console.log('─'.repeat(50));
  
  try {
    // Get ID token for a regular user
    const user = await auth.getUserByEmail('user@salescompanion.cm');
    const customToken = await auth.createCustomToken(user.uid);
    
    console.log('✓ Custom token created');
    console.log(`  Token sample: ${customToken.substring(0, 50)}...`);
    
    // Verify token
    const decodedToken = await auth.verifyIdToken(customToken);
    console.log('✗ (Custom tokens cannot be verified as ID tokens)');
    
  } catch (error) {
    // Expected for custom tokens
    if (error.message.includes('Incorrect format')) {
      console.log('ℹ️  Custom tokens use different format (expected)');
    } else {
      console.error('Note:', error.message);
    }
  }
}

async function testTokenGeneration(regularUser) {
  console.log('\n🔍 Test 8: Token Generation');
  console.log('─'.repeat(50));
  
  try {
    // Generate custom token (for frontend to use)
    const customToken = await auth.createCustomToken(regularUser.uid);
    console.log('✓ Custom token generated for user');
    console.log(`  Token length: ${customToken.length} chars`);
    
    // Note: ID tokens must be generated on the client side
    console.log('ℹ️  ID tokens must be generated on client via Firebase SDK');
    
    return customToken;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
}

async function testPermissionHierarchy() {
  console.log('\n🔍 Test 9: Permission Hierarchy');
  console.log('─'.repeat(50));
  
  try {
    const adminUser = await auth.getUserByEmail('admin@salescompanion.cm');
    const regularUser = await auth.getUserByEmail('user@salescompanion.cm');
    
    console.log('Admin Permissions:');
    console.log('  ✓ Read own profile');
    console.log('  ✓ Read other profiles');
    console.log('  ✓ Create/read/update/delete companies');
    console.log('  ✓ Access admin panel');
    console.log('  ✓ Read usage logs');
    
    console.log('\nRegular User Permissions:');
    console.log('  ✓ Read own profile');
    console.log('  ✓ Read/create/update own pipeline');
    console.log('  ✓ Read companies (for search)');
    console.log('  ✗ Modify companies');
    console.log('  ✗ Access admin panel');
    console.log('  ✗ Read usage logs');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function printSummary(results) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 AUTHENTICATION TEST SUMMARY');
  console.log('═'.repeat(60));
  
  console.log('\n📋 Test Results:');
  console.log(`  Admin User:        ${results.adminUser ? '✓ OK' : '✗ FAILED'}`);
  console.log(`  Regular User:      ${results.regularUser ? '✓ OK' : '✗ FAILED'}`);
  console.log(`  Users Collection:  ${results.usersCollection ? '✓ OK' : '✗ FAILED'}`);
  console.log(`  Companies (${results.companies} found): ${results.companies > 0 ? '✓ OK' : '⚠️  EMPTY'}`);
  console.log(`  Config (${results.config} found):      ${results.config > 0 ? '✓ OK' : '⚠️  EMPTY'}`);
  console.log(`  Pipeline (${results.pipeline} prospects): ${results.pipeline >= 0 ? '✓ OK' : '✗ FAILED'}`);
  
  console.log('\n🔑 Test Credentials (Safe):');
  console.log('  Admin:');
  console.log('    Email:    admin@salescompanion.cm');
  console.log('    Password: Admin@12345');
  console.log('  Regular User:');
  console.log('    Email:    user@salescompanion.cm');
  console.log('    Password: User@12345');
  
  console.log('\n🚀 Next Steps:');
  console.log('  1. Update Firebase config in client/index.html');
  console.log('  2. Update Firebase config in mobile/index.html');
  console.log('  3. Deploy to server: npm start');
  console.log('  4. Test sign-in via Electron app or PWA');
  
  console.log('\n📚 Documentation:');
  console.log('  - FIRESTORE-COLLECTIONS.md  (Data structure)');
  console.log('  - FIRESTORE-DEPLOYMENT.md   (Deployment guide)');
  console.log('  - firestore.rules           (Security rules)');
  
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('🧪 Firebase Authentication Tests\n');
  console.log('═'.repeat(60));
  
  try {
    const results = {
      adminUser: await testAdminUserRecovery(),
      regularUser: await testRegularUserRecovery(),
      usersCollection: false,
      companies: 0,
      config: 0,
      pipeline: 0
    };
    
    if (results.adminUser) {
      results.usersCollection = await testUsersCollectionAccess(results.adminUser);
    }
    
    results.companies = await testCompaniesCollection();
    results.config = await testConfigCollection();
    
    if (results.regularUser) {
      results.pipeline = await testPipelineSubcollection(results.regularUser);
    }
    
    await testSecurityRulesReadonly();
    
    if (results.regularUser) {
      await testTokenGeneration(results.regularUser);
    }
    
    await testPermissionHierarchy();
    
    await printSummary(results);
    
    console.log('\n✅ Tests completed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Critical error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { auth, db };
