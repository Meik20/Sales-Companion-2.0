/**
 * team-manager-mobile.js — Sales Companion
 * Script classique (non-ESM), Firebase compat uniquement.
 * Toutes les fonctions sont exposées sur window et window.TeamManagerMobile.
 */

(function () {
  'use strict';

  /* =========================================================
     ÉTAT LOCAL
  ========================================================= */
  var teamMembers        = [];
  var teamMembersPipeline = {};
  var currentTeamSeg     = 'members';
  var activityFeed       = [];
  var generatedAccesses  = [];
  var isTeamDataLoading  = false;

  /* =========================================================
     HELPERS DE BASE
  ========================================================= */

  function getDb() {
    return window._db || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length ? firebase.firestore() : null);
  }

  function getAuth() {
    return window._auth || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length ? firebase.auth() : null);
  }

  function getAuthToken() {
    return window.token || localStorage.getItem('sc_token') || '';
  }

  function getUserRole() {
    return ((window.user && window.user.role) || '').toLowerCase().trim();
  }

  function getCurrentManagerUid() {
    var auth = getAuth();
    if (auth && auth.currentUser) return auth.currentUser.uid;
    return (window.user && window.user.uid) || null;
  }

  function toast(message) {
    if (typeof window.toast === 'function' && window.toast !== toast) {
      window.toast(message);
      return;
    }
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast show';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.className = 'toast'; }, 3000);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return dateStr; }
  }

  function statusLabel(status) {
    return { prospection: 'Prospect', negociation: 'Négo', conclue: 'Conclu' }[status] || status || 'Prospect';
  }

  /* =========================================================
     SHEET HELPERS (compat avec index.html)
  ========================================================= */

  function openSheet(sheetId) {
    // Déléguer à la fonction globale définie dans index.html
    if (typeof window.openSheet === 'function' && window.openSheet !== openSheet) {
      window.openSheet(sheetId); return;
    }
    var sheet   = document.getElementById(sheetId);
    var overlay = document.getElementById(sheetId.replace('-sheet', '-overlay'));
    if (overlay) overlay.classList.add('open');
    if (sheet)   setTimeout(function () { sheet.classList.add('open'); }, 10);
  }

  function closeSheet(sheetId) {
    if (typeof window.closeSheet === 'function' && window.closeSheet !== closeSheet) {
      window.closeSheet(sheetId); return;
    }
    var sheet   = document.getElementById(sheetId);
    var overlay = document.getElementById(sheetId.replace('-sheet', '-overlay'));
    if (sheet)   sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  /* =========================================================
     APPEL API REST (Railway)
  ========================================================= */

  function apiCall(method, endpoint, data) {
    var base = (typeof RAILWAY_SERVER !== 'undefined' ? RAILWAY_SERVER : '');
    var options = {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    var tok = getAuthToken();
    if (tok) options.headers['Authorization'] = 'Bearer ' + tok;
    if (data && (method === 'POST' || method === 'PUT')) options.body = JSON.stringify(data);
    return fetch(base + endpoint, options);
  }

  /* =========================================================
     FLUX CONNEXION / ACTIVATION
  ========================================================= */

  function switchToActivationFlow() {
    var authScreen      = document.getElementById('auth-screen');
    var loginForm       = document.getElementById('login-form');
    var registerForm    = document.getElementById('register-form');
    var activationForm  = document.getElementById('activation-form');

    if (authScreen)     authScreen.style.display    = 'flex';
    if (loginForm)      loginForm.style.display      = 'none';
    if (registerForm)   registerForm.style.display   = 'none';
    if (activationForm) activationForm.style.display = 'flex';

    var accessIdEl = document.getElementById('activation-access-id');
    if (accessIdEl) { accessIdEl.value = ''; setTimeout(function () { accessIdEl.focus(); }, 50); }
    var passEl = document.getElementById('activation-new-password');
    var confEl = document.getElementById('activation-confirm-password');
    if (passEl) passEl.value = '';
    if (confEl) confEl.value = '';

    setActivationError('');
  }

  function backToLoginForm() {
    var authScreen      = document.getElementById('auth-screen');
    var loginForm       = document.getElementById('login-form');
    var registerForm    = document.getElementById('register-form');
    var activationForm  = document.getElementById('activation-form');

    if (authScreen)     authScreen.style.display    = 'flex';
    if (activationForm) activationForm.style.display = 'none';
    if (registerForm)   registerForm.style.display  = 'none';
    if (loginForm)      loginForm.style.display      = 'block';

    setActivationError('');
  }

  function setActivationError(message) {
    var el = document.getElementById('activation-err');
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
  }

  async function activateMemberAccess() {
    var accessId  = (document.getElementById('activation-access-id')?.value || '').trim();
    var password  = document.getElementById('activation-new-password')?.value  || '';
    var confirm   = document.getElementById('activation-confirm-password')?.value || '';
    var btn       = document.getElementById('activate-access-btn');

    setActivationError('');

    if (!window.MemberAccessManager) {
      setActivationError("Module d'accès non disponible. Rechargez la page.");
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Activation...'; }

    try {
      var result = await window.MemberAccessManager.activateMemberAccount(accessId, password, confirm);

      if (!result.success) {
        setActivationError(result.message || "Erreur d'activation.");
      } else {
        setActivationError('');
        toast('🎉 Compte activé ! Vous pouvez maintenant vous connecter.');
        // Réinitialiser les champs
        ['activation-access-id', 'activation-new-password', 'activation-confirm-password'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = '';
        });
        setTimeout(backToLoginForm, 1500);
      }
    } catch (e) {
      setActivationError('Erreur : ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Activer mon compte →'; }
    }
  }

  /* =========================================================
     RÔLE MANAGER — NAVIGATION
  ========================================================= */

  function applyManagerRole() {
    var isManager = getUserRole() === 'manager';

    // Bouton nav Équipe
    var navTeam = document.getElementById('nav-team');
    if (navTeam) navTeam.style.display = isManager ? 'flex' : 'none';

    // Onglet tab-team
    var tabTeam = document.getElementById('tab-team');
    if (tabTeam) tabTeam.style.display = isManager ? '' : 'none';

    // Badge équipe
    var teamBadge = document.getElementById('team-badge');
    if (teamBadge && !isManager) teamBadge.style.display = 'none';

    // Bouton assignation dans profile sheet
    var managerBtn = document.getElementById('manager-assign-btn-m');
    if (managerBtn) managerBtn.style.display = isManager ? 'block' : 'none';

    if (isManager) {
      loadTeamData();
      loadGeneratedAccesses();
    }
  }

  /* =========================================================
     ONGLETS DE L'ÉQUIPE
  ========================================================= */

  function switchTeamSeg(seg, el) {
    currentTeamSeg = seg;

    document.querySelectorAll('.tseg').forEach(function (b) { b.classList.remove('active'); });
    if (el) el.classList.add('active');

    var views = {
      members:  document.getElementById('team-members-view-container'),
      activity: document.getElementById('team-activity-view'),
      access:   document.getElementById('team-access-view')
    };

    Object.keys(views).forEach(function (key) {
      if (views[key]) views[key].classList.toggle('active', key === seg);
    });

    if (seg === 'activity') { buildActivityFeed(); renderActivityFeed(); }
    if (seg === 'access')   { renderAccessManagement(); }
    if (seg === 'members')  { renderTeamMembers(); }
  }

  /* =========================================================
     CHARGEMENT DONNÉES ÉQUIPE
  ========================================================= */

  async function refreshTeamData() {
    if (getUserRole() !== 'manager') return;
    var teamLoading    = document.getElementById('team-loading');
    var activityLoading = document.getElementById('activity-loading');
    if (teamLoading)    teamLoading.style.display    = 'flex';
    if (activityLoading) activityLoading.style.display = 'flex';
    await loadTeamData();
    await loadGeneratedAccesses();
    if (currentTeamSeg === 'access') renderAccessManagement();
  }

  async function loadTeamData() {
    if (getUserRole() !== 'manager' || isTeamDataLoading) return;
    isTeamDataLoading = true;

    var container     = document.getElementById('team-members-view');
    var teamLoading   = document.getElementById('team-loading');

    try {
      if (teamLoading) teamLoading.style.display = 'flex';

      var r = await apiCall('GET', '/api/team');
      if (!r.ok) throw new Error('Chargement équipe impossible');

      var d = await r.json();
      teamMembers        = d.data || [];
      teamMembersPipeline = {};

      await Promise.all(teamMembers.map(async function (member) {
        try {
          var pr = await apiCall('GET', '/api/pipeline?assignee=' + encodeURIComponent(member.uid));
          teamMembersPipeline[member.uid] = pr.ok ? ((await pr.json()).data || []) : [];
        } catch (e) {
          teamMembersPipeline[member.uid] = [];
        }
      }));

      renderTeamMembers();
      buildActivityFeed();
      if (currentTeamSeg === 'activity') renderActivityFeed();

      // Mise à jour badge
      var pendingCount = teamMembers.reduce(function (acc, m) {
        return acc + (teamMembersPipeline[m.uid] || []).filter(function (p) {
          return p.status === 'prospection' || p.status === 'negociation';
        }).length;
      }, 0);

      var tb = document.getElementById('team-badge');
      if (tb) { tb.textContent = pendingCount; tb.style.display = pendingCount ? '' : 'none'; }

    } catch (e) {
      if (container) {
        container.innerHTML = "<div class='team-empty'><div class='team-empty-icon'>📡</div><h3>Impossible de charger</h3><p>" + escapeHtml(e.message) + "</p></div>";
      }
    } finally {
      if (teamLoading) teamLoading.style.display = 'none';
      var activityLoading = document.getElementById('activity-loading');
      if (activityLoading) activityLoading.style.display = 'none';
      isTeamDataLoading = false;
    }
  }

  /* =========================================================
     ACCÈS MEMBRES — FIRESTORE COMPAT
  ========================================================= */

  async function loadGeneratedAccesses() {
    if (getUserRole() !== 'manager') return;
    var db = getDb();
    if (!db) { generatedAccesses = []; return; }

    var managerUid = getCurrentManagerUid();
    if (!managerUid) { generatedAccesses = []; return; }

    try {
      var snap = await db.collection('team_accesses')
        .where('createdBy', '==', managerUid)
        .get();

      generatedAccesses = snap.docs.map(function (docSnap) {
        var data = docSnap.data();
        var createdAt  = data.createdAt  && data.createdAt.toDate  ? data.createdAt.toDate().toISOString()  : '';
        var activatedAt = data.activatedAt && data.activatedAt.toDate ? data.activatedAt.toDate().toISOString() : '';
        return {
          id:          docSnap.id,
          access_id:   data.accessId || docSnap.id,
          member_name: ((data.firstname || '') + ' ' + (data.lastname || '')).trim(),
          company:     data.company || '',
          status:      data.status  || 'pending',
          created_at:  createdAt,
          activated_at: activatedAt
        };
      });
    } catch (e) {
      console.error('loadGeneratedAccesses:', e);
      generatedAccesses = [];
    }
  }

  /* =========================================================
     RENDU — GESTION DES ACCÈS
  ========================================================= */

  function renderAccessManagement() {
    var container = document.getElementById('team-access-view');
    if (!container) return;

    var activeAccesses = generatedAccesses.filter(function (a) {
      return a.status === 'active' || a.status === 'pending';
    });
    var canCreate = activeAccesses.length < 10;

    var html = '<div class="access-header">'
      + '<div class="access-quota">'
      + '<div class="access-quota-num">' + activeAccesses.length + '/10</div>'
      + '<div class="access-quota-label">Accès utilisés</div>'
      + '</div>'
      + '<button class="btn-primary" type="button" onclick="window.TeamManagerMobile.openCreateAccessSheet()" ' + (canCreate ? '' : 'disabled') + '>'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + 'Créer un accès'
      + '</button>'
      + '</div>';

    if (!generatedAccesses.length) {
      html += '<div class="team-empty"><div class="team-empty-icon">🔑</div>'
        + '<h3>Aucun accès créé</h3>'
        + '<p>Générez des accès pour votre équipe (max 10).</p></div>';
    } else {
      html += '<div class="access-list">';
      var icons  = { pending: '⏳', active: '✅', revoked: '❌' };
      var labels = { pending: 'En attente', active: 'Actif', revoked: 'Révoqué' };

      generatedAccesses.forEach(function (access) {
        var aId = escapeHtml(access.access_id || String(access.id));
        var aIdRaw = (access.access_id || String(access.id)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        html += '<div class="access-card ' + escapeHtml(access.status) + '">'
          + '<div class="access-card-header">'
          + '<div class="access-card-id">' + aId + '</div>'
          + '<div class="access-status-badge ' + escapeHtml(access.status) + '">'
          + (icons[access.status] || '') + ' ' + (labels[access.status] || access.status)
          + '</div></div>'
          + '<div class="access-card-info">'
          + '<div class="access-info-row"><strong>Nom :</strong> ' + escapeHtml(access.member_name || '—') + '</div>'
          + '<div class="access-info-row"><strong>Entreprise :</strong> ' + escapeHtml(access.company || '—') + '</div>'
          + '<div class="access-info-row"><strong>Créé le :</strong> ' + escapeHtml(formatDate(access.created_at)) + '</div>'
          + (access.activated_at ? '<div class="access-info-row"><strong>Activé le :</strong> ' + escapeHtml(formatDate(access.activated_at)) + '</div>' : '')
          + '</div>'
          + '<div class="access-card-actions">';

        if (access.status === 'pending') {
          html += "<button class='access-btn copy' type='button' onclick=\"window.TeamManagerMobile.copyAccessId('" + aIdRaw + "')\">Copier l'ID</button>";
        }
        if (access.status !== 'revoked') {
          html += "<button class='access-btn revoke' type='button' onclick=\"window.TeamManagerMobile.revokeAccess('" + aIdRaw + "')\">Révoquer</button>";
        }

        html += '</div></div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  function openCreateAccessSheet() {
    var activeCount = generatedAccesses.filter(function (a) {
      return a.status === 'active' || a.status === 'pending';
    }).length;

    if (activeCount >= 10) { toast('Limite atteinte : 10 accès maximum'); return; }

    var fields = {
      'new-access-firstname': '',
      'new-access-lastname':  '',
      'new-access-company':   (window.user && (window.user.company_name || window.user.company_id)) || ''
    };
    Object.keys(fields).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = fields[id];
    });

    var preview = document.getElementById('new-access-preview');
    if (preview) preview.textContent = '@' + (fields['new-access-company'] || 'Entreprise');

    var btn = document.getElementById('create-access-btn');
    if (btn) { btn.disabled = false; btn.textContent = "Créer l'accès"; }

    // Rebind events via MemberAccessManager
    if (window.MemberAccessManager && typeof window.MemberAccessManager.bindCreateAccessEvents === 'function') {
      window.MemberAccessManager.bindCreateAccessEvents();
    }

    openSheet('create-access-sheet');
  }

  async function copyAccessId(accessId) {
    try {
      await navigator.clipboard.writeText(accessId);
      toast('📋 ID copié : ' + accessId);
    } catch (e) {
      var inp = document.createElement('input');
      inp.value = accessId;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      document.body.removeChild(inp);
      toast('📋 ID copié');
    }
  }

  async function revokeAccess(accessId) {
    if (!confirm('Voulez-vous vraiment révoquer cet accès ?')) return;
    if (!window.MemberAccessManager) { toast('Module non disponible'); return; }
    var ok = await window.MemberAccessManager.revokeMemberAccess(accessId);
    if (ok) {
      await loadGeneratedAccesses();
      renderAccessManagement();
    }
  }

  /* =========================================================
     RENDU — MEMBRES DE L'ÉQUIPE
  ========================================================= */

  function renderTeamMembers() {
    var container  = document.getElementById('team-members-view');
    var teamLoading = document.getElementById('team-loading');
    if (teamLoading) teamLoading.style.display = 'none';
    if (!container) return;

    if (!teamMembers.length) {
      container.innerHTML = "<div class='team-empty'><div class='team-empty-icon'>👥</div><h3>Aucun commercial</h3><p>Créez des accès dans l'onglet \"Accès\".</p></div>";
      return;
    }

    container.innerHTML = '';

    teamMembers.forEach(function (member) {
      var pipeline = teamMembersPipeline[member.uid] || [];
      var cntP = pipeline.filter(function (p) { return p.status === 'prospection'; }).length;
      var cntN = pipeline.filter(function (p) { return p.status === 'negociation'; }).length;
      var cntC = pipeline.filter(function (p) { return p.status === 'conclue'; }).length;

      var initials = ((member.name || member.email || '?')
        .split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2)).toUpperCase();

      var uidEsc = member.uid.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      var pipelineHTML = pipeline.slice(0, 5).map(function (p) {
        return '<div class="mpip-item">'
          + '<span class="mpip-item-name">' + escapeHtml(p.company_name || '—') + '</span>'
          + '<span class="mpip-item-status ' + escapeHtml(p.status || 'prospection') + '">' + escapeHtml(statusLabel(p.status)) + '</span>'
          + '</div>';
      }).join('') || '<div style="font-size:12px;color:var(--text-tertiary)">Aucun prospect assigné</div>';

      var card = document.createElement('div');
      card.className = 'member-card';
      card.id = 'member-' + member.uid;

      card.innerHTML = '<div class="member-head" onclick="window.TeamManagerMobile.toggleMemberCard(\'' + uidEsc + '\')">'
        + '<div class="member-av">' + escapeHtml(initials) + '</div>'
        + '<div class="member-info">'
        + '<div class="member-name">' + escapeHtml(member.name || 'Sans nom') + '</div>'
        + '<div class="member-email">' + escapeHtml(member.email || '') + '</div>'
        + '</div>'
        + '<svg class="member-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>'
        + '</div>'
        + '<div class="member-kpi">'
        + '<div class="mkpi"><div class="mkpi-val">' + cntP + '</div><div class="mkpi-lbl">Prosp.</div></div>'
        + '<div class="mkpi"><div class="mkpi-val neg">' + cntN + '</div><div class="mkpi-lbl">Négo.</div></div>'
        + '<div class="mkpi"><div class="mkpi-val ok">' + cntC + '</div><div class="mkpi-lbl">Conclu</div></div>'
        + '</div>'
        + '<div class="member-pipeline">'
        + '<div class="mpip-title">Pipeline récent</div>'
        + pipelineHTML
        + '</div>';

      container.appendChild(card);
    });
  }

  function toggleMemberCard(uid) {
    var card = document.getElementById('member-' + uid);
    if (card) card.classList.toggle('expanded');
  }

  /* =========================================================
     ACTIVITÉ
  ========================================================= */

  function buildActivityFeed() {
    activityFeed = [];
    teamMembers.forEach(function (member) {
      (teamMembersPipeline[member.uid] || []).forEach(function (p) {
        activityFeed.push({
          memberName: member.name || member.email || 'Commercial',
          memberUid:  member.uid,
          company:    p.company_name || 'Entreprise',
          status:     p.status || 'prospection',
          date:       p.updated_at || p.created_at || new Date().toISOString(),
          note:       p.note || ''
        });
      });
    });
    activityFeed.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }

  function renderActivityFeed() {
    var container = document.getElementById('team-activity-content');
    var loader    = document.getElementById('activity-loading');
    if (loader)    loader.style.display = 'none';
    if (!container) return;

    container.innerHTML = '';

    if (!activityFeed.length) {
      container.innerHTML = "<div class='team-empty'><div class='team-empty-icon'>⚡</div><h3>Aucune activité</h3><p>L'activité de votre équipe apparaît ici.</p></div>";
      return;
    }

    var icons = { prospection: '🎯', negociation: '🤝', conclue: '✅' };

    activityFeed.slice(0, 30).forEach(function (item) {
      var dateStr = '';
      try {
        dateStr = new Date(item.date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
      } catch (e) {}

      var el = document.createElement('div');
      el.className = 'activity-item';
      el.innerHTML = '<div class="activity-dot-wrap"><div class="activity-dot ' + escapeHtml(item.status) + '"></div></div>'
        + '<div class="activity-body">'
        + '<div class="activity-text"><strong>' + escapeHtml(item.memberName) + '</strong> — '
        + (icons[item.status] || '') + ' <strong>' + escapeHtml(item.company) + '</strong> en '
        + escapeHtml(statusLabel(item.status)) + '</div>'
        + (item.note
          ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;font-style:italic">'
            + escapeHtml(item.note.slice(0, 80)) + (item.note.length > 80 ? '...' : '') + '</div>'
          : '')
        + '<div class="activity-meta">' + escapeHtml(dateStr) + '</div>'
        + '</div>';
      container.appendChild(el);
    });
  }

  /* =========================================================
     INIT
  ========================================================= */

  function init() {
    // Bind bouton activate
    var activateBtn = document.getElementById('activate-access-btn');
    if (activateBtn) {
      activateBtn.onclick = activateMemberAccess;
    }

    // Appliquer le rôle si user déjà chargé
    if (window.user) {
      applyManagerRole();
    }
  }

  /* =========================================================
     EXPOSITION GLOBALE — UNE SEULE SOURCE DE VÉRITÉ
     Toutes les fonctions appelées via onclick="..." dans le HTML
     doivent être ici.
  ========================================================= */

  var API = {
    // Navigation / Auth
    switchToActivationFlow: switchToActivationFlow,
    backToLoginForm:        backToLoginForm,
    activateMemberAccess:   activateMemberAccess,

    // Rôle
    applyManagerRole:       applyManagerRole,

    // Onglet Équipe
    switchTeamSeg:          switchTeamSeg,
    refreshTeamData:        refreshTeamData,
    loadTeamData:           loadTeamData,
    loadGeneratedAccesses:  loadGeneratedAccesses,

    // Rendu
    renderTeamMembers:      renderTeamMembers,
    renderAccessManagement: renderAccessManagement,
    renderActivityFeed:     renderActivityFeed,
    buildActivityFeed:      buildActivityFeed,
    toggleMemberCard:       toggleMemberCard,

    // Accès
    openCreateAccessSheet:  openCreateAccessSheet,
    copyAccessId:           copyAccessId,
    revokeAccess:           revokeAccess,

    // Helpers
    openSheet:              openSheet,
    closeSheet:             closeSheet
  };

  // ① Exposer sur window.TeamManagerMobile
  window.TeamManagerMobile = API;

  // ② Exposer directement sur window (pour les onclick inline du HTML)
  window.switchToActivationFlow = switchToActivationFlow;
  window.backToLoginForm        = backToLoginForm;
  window.activateMemberAccess   = activateMemberAccess;
  window.applyManagerRole       = applyManagerRole;
  window.switchTeamSeg          = switchTeamSeg;
  window.refreshTeamData        = refreshTeamData;

  // ③ Init au bon moment
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();