/**
 * member-access.js — Sales Companion
 * Script classique (non-ESM), Firebase compat uniquement.
 * Toutes les fonctions sont exposées sur window.MemberAccessManager.
 */

(function () {
  'use strict';

  /* =========================================================
     UTILITAIRES
  ========================================================= */

  function normalizeText(text) {
    return (text || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function buildAccessId(firstname, lastname, company) {
    var first = normalizeText(firstname);
    var last  = normalizeText(lastname);
    var comp  = normalizeText(company);
    if (!first && !last && !comp) return '@entreprise';
    return first + last + '@' + comp;
  }

  function normalizeTextAccessId(accessId) {
    if (!accessId) return '';
    var parts = accessId.split('@');
    if (parts.length !== 2) return accessId.trim().toLowerCase();
    return normalizeText(parts[0]) + '@' + normalizeText(parts[1]);
  }

  function showToast(message) {
    if (typeof window.toast === 'function') {
      window.toast(message);
    } else {
      var el = document.getElementById('toast');
      if (!el) return;
      el.textContent = message;
      el.className = 'toast show';
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function () { el.className = 'toast'; }, 3000);
    }
  }

  /* =========================================================
     APERCU DYNAMIQUE (formulaire manager)
  ========================================================= */

  function updateAccessPreview() {
    var firstname = (document.getElementById('new-access-firstname') || {}).value || '';
    var lastname  = (document.getElementById('new-access-lastname')  || {}).value || '';
    var company   = (document.getElementById('new-access-company')   || {}).value || 'Entreprise';
    var preview   = document.getElementById('new-access-preview');
    if (!preview) return;
    if (!firstname && !lastname) {
      preview.textContent = '@' + (normalizeText(company) || 'entreprise');
    } else {
      preview.textContent = buildAccessId(firstname, lastname, company);
    }
  }

  /* =========================================================
     HELPERS FIRESTORE (compat)
  ========================================================= */

  function getDb() {
    return window._db || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length ? firebase.firestore() : null);
  }

  function getCurrentManagerUid() {
    var auth = window._auth || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length ? firebase.auth() : null);
    return auth && auth.currentUser ? auth.currentUser.uid : null;
  }

  /* =========================================================
     COMPTER LES ACCES DU MANAGER
  ========================================================= */

  async function countManagerAccesses(managerUid) {
    var db = getDb();
    if (!db) return 0;
    var snap = await db.collection('team_accesses')
      .where('createdBy', '==', managerUid)
      .get();
    return snap.size;
  }

  /* =========================================================
     CREATION D'UN ACCES MEMBRE
  ========================================================= */

  async function createMemberAccess() {
    var db = getDb();
    if (!db) { showToast('Base de données non disponible'); return false; }

    var managerUid = getCurrentManagerUid();
    if (!managerUid) { showToast('Vous devez être connecté en tant que manager.'); return false; }

    var firstname = ((document.getElementById('new-access-firstname') || {}).value || '').trim();
    var lastname  = ((document.getElementById('new-access-lastname')  || {}).value || '').trim();
    var company   = ((document.getElementById('new-access-company')   || {}).value || '').trim();

    if (!firstname || !lastname || !company) {
      showToast('Veuillez remplir prénom, nom et entreprise.');
      return false;
    }

    var accessId = buildAccessId(firstname, lastname, company);
    if (!accessId || accessId === '@entreprise') {
      showToast('Impossible de générer un identifiant valide.');
      return false;
    }

    var btn = document.getElementById('create-access-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Création...'; }

    try {
      var count = await countManagerAccesses(managerUid);
      if (count >= 10) { showToast('Limite de 10 accès atteinte.'); return false; }

      var ref = db.collection('team_accesses').doc(accessId);
      var existing = await ref.get();
      if (existing.exists) { showToast('Cet identifiant existe déjà.'); return false; }

      await ref.set({
        accessId:          accessId,
        firstname:         firstname,
        lastname:          lastname,
        company:           company,
        role:              'member',
        status:            'pending',
        activated:         false,
        passwordSet:       false,
        mustChangePassword:true,
        createdBy:         managerUid,
        createdAt:         firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast('✅ Accès créé : ' + accessId);
      clearCreateAccessForm();

      if (typeof window.closeSheet === 'function') window.closeSheet('create-access-sheet');
      if (window.TeamManagerMobile && typeof window.TeamManagerMobile.loadGeneratedAccesses === 'function') {
        await window.TeamManagerMobile.loadGeneratedAccesses();
        window.TeamManagerMobile.renderAccessManagement();
      }
      return true;

    } catch (e) {
      console.error('createMemberAccess:', e);
      showToast('Erreur lors de la création : ' + e.message);
      return false;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Créer l'accès"; }
    }
  }

  /* =========================================================
     ACTIVATION DU COMPTE MEMBRE
  ========================================================= */

  async function activateMemberAccount(accessId, password, confirmPassword) {
    var db = getDb();
    if (!db) return { success: false, message: 'Base de données non disponible.' };

    var normalizedId = normalizeTextAccessId(accessId);

    if (!normalizedId || !password || !confirmPassword)
      return { success: false, message: 'Veuillez remplir tous les champs.' };

    if (password.length < 8)
      return { success: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };

    if (password !== confirmPassword)
      return { success: false, message: 'Les mots de passe ne correspondent pas.' };

    try {
      var ref  = db.collection('team_accesses').doc(normalizedId);
      var snap = await ref.get();

      if (!snap.exists)
        return { success: false, message: "Identifiant d'accès introuvable." };

      var data = snap.data();

      if (data.status === 'revoked')
        return { success: false, message: 'Cet accès a été révoqué.' };

      if (data.activated === true)
        return { success: false, message: 'Ce compte est déjà activé.' };

      await ref.update({
        activated:          true,
        passwordSet:        true,
        mustChangePassword: false,
        status:             'active',
        activatedAt:        firebase.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };

    } catch (e) {
      console.error('activateMemberAccount:', e);
      return { success: false, message: "Erreur lors de l'activation : " + e.message };
    }
  }

  /* =========================================================
     REVOCATION
  ========================================================= */

  async function revokeMemberAccess(accessId) {
    var db = getDb();
    if (!db) { showToast('Base de données non disponible'); return false; }

    var managerUid = getCurrentManagerUid();
    if (!managerUid) { showToast('Vous devez être connecté.'); return false; }

    var normalizedId = normalizeTextAccessId(accessId);

    try {
      var ref  = db.collection('team_accesses').doc(normalizedId);
      var snap = await ref.get();

      if (!snap.exists) { showToast('Accès introuvable.'); return false; }
      if (snap.data().createdBy !== managerUid) { showToast("Non autorisé."); return false; }

      await ref.update({
        status:    'revoked',
        revokedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast('Accès révoqué.');
      return true;

    } catch (e) {
      showToast('Erreur révocation : ' + e.message);
      return false;
    }
  }

  /* =========================================================
     SUPPRESSION
  ========================================================= */

  async function deleteMemberAccess(accessId) {
    var db = getDb();
    if (!db) { showToast('Base de données non disponible'); return false; }

    var managerUid = getCurrentManagerUid();
    if (!managerUid) { showToast('Vous devez être connecté.'); return false; }

    var normalizedId = normalizeTextAccessId(accessId);

    try {
      var ref  = db.collection('team_accesses').doc(normalizedId);
      var snap = await ref.get();

      if (!snap.exists) { showToast('Accès introuvable.'); return false; }
      if (snap.data().createdBy !== managerUid) { showToast("Non autorisé."); return false; }

      await ref.delete();
      showToast('Accès supprimé.');
      return true;

    } catch (e) {
      showToast('Erreur suppression : ' + e.message);
      return false;
    }
  }

  /* =========================================================
     VERIFICATION
  ========================================================= */

  async function checkMemberAccessExists(accessId) {
    var db = getDb();
    if (!db) return { exists: false, data: null };
    try {
      var snap = await db.collection('team_accesses').doc(normalizeTextAccessId(accessId)).get();
      return snap.exists ? { exists: true, data: snap.data() } : { exists: false, data: null };
    } catch (e) {
      return { exists: false, data: null };
    }
  }

  /* =========================================================
     HELPERS FORMULAIRE
  ========================================================= */

  function clearCreateAccessForm() {
    ['new-access-firstname', 'new-access-lastname', 'new-access-company'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    updateAccessPreview();
  }

  /* =========================================================
     BIND EVENTS (appelé après DOMContentLoaded)
  ========================================================= */

  function bindCreateAccessEvents() {
    ['new-access-firstname', 'new-access-lastname', 'new-access-company'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateAccessPreview);
    });

    var createBtn = document.getElementById('create-access-btn');
    if (createBtn) {
      // Éviter les doublons de listener
      createBtn.replaceWith(createBtn.cloneNode(true));
      document.getElementById('create-access-btn').addEventListener('click', createMemberAccess);
    }

    updateAccessPreview();
  }

  /* =========================================================
     EXPORT GLOBAL
  ========================================================= */

  window.MemberAccessManager = {
    createMemberAccess:       createMemberAccess,
    activateMemberAccount:    activateMemberAccount,
    revokeMemberAccess:       revokeMemberAccess,
    deleteMemberAccess:       deleteMemberAccess,
    checkMemberAccessExists:  checkMemberAccessExists,
    buildAccessId:            buildAccessId,
    normalizeTextAccessId:    normalizeTextAccessId,
    updateAccessPreview:      updateAccessPreview,
    bindCreateAccessEvents:   bindCreateAccessEvents,
    clearCreateAccessForm:    clearCreateAccessForm
  };

  // Alias direct sur window pour les onclick inline
  window.updateAccessPreview = updateAccessPreview;

  // Init au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCreateAccessEvents);
  } else {
    bindCreateAccessEvents();
  }

})();