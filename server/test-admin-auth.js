require('dotenv').config();
const { auth } = require('./firebase-config');
const { getUser } = require('./firestore-operations');

(async () => {
  try {
    const email = 'admin@sales-companion.local';
    const user = await auth.getUserByEmail(email);
    console.log('user found', user.uid, user.email, JSON.stringify(user.customClaims));
    const token = await auth.createCustomToken(user.uid, { admin: true });
    console.log('customToken length', token.length);
    const dbUser = await getUser(user.uid);
    console.log('dbUser', dbUser && dbUser.email, dbUser && dbUser.role);
  } catch (e) {
    console.error('ERROR', e.code || e.message || e);
  }
})();
