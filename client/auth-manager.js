/* auth-manager.js - global auth manager using Firebase compat SDK */
(function () {
  class AuthManager {
    constructor() {
      this.tokenRefreshInterval = null;
      this.tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes
    }

    async getValidToken() {
      try {
        const user = firebase.auth().currentUser;
        if (!user) {
          console.warn('[Auth] No user logged in');
          return null;
        }

        const token = await user.getIdToken(false);
        const tokenResult = await user.getIdTokenResult();
        const expirationTime = new Date(tokenResult.expirationTime).getTime();
        const now = Date.now();

        if (expirationTime - now < this.tokenExpiryBuffer) {
          console.log('[Auth] Token near expiration, refreshing...');
          return await user.getIdToken(true);
        }

        return token;
      } catch (error) {
        console.error('[Auth] Error getting token:', error);
        return null;
      }
    }

    setupAutoRefresh() {
      if (this.tokenRefreshInterval) return;
      this.tokenRefreshInterval = setInterval(async () => {
        console.log('[Auth] Auto-refreshing token...');
        const user = firebase.auth().currentUser;
        if (user) {
          try {
            const newToken = await user.getIdToken(true);
            localStorage.setItem('authToken', newToken);
            console.log('✅ Token refreshed');
          } catch (e) {
            console.error('❌ Auto-refresh failed:', e);
            this.handleAuthError();
          }
        }
      }, 50 * 60 * 1000);
    }

    handleAuthError() {
      console.log('[Auth] Signing out due to auth error');
      this.cleanup();
      localStorage.removeItem('authToken');
      try { firebase.auth().signOut(); } catch (e) {}
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login.html';
      }
    }

    cleanup() {
      if (this.tokenRefreshInterval) {
        clearInterval(this.tokenRefreshInterval);
        this.tokenRefreshInterval = null;
      }
    }
  }

  const authManager = new AuthManager();

  if (window.firebase && window.firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('[Auth] User signed in:', user.email || user.uid);
        authManager.setupAutoRefresh();
        user.getIdToken().then((t) => localStorage.setItem('authToken', t)).catch(()=>{});
      } else {
        console.log('[Auth] No user signed in');
        authManager.cleanup();
        localStorage.removeItem('authToken');
      }
    });
  } else {
    console.warn('[Auth] Firebase auth not available yet');
  }

  window.authManager = authManager;
})();
