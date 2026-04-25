/**
 * Test script to verify admin token creation and verification
 */

require('dotenv').config();
const { auth } = require('./firebase-config');

async function testAdminToken() {
  console.log('\n🧪 ADMIN TOKEN TEST\n');
  
  try {
    // Step 1: Get the existing admin user
    const adminUser = await auth.getUser('MDtwLaYQq0dZTd7HJBM8mjTo7zw2');
    console.log('✅ Admin user found:', adminUser.email);
    console.log('   Custom claims:', adminUser.customClaims);
    
    // Step 2: Create a custom token
    const customToken = await auth.createCustomToken(adminUser.uid, { admin: true });
    console.log('\n✅ Custom token created');
    console.log('   Token preview:', customToken.substring(0, 50) + '...');
    
    // Step 3: Decode the token manually to see what's inside
    const parts = customToken.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid token format (not 3 parts)');
      process.exit(1);
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('\n✅ Token payload decoded:');
    console.log('   UID:', payload.sub);
    console.log('   Admin claim:', payload.admin);
    console.log('   Full payload:', JSON.stringify(payload, null, 2));
    
    // Step 4: Try to verify the token using auth.verifyIdToken (should fail for custom token)
    console.log('\n🔍 Attempting to verify as ID token...');
    try {
      await auth.verifyIdToken(customToken);
      console.log('   ⚠️  Unexpectedly succeeded (shouldn\'t happen)');
    } catch (idErr) {
      console.log('   ✅ As expected, ID token verification failed');
      console.log('   Error:', idErr.code, '-', idErr.message);
    }
    
    // Step 5: Check what verifyAdmin expects
    console.log('\n📋 verifyAdmin middleware expects:');
    console.log('   - Either an ID token with "admin": true claim');
    console.log('   - Or a custom token with "admin": true in payload');
    console.log('   - Then checks user\'s custom claims in Firebase Auth');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAdminToken();
