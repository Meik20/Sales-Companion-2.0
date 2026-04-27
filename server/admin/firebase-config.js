// admin/firebase-config.js
// Initialize Firebase for admin UI by fetching runtime config
(async function () {
  try {
    const res = await fetch('/api/config/firebase');
    const cfg = await res.json();
    if (!cfg || !cfg.apiKey) {
      console.warn('[admin/firebase-config.js] No firebase config available from server');
      return;
    }
    if (!window.firebase) {
      console.error('[admin/firebase-config.js] firebase SDK not loaded');
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
      console.log('[admin/firebase-config.js] Firebase initialized for admin UI');
    }
  } catch (e) {
    console.error('[admin/firebase-config.js] Impossible de charger la config Firebase :', e);
  }
})();
