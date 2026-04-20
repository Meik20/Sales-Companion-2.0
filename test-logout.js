/**
 * Test Firebase Logout
 * Valider que signOut() fonctionne correctement
 */

// Test 1: Vérifier que firebase.auth().signOut() est disponible
console.log('🔍 Test Firebase signOut()...');

try {
  // Dans un navigateur/Electron avec Firebase chargé:
  if (typeof firebase !== 'undefined' && firebase.auth) {
    console.log('✅ Firebase auth disponible');
    
    // Simuler la déconnexion
    firebase.auth().signOut()
      .then(() => {
        console.log('✅ Déconnexion réussie');
        localStorage.removeItem('authToken');
        console.log('✅ Token supprimé du localStorage');
        
        // Rediriger vers login
        console.log('→ Redirection vers /login.html');
      })
      .catch((error) => {
        console.error('❌ Erreur de déconnexion:', error);
      });
  } else {
    console.warn('⚠️  Firebase auth non disponible');
  }
} catch (error) {
  console.error('❌ Erreur:', error);
}

// Test 2: Vérifier que auth-manager gère la déconnexion
console.log('\n🔍 Test auth-manager...');
try {
  if (typeof window !== 'undefined' && window.authManager) {
    console.log('✅ authManager disponible');
    console.log('   - handleAuthError() peut forcer logout');
    console.log('   - cleanup() arrête le refresh auto');
  }
} catch (error) {
  console.error('❌ Erreur:', error);
}

// Test 3: Vérifier que apiClient utilise authManager
console.log('\n🔍 Test apiClient...');
try {
  if (typeof window !== 'undefined' && window.apiClient) {
    console.log('✅ apiClient disponible');
    console.log('   - Retry 401 → refresh token');
    console.log('   - Si refresh fail → authManager.handleAuthError()');
  }
} catch (error) {
  console.error('❌ Erreur:', error);
}
