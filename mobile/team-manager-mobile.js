/**
 * team-manager-mobile.js — Sales Companion v2
 * Script classique (non-ESM), Firebase compat uniquement.
 *
 * CORRECTIONS :
 *  - loadTeamData() : lit UNIQUEMENT team_accesses where createdBy==managerUid AND status=='active'
 *    → exclut le manager lui-même (il n'est pas dans team_accesses)
 *    → exclut les non-activés et les révoqués
 *    → plus d'appel à GET /api/team (qui retournait tous les users)
 *  - Pipeline de chaque membre : récupéré via GET /api/pipeline?memberUid={firebaseUid}
 *    (le membre a un firebaseUid stocké dans team_accesses après activation)
 *  - loadGeneratedAccesses() : tous statuts (pending/active/revoked) → pour l'onglet Accès
 *  - Séparation claire : teamMembers (actifs) ≠ generatedAccesses (tous)
 */

(function () {
  'use strict';

  /* =========================================================
     ÉTAT LOCAL
  ========================================================= */
  var teamMembers         = [];   // membres actifs uniquement (status:'active')
  var teamMembersPipeline = {};   // { [firebaseUid]: [...] }
  var currentTeamSeg      = 'members';
  var activityFeed        = [];
  var generatedAccesses   = [];   // tous les accès créés (pending + active + revoked)
  var isTeamDataLoading   = false;

  /* =========================================================
     HELPERS DE BASE
  ========================================================= */

  function getDb() {
    if (window._db) return window._db;
    try { return firebase.apps.length ? firebase.firestore() : null; } catch (e) { return null; }
  }

  function getServerTimestamp() {
    try { return firebase.firestore.FieldValue.serverTimestamp(); } catch (e) { return new Date().toISOString(); }
  }

  function getAuthToken() {
    return window.token || localStorage.getItem('sc_token') || '';
  }

  function getUserRole() {
    return ((window.user && window.user.role) || '').toLowerCase().trim();
  }

  function getCurrentManagerUid() {
    if (window.user && window.user.uid) return window.user.uid;
    try {
      var u = firebase.auth().currentUser;
      return u ? u.uid : null;
    } catch (e) { return null; }
  }

  function toast(msg) {
    if (typeof window.toast === 'function' && window.toast !== toast) { window.toast(msg); return; }
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'toast show';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.className = 'toast'; }, 3000);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return dateStr; }
  }

  function statusLabel(s) {
    return { prospection: 'Prospect', negociation: 'Négo', conclue: 'Conclu' }[s] || s || '—';
  }

  function getRailwayBase() {
    if (typeof RAILWAY_SERVER !== 'undefined' && RAILWAY_SERVER) return RAILWAY_SERVER;
    if (typeof API_ENDPOINT   !== 'undefined' && API_ENDPOINT)   return API_ENDPOINT;
    return '';
  }

  /* =========================================================
     SHEET HELPERS
  ========================================================= */

  function openSheet(id) {
    if (typeof window.openSheet === 'function' && window.openSheet !== openSheet) { window.openSheet(id); return; }
    var sheet   = document.getElementById(id);
    var overlay = document.getElementById(id.replace('-sheet', '-overlay'));
    if (overlay) overlay.classList.add('open');
    if (sheet)   setTimeout(function () { sheet.classList.add('open'); }, 10);
  }

  function closeSheet(id) {
    if (typeof window.closeSheet === 'function' && window.closeSheet !== closeSheet) { window.closeSheet(id); return; }
    var sheet   = document.getElementById(id);
    var overlay = document.getElementById(id.replace('-sheet', '-overlay'));
    if (sheet)   sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  /* =========================================================
     APPEL API REST (Railway) — uniquement pour le pipeline
  ========================================================= */

  function apiCall(method, endpoint) {
    var tok = getAuthToken();
    return fetch(getRailwayBase() + endpoint, {
      method:  method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': tok ? 'Bearer ' + tok : ''
      }
    });
  }

  /* =========================================================
     FLUX CONNEXION / ACTIVATION
  ========================================================= */

  function switchToActivationFlow() {
  document.getElementById('auth-screen').style.display = 'flex';
  
  // ✅ Cacher la CARTE ENTIÈRE (pas juste login-form)
  document.getElementById('auth-sheet').style.display = 'none';
  
  // ✅ Afficher le formulaire d'activation
  document.getElementById('activation-form').style.display = 'block';

  // Reset champs
  ['activation-access-id', 'activation-email',
   'activation-new-password', 'activation-confirm-password'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  setActivationError('');
  setTimeout(function() {
    var f = document.getElementById('activation-access-id');
    if (f) f.focus();
  }, 50);
}

function backToLoginForm() {
  // ✅ Remettre la carte login
  document.getElementById('auth-sheet').style.display = '';
  
  // ✅ Cacher activation
  document.getElementById('activation-form').style.display = 'none';
  
  setActivationError('');
}

  /* =========================================================
     ACTIVATION — orchestre member-access.js
  ========================================================= */

  async function activateMemberAccess() {
    var accessId  = (document.getElementById('activation-access-id')?.value        || '').trim();
    var email     = (document.getElementById('activation-email')?.value             || '').trim();
    var password  = (document.getElementById('activation-new-password')?.value      || '');
    var confirm   = (document.getElementById('activation-confirm-password')?.value  || '');
    var btn       = document.getElementById('activate-access-btn');

    setActivationError('');

    if (!window.MemberAccessManager) {
      setActivationError("Module d'accès non disponible. Rechargez la page.");
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Activation en cours...'; }

    try {
      var result = await window.MemberAccessManager.activateMemberAccount(
        accessId, email, password, confirm
      );

        if (!result.success) {
    setActivationError(result.message || "Erreur d'activation.");
    return;
  }
 
  // ── Activation réussie : ouvrir la session directement ──────────
  setActivationError('');
  toast('🎉 Compte activé !');
 
  var sessionOpened = false;
 
  // Option A : Railway a retourné un Firebase Custom Token
  // → connexion silencieuse directe sans redemander les credentials
  if (result.customToken) {
    try {
      var auth = window._auth || firebase.auth();
      var cred = await auth.signInWithCustomToken(result.customToken);
      var idToken = await cred.user.getIdToken();
      window.token = idToken;
      localStorage.setItem('sc_token', idToken);
 
      // Charger le profil utilisateur
      var userSnap = await (window._db || firebase.firestore())
        .collection('users').doc(cred.user.uid).get();
      if (userSnap.exists) {
        window.user = Object.assign({ uid: cred.user.uid }, userSnap.data());
        if (typeof window.showApp === 'function') window.showApp();
        sessionOpened = true;
      }
    } catch (e) {
      console.warn('[activateMemberAccess] Custom token login failed:', e.message);
    }
  }
 
  // Option B : Connexion avec email + password (toujours disponible)
  if (!sessionOpened && result.email) {
    try {
      var auth2  = window._auth || firebase.auth();
      var email2 = result.email;
      // Récupérer le password depuis le champ (encore présent avant reset)
      var pass2  = document.getElementById('activation-new-password')?.value || '';
 
      if (pass2) {
        var cred2    = await auth2.signInWithEmailAndPassword(email2, pass2);
        var idToken2 = await cred2.user.getIdToken();
        window.token = idToken2;
        localStorage.setItem('sc_token', idToken2);
 
        var userSnap2 = await (window._db || firebase.firestore())
          .collection('users').doc(cred2.user.uid).get();
        if (userSnap2.exists) {
          window.user = Object.assign({ uid: cred2.user.uid }, userSnap2.data());
          if (typeof window.showApp === 'function') window.showApp();
          sessionOpened = true;
        }
      }
    } catch (e) {
      console.warn('[activateMemberAccess] Email/pass login failed:', e.message);
    }
  }
 
  // Option C (desktop Electron) : token JWT Railway retourné
  if (!sessionOpened && result.token) {
    window.token = result.token;
    localStorage.setItem('authToken', result.token);
    if (window.electronAPI && typeof window.electronAPI.saveToken === 'function') {
      await window.electronAPI.saveToken(result.token);
    }
    if (typeof window.showApp === 'function') window.showApp();
    sessionOpened = true;
  }
 
  // Option D : aucune session ouverte → rediriger vers login
  if (!sessionOpened) {
    toast('Compte activé. Connectez-vous avec votre email.');
    // Vider les champs AVANT de revenir au login
    ['activation-access-id','activation-email',
     'activation-new-password','activation-confirm-password'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    setTimeout(backToLoginForm, 1200);
  }
    } catch (e) {
      setActivationError('Erreur inattendue : ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Activer mon compte →'; }
    }
  }

  /* =========================================================
     RÔLE MANAGER — NAVIGATION
  ========================================================= */

  function applyManagerRole() {
    var isManager = getUserRole() === 'manager';

    var navTeam   = document.getElementById('nav-team');
    var tabTeam   = document.getElementById('tab-team');
    var badge     = document.getElementById('team-badge');
    var assignBtn = document.getElementById('manager-assign-btn-m');

    if (navTeam)   navTeam.style.display   = isManager ? 'flex'  : 'none';
    if (tabTeam)   tabTeam.style.display   = isManager ? ''      : 'none';
    if (badge && !isManager) badge.style.display = 'none';
    if (assignBtn) assignBtn.style.display = isManager ? 'block' : 'none';

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

    var map = {
      members:  'team-members-view-container',
      activity: 'team-activity-view',
      access:   'team-access-view'
    };
    Object.keys(map).forEach(function (k) {
      var v = document.getElementById(map[k]);
      if (v) v.classList.toggle('active', k === seg);
    });

    if (seg === 'activity') { buildActivityFeed(); renderActivityFeed(); }
    if (seg === 'access')   { renderAccessManagement(); }
    if (seg === 'members')  { renderTeamMembers(); }
  }

  /* =========================================================
     REFRESH GLOBAL
  ========================================================= */

  async function refreshTeamData() {
    if (getUserRole() !== 'manager') return;
    var tl = document.getElementById('team-loading');
    var al = document.getElementById('activity-loading');
    if (tl) tl.style.display = 'flex';
    if (al) al.style.display = 'flex';
    await loadTeamData();
    await loadGeneratedAccesses();
    if (currentTeamSeg === 'access') renderAccessManagement();
  }

  /* =========================================================
     CHARGEMENT DES MEMBRES — FIRESTORE UNIQUEMENT

     Source : collection team_accesses
     Filtres :
       - createdBy == managerUid   → uniquement l'équipe de CE manager
       - status    == 'active'     → uniquement les accès activés
       - activated == true         → double sécurité

     Résultat : teamMembers = [ { accessId, name, email, firebaseUid, ... } ]
     Le manager lui-même n'est JAMAIS dans team_accesses → ne peut pas s'y retrouver.
  ========================================================= */

  async function loadTeamData() {
    if (getUserRole() !== 'manager' || isTeamDataLoading) return;
    isTeamDataLoading = true;

    var db          = getDb();
    var container   = document.getElementById('team-members-view');
    var teamLoading = document.getElementById('team-loading');

    try {
      if (teamLoading) teamLoading.style.display = 'flex';

      if (!db) throw new Error('Firestore non disponible');

      var managerUid = getCurrentManagerUid();
      if (!managerUid) throw new Error('Manager non identifié');

      /* ── Lecture Firestore : membres actifs de CE manager uniquement ── */
      var snap = await db.collection('team_accesses')
        .where('createdBy', '==', managerUid)
        .where('status',    '==', 'active')
        .get();

      teamMembers = snap.docs
        .map(function (d) {
          var data = d.data();
          return {
            accessId:    data.accessId    || d.id,
            firebaseUid: data.firebaseUid || null,
            name:        ((data.firstname || '') + ' ' + (data.lastname || '')).trim() || 'Sans nom',
            email:       data.email       || '',
            company:     data.company     || '',
            activatedAt: data.activatedAt && data.activatedAt.toDate
                           ? data.activatedAt.toDate().toISOString() : ''
          };
        })
        /* Double sécurité : exclure tout doc qui n'aurait pas de firebaseUid
           (ne devrait pas arriver avec le flux d'activation corrigé) */
        .filter(function (m) { return m.firebaseUid; });

      /* ── Pipeline de chaque membre via Railway (filtre par firebaseUid) ── */
      teamMembersPipeline = {};
      await Promise.all(teamMembers.map(async function (member) {
        try {
          var r = await apiCall('GET', '/api/pipeline?memberUid=' + encodeURIComponent(member.firebaseUid));
          if (r.ok) {
            var d = await r.json();
            teamMembersPipeline[member.firebaseUid] = d.data || [];
          } else {
            teamMembersPipeline[member.firebaseUid] = [];
          }
        } catch (e) {
          teamMembersPipeline[member.firebaseUid] = [];
        }
      }));

      renderTeamMembers();
      buildActivityFeed();
      if (currentTeamSeg === 'activity') renderActivityFeed();

      /* Badge */
      var pending = teamMembers.reduce(function (acc, m) {
        return acc + (teamMembersPipeline[m.firebaseUid] || []).filter(function (p) {
          return p.status === 'prospection' || p.status === 'negociation';
        }).length;
      }, 0);
      var badge = document.getElementById('team-badge');
      if (badge) { badge.textContent = pending; badge.style.display = pending ? '' : 'none'; }

    } catch (e) {
      console.error('[loadTeamData]', e);
      if (container) {
        container.innerHTML = "<div class='team-empty'>"
          + "<div class='team-empty-icon'>📡</div>"
          + "<h3>Impossible de charger l'équipe</h3>"
          + "<p>" + escapeHtml(e.message) + "</p></div>";
      }
    } finally {
      if (teamLoading) teamLoading.style.display = 'none';
      var al = document.getElementById('activity-loading');
      if (al) al.style.display = 'none';
      isTeamDataLoading = false;
    }
  }

  /* =========================================================
     CHARGEMENT DE TOUS LES ACCÈS (onglet Accès)
     → tous statuts : pending + active + revoked
  ========================================================= */

  async function loadGeneratedAccesses() {
    if (getUserRole() !== 'manager') return;
    var db = getDb();
    var managerUid = getCurrentManagerUid();
    if (!db || !managerUid) { generatedAccesses = []; return; }

    try {
      var snap = await db.collection('team_accesses')
        .where('createdBy', '==', managerUid)
        .orderBy('createdAt', 'desc')
        .get();

      generatedAccesses = snap.docs.map(function (d) {
        var data = d.data();
        return {
          id:           d.id,
          access_id:    data.accessId     || d.id,
          member_name:  ((data.firstname || '') + ' ' + (data.lastname || '')).trim(),
          email:        data.email        || '',
          company:      data.company      || '',
          firebaseUid:  data.firebaseUid  || null,
          status:       data.status       || 'pending',
          created_at:   data.createdAt  && data.createdAt.toDate  ? data.createdAt.toDate().toISOString()  : '',
          activated_at: data.activatedAt && data.activatedAt.toDate ? data.activatedAt.toDate().toISOString() : '',
          revoked_at:   data.revokedAt  && data.revokedAt.toDate  ? data.revokedAt.toDate().toISOString()  : ''
        };
      });
    } catch (e) {
      console.error('[loadGeneratedAccesses]', e);
      generatedAccesses = [];
    }
  }

  /* =========================================================
     RENDU — ONGLET COMMERCIAUX
  ========================================================= */

  function renderTeamMembers() {
    var container   = document.getElementById('team-members-view');
    var teamLoading = document.getElementById('team-loading');
    if (teamLoading) teamLoading.style.display = 'none';
    if (!container) return;

    if (!teamMembers.length) {
      container.innerHTML = "<div class='team-empty'>"
        + "<div class='team-empty-icon'>👥</div>"
        + "<h3>Aucun commercial actif</h3>"
        + "<p>Créez des accès dans l'onglet « Accès » et invitez vos commerciaux à les activer.</p>"
        + "</div>";
      return;
    }

    container.innerHTML = '';

    teamMembers.forEach(function (member) {
      var pipeline = teamMembersPipeline[member.firebaseUid] || [];
      var cntP = pipeline.filter(function (p) { return p.status === 'prospection'; }).length;
      var cntN = pipeline.filter(function (p) { return p.status === 'negociation'; }).length;
      var cntC = pipeline.filter(function (p) { return p.status === 'conclue';     }).length;

      var initials = member.name
        .split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase()
        || '?';

      var fidEsc = member.firebaseUid.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      var pipelineHTML = pipeline.slice(0, 5).map(function (p) {
        return '<div class="mpip-item">'
          + '<span class="mpip-item-name">' + escapeHtml(p.company_name || '—') + '</span>'
          + '<span class="mpip-item-status ' + escapeHtml(p.status || 'prospection') + '">'
          + escapeHtml(statusLabel(p.status)) + '</span>'
          + '</div>';
      }).join('') || '<div style="font-size:12px;color:var(--text-tertiary);padding:4px 0">Aucun prospect assigné</div>';

      var card = document.createElement('div');
      card.className = 'member-card';
      card.id        = 'member-' + member.firebaseUid;

      card.innerHTML =
        '<div class="member-head" onclick="window.TeamManagerMobile.toggleMemberCard(\'' + fidEsc + '\')">'
        + '<div class="member-av">' + escapeHtml(initials) + '</div>'
        + '<div class="member-info">'
        +   '<div class="member-name">'  + escapeHtml(member.name)    + '</div>'
        +   '<div class="member-email">' + escapeHtml(member.email)   + '</div>'
        +   (member.company ? '<div style="font-size:11px;color:var(--text-tertiary)">' + escapeHtml(member.company) + '</div>' : '')
        + '</div>'
        + '<svg class="member-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>'
        + '</div>'
        + '<div class="member-kpi">'
        +   '<div class="mkpi"><div class="mkpi-val">'     + cntP + '</div><div class="mkpi-lbl">Prosp.</div></div>'
        +   '<div class="mkpi"><div class="mkpi-val neg">' + cntN + '</div><div class="mkpi-lbl">Négo.</div></div>'
        +   '<div class="mkpi"><div class="mkpi-val ok">'  + cntC + '</div><div class="mkpi-lbl">Conclu</div></div>'
        + '</div>'
        + '<div class="member-pipeline">'
        +   '<div class="mpip-title">Pipeline récent</div>'
        +   pipelineHTML
        + '</div>';

      container.appendChild(card);
    });
  }

  function toggleMemberCard(firebaseUid) {
    var card = document.getElementById('member-' + firebaseUid);
    if (card) card.classList.toggle('expanded');
  }

  /* =========================================================
     RENDU — ONGLET ACCÈS
     Affiche TOUS les accès (pending + active + revoked)
  ========================================================= */

  function renderAccessManagement() {
    var container = document.getElementById('team-access-view');
    if (!container) return;

    var activeCount = generatedAccesses.filter(function (a) {
      return a.status === 'active' || a.status === 'pending';
    }).length;
    var canCreate = activeCount < 10;

    var html = '<div class="access-header">'
      + '<div class="access-quota">'
      +   '<div class="access-quota-num">' + activeCount + '/10</div>'
      +   '<div class="access-quota-label">Accès actifs / en attente</div>'
      + '</div>'
      + '<button class="btn-primary" type="button" onclick="window.TeamManagerMobile.openCreateAccessSheet()" '
      +   (canCreate ? '' : 'disabled') + '>'
      +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">'
      +     '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
      +   '</svg> Créer un accès'
      + '</button>'
      + '</div>';

    if (!generatedAccesses.length) {
      html += '<div class="team-empty"><div class="team-empty-icon">🔑</div>'
        + '<h3>Aucun accès créé</h3>'
        + '<p>Créez jusqu\'à 10 accès pour votre équipe.</p></div>';
      container.innerHTML = html;
      return;
    }

    var icons  = { pending: '⏳', active: '✅', revoked: '❌' };
    var labels = { pending: 'En attente', active: 'Actif', revoked: 'Révoqué' };

    html += '<div class="access-list">';
    generatedAccesses.forEach(function (acc) {
      var aId    = escapeHtml(acc.access_id);
      var aIdRaw = acc.access_id.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      html += '<div class="access-card ' + escapeHtml(acc.status) + '">'

        /* En-tête */
        + '<div class="access-card-header">'
        +   '<div class="access-card-id">' + aId + '</div>'
        +   '<div class="access-status-badge ' + escapeHtml(acc.status) + '">'
        +     (icons[acc.status] || '') + ' ' + (labels[acc.status] || acc.status)
        +   '</div>'
        + '</div>'

        /* Infos */
        + '<div class="access-card-info">'
        +   '<div class="access-info-row"><strong>Nom :</strong> '     + escapeHtml(acc.member_name || '—') + '</div>'
        +   '<div class="access-info-row"><strong>Entreprise :</strong> ' + escapeHtml(acc.company   || '—') + '</div>'
        +   (acc.email ? '<div class="access-info-row"><strong>Email :</strong> ' + escapeHtml(acc.email) + '</div>' : '')
        +   '<div class="access-info-row"><strong>Créé le :</strong> '  + escapeHtml(formatDate(acc.created_at))  + '</div>'
        +   (acc.activated_at ? '<div class="access-info-row"><strong>Activé le :</strong> ' + escapeHtml(formatDate(acc.activated_at)) + '</div>' : '')
        +   (acc.revoked_at   ? '<div class="access-info-row"><strong>Révoqué le :</strong> '+ escapeHtml(formatDate(acc.revoked_at))   + '</div>' : '')
        + '</div>'

        /* Actions */
        + '<div class="access-card-actions">';

      if (acc.status === 'pending') {
        html += "<button class='access-btn copy' data-access-id='" + escapeHtml(acc.access_id) + "' "
          + "onclick='window.TeamManagerMobile.copyAccessId(this.getAttribute(\"data-access-id\"))'>Copier l'ID</button>";
      }
      if (acc.status !== 'revoked') {
        html += "<button class='access-btn revoke' data-access-id='" + escapeHtml(acc.access_id) + "' "
          + "onclick='window.TeamManagerMobile.revokeAccess(this.getAttribute(\"data-access-id\"))'>Révoquer</button>";
      }

      html += '</div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }

  function openCreateAccessSheet() {
    var activeCount = generatedAccesses.filter(function (a) {
      return a.status === 'active' || a.status === 'pending';
    }).length;
    if (activeCount >= 10) { toast('Limite atteinte : 10 accès maximum.'); return; }

    var fields = {
      'new-access-firstname': '',
      'new-access-lastname':  '',
      'new-access-company':   ''
    };
    Object.keys(fields).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = fields[id];
    });
    var preview = document.getElementById('new-access-preview');
    if (preview) preview.textContent = '@' + (fields['new-access-company'] || 'Entreprise');

    var btn = document.getElementById('create-access-btn');
    if (btn) { btn.disabled = false; btn.textContent = "Créer l'accès"; }

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
    if (!confirm('Voulez-vous vraiment révoquer cet accès ?\nLe membre ne pourra plus se connecter.')) return;
    if (!window.MemberAccessManager) { toast('Module non disponible'); return; }
    var ok = await window.MemberAccessManager.revokeMemberAccess(accessId);
    if (ok) {
      await loadGeneratedAccesses();
      renderAccessManagement();
      /* Retirer de la liste des membres actifs si présent */
      teamMembers = teamMembers.filter(function (m) { return m.accessId !== accessId; });
      renderTeamMembers();
    }
  }

  /* =========================================================
     RENDU — ONGLET ACTIVITÉ
  ========================================================= */

  function buildActivityFeed() {
    activityFeed = [];
    teamMembers.forEach(function (member) {
      (teamMembersPipeline[member.firebaseUid] || []).forEach(function (p) {
        activityFeed.push({
          memberName: member.name  || 'Commercial',
          memberUid:  member.firebaseUid,
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
      container.innerHTML = "<div class='team-empty'><div class='team-empty-icon'>⚡</div>"
        + "<h3>Aucune activité</h3><p>L'activité de votre équipe apparaîtra ici.</p></div>";
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
      el.innerHTML =
        '<div class="activity-dot-wrap"><div class="activity-dot ' + escapeHtml(item.status) + '"></div></div>'
        + '<div class="activity-body">'
        +   '<div class="activity-text"><strong>' + escapeHtml(item.memberName) + '</strong> — '
        +     (icons[item.status] || '') + ' <strong>' + escapeHtml(item.company) + '</strong>'
        +     ' en ' + escapeHtml(statusLabel(item.status))
        +   '</div>'
        +   (item.note
          ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;font-style:italic">'
            + escapeHtml(item.note.slice(0, 80)) + (item.note.length > 80 ? '...' : '') + '</div>'
          : '')
        +   '<div class="activity-meta">' + escapeHtml(dateStr) + '</div>'
        + '</div>';
      container.appendChild(el);
    });
  }

  /* =========================================================
     INIT
  ========================================================= */

  function init() {
    var btn = document.getElementById('activate-access-btn');
    if (btn) btn.onclick = activateMemberAccess;
    if (window.user) applyManagerRole();
  }

  /* =========================================================
     EXPOSITION GLOBALE
  ========================================================= */

  var PUBLIC_API = {
    /* Auth / Activation */
    switchToActivationFlow: switchToActivationFlow,
    backToLoginForm:        backToLoginForm,
    activateMemberAccess:   activateMemberAccess,
    /* Rôle */
    applyManagerRole:       applyManagerRole,
    /* Équipe */
    switchTeamSeg:          switchTeamSeg,
    refreshTeamData:        refreshTeamData,
    loadTeamData:           loadTeamData,
    loadGeneratedAccesses:  loadGeneratedAccesses,
    /* Rendu */
    renderTeamMembers:      renderTeamMembers,
    renderAccessManagement: renderAccessManagement,
    renderActivityFeed:     renderActivityFeed,
    buildActivityFeed:      buildActivityFeed,
    toggleMemberCard:       toggleMemberCard,
    /* Accès */
    openCreateAccessSheet:  openCreateAccessSheet,
    copyAccessId:           copyAccessId,
    revokeAccess:           revokeAccess,
    /* Sheets */
    openSheet:              openSheet,
    closeSheet:             closeSheet
  };

  window.TeamManagerMobile = PUBLIC_API;

  /* Exposition directe pour les onclick inline */
  window.switchToActivationFlow = switchToActivationFlow;
  window.backToLoginForm        = backToLoginForm;
  window.activateMemberAccess   = activateMemberAccess;
  window.applyManagerRole       = applyManagerRole;
  window.switchTeamSeg          = switchTeamSeg;
  window.refreshTeamData        = refreshTeamData;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();