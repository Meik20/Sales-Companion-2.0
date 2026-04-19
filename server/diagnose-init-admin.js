/**
 * Diagnostic script for init-admin endpoint
 * Tests each step to identify the exact failure point
 */

require('dotenv').config();
const { auth } = require('./firebase-config');
const admin = require('firebase-admin');

async function diagnose() {
  console.log('\n🔍 INIT-ADMIN DIAGNOSTIC SCRIPT\n');
  console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
  console.log('---\n');

  try {
    // Step 1: Check Firebase initialization
    console.log('Step 1: Firebase initialization check...');
    if (!auth) {
      console.error('❌ Firebase auth not initialized');
      process.exit(1);
    }
    console.log('✅ Firebase initialized\n');

    // Step 2: List existing users
    console.log('Step 2: Listing existing users...');
    let existingAdmins;
    try {
      existingAdmins = await auth.listUsers();
      console.log(`✅ Found ${existingAdmins.users.length} total users`);
      
      let adminCount = 0;
      for (const user of existingAdmins.users) {
        if (user.customClaims?.admin === true) {
          console.log(`  ⚠️ Admin already exists: ${user.email} (${user.uid})`);
          adminCount++;
        }
      }
      if (adminCount === 0) {
        console.log('  ✅ No admin users found - safe to create one\n');
      } else {
        console.log(`\n❌ Cannot create admin: ${adminCount} admin(s) already exist\n`);
        process.exit(0);
      }
    } catch (err) {
      console.error('❌ Failed to list users:', err.code || err.message);
      console.error('Full error:', err);
      process.exit(1);
    }

    // Step 3: Create user
    console.log('Step 3: Creating new Firebase Auth user...');
    let adminUser;
    try {
      adminUser = await auth.createUser({
        email: 'admin@sales-companion.local',
        password: 'admin123',
        displayName: 'Admin'
      });
      console.log(`✅ User created: ${adminUser.uid} (${adminUser.email})\n`);
    } catch (err) {
      console.error('❌ Failed to create user:', err.code || err.message);
      console.error('Full error:', err);
      process.exit(1);
    }

    // Step 4: Set custom claims
    console.log('Step 4: Setting custom claims (admin=true)...');
    try {
      await auth.setCustomUserClaims(adminUser.uid, { admin: true });
      console.log(`✅ Claims set\n`);
    } catch (err) {
      console.error('❌ Failed to set claims:', err.code || err.message);
      console.error('Full error:', err);
      process.exit(1);
    }

    // Step 5: Create Firestore document
    console.log('Step 5: Creating Firestore users document...');
    try {
      const db = admin.firestore();
      await db.collection('users').doc(adminUser.uid).set({
        uid: adminUser.uid,
        email: 'admin@sales-companion.local',
        name: 'Admin',
        role: 'admin',
        plan: 'enterprise',
        dailyLimit: 9999,
        dailyUsed: 0,
        active: true,
        createdAt: new Date().toISOString(),
      });
      console.log(`✅ Firestore document created\n`);
    } catch (err) {
      console.error('❌ Failed to create Firestore document:', err.code || err.message);
      console.error('Full error:', err);
      process.exit(1);
    }

    console.log('✅ ALL STEPS COMPLETED SUCCESSFULLY!');
    console.log(`\nAdmin user: ${adminUser.email}`);
    console.log(`UID: ${adminUser.uid}`);
    console.log('\n🎉 Admin initialization successful!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

diagnose();
