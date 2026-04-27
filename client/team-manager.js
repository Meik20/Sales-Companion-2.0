/**
 * team-manager.js — Sales Companion Client (Desktop/Electron)
 *
 * CORRECTIONS v2 :
 *  - loadTeamMembers() : lit UNIQUEMENT Firestore team_accesses
 *    where createdBy==managerUid AND status=='active'
 *    → exclut le manager lui-même (jamais dans team_accesses)
 *    → exclut non-activés et révoqués
 *    → suppression de l'appel GET /api/team qui retournait tous les users
 *  - loadMemberPipeline() : utilise firebaseUid (clé correcte après activation)
 *  - loadAccesses() : lit Firestore pour tous les statuts (pending/active/revoked)
 *  - createAccess() : délègue à window.MemberAccessManager (source unique)
 *  - activateMemberAccess() : délègue à window.MemberAccessManager (source unique)
 *  - loadTeamMembersDesktop() : corrigé (même source Firestore)
 *  - Toutes les fonctions exposées sur window.TeamManager
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURATION
  ═══════════════════════════════════════════════════════════ */

  var CONFIG = {
    MAX_ACTIVE_ACCESSES:        10,
    BATCH_SIZE:                 5,
    DEBOUNCE_DELAY:             150,
    ACTIVITY_FEED_LIMIT:        30,
    PIPELINE_PREVIEW_LIMIT:     5,
    REALTIME_REFRESH_INTERVAL:  15000
  };

  /* ═══════════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════════ */

  var State = {
    members:             [],   // membres actifs uniquement (status:'active')
    pipelines:           {},   // { [firebaseUid]: [...] }
    accesses:            [],   // tous les accès (pending + active + revoked)
    activityFeed:        [],
    currentSeg:          'members',
    isTeamTabActive:     false,
    loadingPromise:      null,
    realtimeInterval:    null
  };

  /* ═══════════════════════════════════════════════════════════
     HELPERS DE BASE
  ═══════════════════════════════════════════════════════════ */

  function getDb() {
    if (window._db) return window._db;
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        return firebase.firestore();
      }
    } catch (e) {}
    return null;
  }

  function getToken() {
    return window.token || localStorage.getItem('sc_token') || localStorage.getItem('authToken') || '';
  }

  function getUser() {
    return window.user || null;
  }

  function getRailwayBase() {
    return window.RAILWAY_SERVER || '';
  }

  function getCurrentManagerUid() {
    var u = getUser();
    if (u && u.uid) return u.uid;
    try {
      var auth = window._auth || firebase.auth();
      return auth.currentUser ? auth.currentUser.uid : null;
    } catch (e) { return null; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
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
    } catch (e) { return '—'; }
  }

  function getInitials(name, email) {
    var text = name || email || '?';
    return text.split(/\s+/).slice(0, 2).map(function (w) { return (w[0] || '').toUpperCase(); }).join('') || 'U';
  }

  function debounce(fn, delay) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(this, args); }, delay);
    };
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

  /* ═══════════════════════════════════════════════════════════
     API — fetch direct Railway (token Bearer)
  ═══════════════════════════════════════════════════════════ */

  function apiCall(method, endpoint, data) {
    var tok = getToken();
    var opts = {
      method:  method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (tok) opts.headers['Authorization'] = 'Bearer ' + tok;
    if (data && (method === 'POST' || method === 'PUT')) opts.body = JSON.stringify(data);
    return fetch(getRailwayBase() + endpoint, opts);
  }

  /* ═══════════════════════════════════════════════════════════
     UI HELPERS
  ═══════════════════════════════════════════════════════════ */

  function openSheet(sheetId) {
    var el = document.getElementById(sheetId);
    if (el) el.classList.add('open');
  }

  function closeSheet(sheetId) {
    var el = typeof sheetId === 'string' ? document.getElementById(sheetId) : sheetId;
    if (el) el.classList.remove('open');
  }

  function setLoading(id, show) {
    var el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  function renderEmpty(containerId, icon, title, message) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div class="team-empty">'
      + '<div class="team-empty-icon">' + icon + '</div>'
      + '<h3>' + escapeHtml(title) + '</h3>'
      + '<p>' + escapeHtml(message) + '</p>'
      + '</div>';
  }

  /* ═══════════════════════════════════════════════════════════
     RÔLE MANAGER
  ═══════════════════════════════════════════════════════════ */

  function applyManagerRole() {
    var u         = getUser();
    var isManager = u && u.role === 'manager';

    var tbTeamBtn   = document.getElementById('tb-team-btn');
    var managerBtn  = document.getElementById('manager-assign-btn');
    var tbAvatar    = document.getElementById('tb-avatar');

    if (tbTeamBtn)  tbTeamBtn.style.display  = isManager ? 'block'        : 'none';
    if (managerBtn) managerBtn.style.display = isManager ? 'inline-flex'  : 'none';
    if (tbAvatar && u) tbAvatar.textContent  = getInitials(u.name, u.email);
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION — onglets équipe
  ═══════════════════════════════════════════════════════════ */

  function switchToTeamTab() {
    var panelCenter = document.querySelector('.panel-center');
    var panelRight  = document.querySelector('.panel-right');
    var teamContent = document.getElementById('team-manager-content');

    if (!State.isTeamTabActive) {
      if (panelCenter) panelCenter.style.display = 'none';
      if (panelRight)  panelRight.style.display  = 'none';
      if (teamContent) { teamContent.style.display = 'flex'; teamContent.style.flex = '1'; }

      var tbBtn = document.getElementById('tb-team-btn');
      if (tbBtn) { tbBtn.style.background = 'rgba(255,255,255,0.25)'; tbBtn.style.fontWeight = '700'; }

      State.isTeamTabActive = true;
      startRealtimeRefresh();

      if (!State.members.length) loadTeamData();
      if (!State.accesses.length) loadAccesses();

      switchTeamSeg(State.currentSeg || 'members', null);
    } else {
      switchToSearchTab();
    }
  }

  function switchToSearchTab() {
    var panelCenter = document.querySelector('.panel-center');
    var panelRight  = document.querySelector('.panel-right');
    var teamContent = document.getElementById('team-manager-content');

    if (panelCenter) panelCenter.style.display = '';
    if (panelRight)  panelRight.style.display  = '';
    if (teamContent) teamContent.style.display = 'none';

    var tbBtn = document.getElementById('tb-team-btn');
    if (tbBtn) { tbBtn.style.background = 'transparent'; tbBtn.style.fontWeight = '500'; }

    stopRealtimeRefresh();
    State.isTeamTabActive = false;
  }

  function switchTeamSeg(seg, el) {
    State.currentSeg = seg;

    // Bouton "Créer accès" visible uniquement sur l'onglet Accès
    var createBtnHdr = document.getElementById('create-access-btn-header');
    if (createBtnHdr) createBtnHdr.style.display = (seg === 'access') ? 'inline-flex' : 'none';

    document.querySelectorAll('.tseg').forEach(function (b) { b.classList.remove('active'); });
    if (el) el.classList.add('active');
    else {
      // Activer le bon bouton si el non fourni
      var segIndex = { members: 0, activity: 1, access: 2 }[seg] || 0;
      var segs = document.querySelectorAll('.tseg');
      if (segs[segIndex]) segs[segIndex].classList.add('active');
    }

    var views = {
      members:  document.getElementById('team-members-view'),
      activity: document.getElementById('team-activity-view'),
      access:   document.getElementById('team-access-view')
    };

    Object.keys(views).forEach(function (k) {
      if (views[k]) views[k].style.display = (k === seg) ? 'block' : 'none';
    });

    setLoading('team-loading', false);
    setLoading('activity-loading', false);

    if (seg === 'activity') { buildActivityFeed(); renderActivityFeed(); }
    if (seg === 'access')   { renderAccesses(); }
    if (seg === 'members')  { renderTeamMembers(); }
  }

  /* ═══════════════════════════════════════════════════════════
     TEMPS RÉEL
  ═══════════════════════════════════════════════════════════ */

  function startRealtimeRefresh() {
    stopRealtimeRefresh();
    State.realtimeInterval = setInterval(async function () {
      var u = getUser();
      if (!u || u.role !== 'manager' || !State.isTeamTabActive) return;
      try {
        await loadTeamData(true);
        await loadAccesses(true);
      } catch (e) {
        console.warn('[Realtime] Refresh error:', e);
      }
    }, CONFIG.REALTIME_REFRESH_INTERVAL);
  }

  function stopRealtimeRefresh() {
    if (State.realtimeInterval) { clearInterval(State.realtimeInterval); State.realtimeInterval = null; }
  }

  /* ═══════════════════════════════════════════════════════════
     CHARGEMENT DES MEMBRES — FIRESTORE UNIQUEMENT

     Source : team_accesses
     Filtres :
       createdBy == managerUid  → uniquement l'équipe de CE manager
       status    == 'active'    → uniquement les membres activés
     Le manager n'est JAMAIS dans team_accesses → impossible de se retrouver dans son équipe
  ═══════════════════════════════════════════════════════════ */

  async function loadTeamData(silent) {
    var u = getUser();
    if (!u || u.role !== 'manager') return;

    if (State.loadingPromise) return State.loadingPromise;

    if (!silent) setLoading('team-loading', true);

    State.loadingPromise = (async function () {
      try {
        var members = await loadTeamMembersFromFirestore();
        State.members  = members;

        // Pipeline de chaque membre
        await loadPipelinesInBatches(members);
        buildActivityFeed();

        if (State.currentSeg === 'members') renderTeamMembers();
        if (State.currentSeg === 'activity') renderActivityFeed();

      } catch (e) {
        console.error('[loadTeamData]', e);
        if (!silent) renderEmpty('team-members-view', '📡', 'Erreur de chargement', e.message);
      } finally {
        if (!silent) setLoading('team-loading', false);
        State.loadingPromise = null;
      }
    })();

    return State.loadingPromise;
  }

  /* ── Lecture Firestore : membres actifs uniquement ── */
  async function loadTeamMembersFromFirestore() {
    var db         = getDb();
    var managerUid = getCurrentManagerUid();

    if (!db || !managerUid) {
      console.warn('[loadTeamMembersFromFirestore] db ou managerUid manquant');
      return [];
    }

    var snap = await db.collection('team_accesses')
      .where('createdBy', '==', managerUid)
      .where('status',    '==', 'active')
      .get();

    return snap.docs
      .map(function (d) {
        var data = d.data();
        return {
          accessId:    data.accessId    || d.id,
          firebaseUid: data.firebaseUid || null,
          uid:         data.firebaseUid || null,   // alias pour compatibilité
          name:        ((data.firstname || '') + ' ' + (data.lastname || '')).trim() || 'Sans nom',
          email:       data.email       || '',
          company:     data.company     || '',
          activatedAt: data.activatedAt && data.activatedAt.toDate
                         ? data.activatedAt.toDate().toISOString() : ''
        };
      })
      // Garder uniquement ceux qui ont un firebaseUid (activés)
      .filter(function (m) { return m.firebaseUid; });
  }

  /* ── Pipeline de chaque membre via Railway ── */
  async function loadPipelinesInBatches(members) {
    var batchSize = CONFIG.BATCH_SIZE;
    for (var i = 0; i < members.length; i += batchSize) {
      var batch = members.slice(i, i + batchSize);
      await Promise.all(batch.map(async function (member) {
        try {
          var r = await apiCall('GET', '/api/pipeline?memberUid=' + encodeURIComponent(member.firebaseUid));
          State.pipelines[member.firebaseUid] = r.ok ? ((await r.json()).data || []) : [];
        } catch (e) {
          State.pipelines[member.firebaseUid] = [];
        }
      }));
    }
  }

  /* ═══════════════════════════════════════════════════════════
     CHARGEMENT DES ACCÈS — FIRESTORE (tous statuts)
     → Pour l'onglet Accès : pending + active + revoked
  ═══════════════════════════════════════════════════════════ */

  async function loadAccesses(silent) {
    var db         = getDb();
    var managerUid = getCurrentManagerUid();

    if (!db || !managerUid) {
      State.accesses = loadAccessesFromStorage();
      if (!silent && State.currentSeg === 'access') renderAccesses();
      return;
    }

    try {
      var snap = await db.collection('team_accesses')
        .where('createdBy', '==', managerUid)
        .orderBy('createdAt', 'desc')
        .get();

      State.accesses = snap.docs.map(function (d) {
        var data = d.data();
        return {
          id:           d.id,
          access_id:    data.accessId      || d.id,
          member_name:  ((data.firstname || '') + ' ' + (data.lastname || '')).trim(),
          company_name: data.company       || '',
          email:        data.email         || '',
          firebaseUid:  data.firebaseUid   || null,
          status:       data.status        || 'pending',
          created_at:   data.createdAt     && data.createdAt.toDate  ? data.createdAt.toDate().toISOString()  : '',
          activated_at: data.activatedAt   && data.activatedAt.toDate ? data.activatedAt.toDate().toISOString() : '',
          revoked_at:   data.revokedAt     && data.revokedAt.toDate  ? data.revokedAt.toDate().toISOString()  : ''
        };
      });

      persistAccessesToStorage();
      if (!silent && State.currentSeg === 'access') renderAccesses();

    } catch (e) {
      console.error('[loadAccesses]', e);
      State.accesses = loadAccessesFromStorage();
      if (!silent && State.currentSeg === 'access') renderAccesses();
    }
  }

  function loadAccessesFromStorage() {
    var u = getUser();
    if (!u) return [];
    try {
      var s = localStorage.getItem('team_accesses_' + u.uid);
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  }

  function persistAccessesToStorage() {
    var u = getUser();
    if (!u) return;
    try { localStorage.setItem('team_accesses_' + u.uid, JSON.stringify(State.accesses)); } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     RENDU — ONGLET COMMERCIAUX
  ═══════════════════════════════════════════════════════════ */

  function renderTeamMembers() {
    var container = document.getElementById('team-members-view');
    setLoading('team-loading', false);
    if (!container) return;

    if (!State.members.length) {
      renderEmpty('team-members-view', '👥', 'Aucun commercial actif',
        "Créez des accès dans l'onglet « Accès » et invitez vos commerciaux à les activer.");
      return;
    }

    container.innerHTML = '';
    State.members.forEach(function (member) {
      var card = createMemberCard(member);
      container.appendChild(card);
    });
  }

  function createMemberCard(member) {
    var pipeline  = State.pipelines[member.firebaseUid] || [];
    var cntP = pipeline.filter(function (p) { return p.status === 'prospection'; }).length;
    var cntN = pipeline.filter(function (p) { return p.status === 'negociation'; }).length;
    var cntC = pipeline.filter(function (p) { return p.status === 'conclue';     }).length;

    var initials = getInitials(member.name, member.email);
    var fidEsc   = escapeHtml(member.firebaseUid);

    var pipelineHTML = pipeline.slice(0, CONFIG.PIPELINE_PREVIEW_LIMIT).map(function (p) {
      var labels = { prospection: 'Prospect', negociation: 'Négo', conclue: 'Conclu' };
      return '<div class="mpip-item">'
        + '<span class="mpip-item-name">' + escapeHtml(p.company_name || '—') + '</span>'
        + '<span class="mpip-item-status ' + escapeHtml(p.status || 'prospection') + '">'
        + (labels[p.status] || 'Prospect')
        + '</span></div>';
    }).join('') || '<div style="font-size:12px;color:var(--tx3);padding:4px 0">Aucun prospect assigné</div>';

    var card = document.createElement('div');
    card.className = 'member-card';
    card.id        = 'member-' + member.firebaseUid;

    card.innerHTML =
      '<div class="member-head" role="button" tabindex="0" onclick="window.TeamManager.toggleMemberCard(\'' + fidEsc + '\')">'
      + '<div class="member-av">' + escapeHtml(initials) + '</div>'
      + '<div class="member-info">'
      +   '<div class="member-name">'  + escapeHtml(member.name)    + '</div>'
      +   '<div class="member-email">' + escapeHtml(member.email)   + '</div>'
      +   (member.company ? '<div style="font-size:11px;color:var(--tx3)">' + escapeHtml(member.company) + '</div>' : '')
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

    return card;
  }

  function toggleMemberCard(firebaseUid) {
    var card = document.getElementById('member-' + firebaseUid);
    if (card) card.classList.toggle('expanded');
  }

  /* ═══════════════════════════════════════════════════════════
     RENDU — ONGLET ACCÈS
  ═══════════════════════════════════════════════════════════ */

  function renderAccesses() {
    var container = document.getElementById('team-access-view');
    if (!container) return;

    var activeCount = State.accesses.filter(function (a) {
      return a.status === 'active' || a.status === 'pending';
    }).length;
    var canCreate = activeCount < CONFIG.MAX_ACTIVE_ACCESSES;
    var pct = Math.round(activeCount / CONFIG.MAX_ACTIVE_ACCESSES * 100);
    var quotaColor = activeCount >= 9 ? '#e53935' : activeCount >= 7 ? '#fb8c00' : '#43a047';

    var html = '<div style="display:flex;align-items:center;justify-content:space-between;'
      + 'margin-bottom:20px;padding:16px;background:var(--bg4);border-radius:12px;border:1px solid var(--bd)">'
      + '<div>'
      +   '<div style="font-size:26px;font-weight:800;color:' + quotaColor + '">' + activeCount
      +     '<span style="font-size:14px;color:var(--tx3);font-weight:500">/' + CONFIG.MAX_ACTIVE_ACCESSES + '</span></div>'
      +   '<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-top:2px">Accès actifs / en attente</div>'
      +   '<div style="margin-top:8px;height:4px;width:120px;background:#e0e0e0;border-radius:2px;overflow:hidden">'
      +     '<div style="height:100%;width:' + pct + '%;background:' + quotaColor + ';border-radius:2px;transition:width .3s"></div>'
      +   '</div>'
      + '</div></div>';

    if (!State.accesses.length) {
      html += '<div class="team-empty"><div class="team-empty-icon">🔑</div>'
        + '<h3>Aucun accès créé</h3>'
        + '<p>Cliquez sur « Créer accès » en haut pour générer un identifiant (max 10).</p></div>';
      container.innerHTML = html;
      return;
    }

    var statusIcons  = { pending: '⏳', active: '✅', revoked: '❌' };
    var statusLabels = { pending: 'En attente', active: 'Actif', revoked: 'Révoqué' };
    var statusColors = {
      pending: { bg: 'rgba(251,140,0,.1)',  color: '#e65100' },
      active:  { bg: 'rgba(67,160,71,.1)',  color: '#43a047' },
      revoked: { bg: 'rgba(229,57,53,.1)',  color: '#e53935' }
    };

    html += '<div style="display:flex;flex-direction:column;gap:10px">';
    State.accesses.forEach(function (acc) {
      var aId    = escapeHtml(acc.access_id || acc.id);
      var aIdRaw = (acc.access_id || String(acc.id)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var sc     = statusColors[acc.status] || statusColors.pending;

      html += '<div class="access-card" style="background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
        +   '<div style="font-family:monospace;font-size:13px;font-weight:700;color:var(--tx);'
        +     'background:var(--bg4);padding:6px 12px;border-radius:6px;border:1px solid var(--bd)">'
        +     aId
        +   '</div>'
        +   '<div style="font-size:11px;padding:4px 10px;border-radius:4px;font-weight:700;'
        +     'background:' + sc.bg + ';color:' + sc.color + '">'
        +     (statusIcons[acc.status] || '') + ' ' + (statusLabels[acc.status] || acc.status)
        +   '</div>'
        + '</div>'
        + '<div style="font-size:12px;color:var(--tx2);margin-bottom:10px;line-height:1.6">'
        +   '<div><strong>Nom :</strong> '       + escapeHtml(acc.member_name  || '—') + '</div>'
        +   '<div><strong>Entreprise :</strong> ' + escapeHtml(acc.company_name || '—') + '</div>'
        +   (acc.email ? '<div><strong>Email :</strong> ' + escapeHtml(acc.email) + '</div>' : '')
        +   '<div><strong>Créé le :</strong> '   + escapeHtml(formatDate(acc.created_at))  + '</div>'
        +   (acc.activated_at ? '<div><strong>Activé le :</strong> ' + escapeHtml(formatDate(acc.activated_at)) + '</div>' : '')
        +   (acc.revoked_at   ? '<div><strong>Révoqué le :</strong> ' + escapeHtml(formatDate(acc.revoked_at))  + '</div>' : '')
        + '</div>'
        + '<div style="display:flex;gap:8px">';

      if (acc.status === 'pending') {
        html += "<button onclick=\"window.TeamManager.copyAccessId('" + aIdRaw + "')\" "
          + "style=\"flex:1;padding:7px 12px;font-size:11.5px;font-weight:600;"
          + "border:1px solid rgba(67,160,71,.3);border-radius:6px;"
          + "background:rgba(67,160,71,.05);color:#43a047;cursor:pointer\">📋 Copier l'ID</button>";
      }
      if (acc.status !== 'revoked') {
        html += "<button onclick=\"window.TeamManager.revokeAccess('" + aIdRaw + "')\" "
          + "style=\"" + (acc.status === 'pending' ? '' : 'flex:1;') + "padding:7px 12px;font-size:11.5px;font-weight:600;"
          + "border:1px solid rgba(229,57,53,.25);border-radius:6px;"
          + "background:rgba(229,57,53,.05);color:#e53935;cursor:pointer\">✕ Révoquer</button>";
      }

      html += '</div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════
     CRÉATION D'UN ACCÈS — délègue à MemberAccessManager
  ═══════════════════════════════════════════════════════════ */

  async function openCreateAccessSheet() {
    var activeCount = State.accesses.filter(function (a) {
      return a.status === 'active' || a.status === 'pending';
    }).length;

    if (activeCount >= CONFIG.MAX_ACTIVE_ACCESSES) {
      toast('Limite atteinte : ' + CONFIG.MAX_ACTIVE_ACCESSES + ' accès maximum');
      return;
    }

    var u = getUser();
    var fields = {
      'new-access-firstname': '',
      'new-access-lastname':  '',
      'new-access-company':   (u && (u.company_name || u.company_id)) || ''
    };
    Object.keys(fields).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = fields[id];
    });

    var preview = document.getElementById('new-access-preview');
    if (preview) preview.textContent = '@' + (fields['new-access-company'] || 'Entreprise');

    var btn = document.getElementById('create-access-btn');
    if (btn) { btn.disabled = false; btn.textContent = "Créer l'accès"; }

    // Re-binder les events via MemberAccessManager
    if (window.MemberAccessManager && typeof window.MemberAccessManager.bindCreateAccessEvents === 'function') {
      window.MemberAccessManager.bindCreateAccessEvents();
    }

    openSheet('create-access-sheet');
  }

  function updateAccessPreview() {
    if (window.MemberAccessManager && typeof window.MemberAccessManager.updateAccessPreview === 'function') {
      window.MemberAccessManager.updateAccessPreview();
    }
  }

  async function submitCreateAccess() {
    if (window.MemberAccessManager && typeof window.MemberAccessManager.createMemberAccess === 'function') {
      var ok = await window.MemberAccessManager.createMemberAccess();
      if (ok) {
        await loadAccesses();
        renderAccesses();
      }
    }
  }

  async function copyAccessId(accessId) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(accessId);
        toast('📋 ID copié : ' + accessId);
      } else {
        var inp = document.createElement('input');
        inp.value = accessId;
        document.body.appendChild(inp);
        inp.select();
        document.execCommand('copy');
        document.body.removeChild(inp);
        toast('📋 ID copié');
      }
    } catch (e) {
      toast('Erreur de copie');
    }
  }

  async function revokeAccess(accessId) {
    if (!confirm('Voulez-vous vraiment révoquer l\'accès « ' + accessId + ' » ?\nLe membre ne pourra plus se connecter.')) return;

    var ok = false;
    if (window.MemberAccessManager && typeof window.MemberAccessManager.revokeMemberAccess === 'function') {
      ok = await window.MemberAccessManager.revokeMemberAccess(accessId);
    } else {
      // Fallback : mettre à jour directement via Firestore compat
      var db = getDb();
      if (db) {
        try {
          await db.collection('team_accesses').doc(accessId).update({ status: 'revoked' });
          ok = true;
          toast('Accès révoqué.');
        } catch (e) { toast('Erreur : ' + e.message); }
      }
    }

    if (ok) {
      await loadAccesses();
      renderAccesses();
      // Retirer de la liste membres actifs si présent
      State.members = State.members.filter(function (m) { return m.accessId !== accessId; });
      renderTeamMembers();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     ACTIVATION MEMBRE — délègue à MemberAccessManager
  ═══════════════════════════════════════════════════════════ */

  function switchToActivationFlow() {
    var loginForm      = document.getElementById('login-form');
    var activationForm = document.getElementById('activation-form');
    var registerForm   = document.getElementById('register-form');
    var tabs           = document.getElementById('auth-tabs') || document.querySelector('.a-tabs');

    if (loginForm)      loginForm.style.display      = 'none';
    if (registerForm)   registerForm.style.display   = 'none';
    if (activationForm) activationForm.style.display = 'block';
    if (tabs)           tabs.style.display           = 'none';

    setActivationError('');
    ['activation-access-id', 'activation-email',
     'activation-new-password', 'activation-confirm-password'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var first = document.getElementById('activation-access-id');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function backToLoginForm() {
    var loginForm      = document.getElementById('login-form');
    var activationForm = document.getElementById('activation-form');
    var registerForm   = document.getElementById('register-form');
    var tabs           = document.getElementById('auth-tabs') || document.querySelector('.a-tabs');

    if (loginForm)      loginForm.style.display      = 'block';
    if (activationForm) activationForm.style.display = 'none';
    if (registerForm)   registerForm.style.display   = 'none';
    if (tabs)           tabs.style.display           = 'flex';
    setActivationError('');
  }

  function setActivationError(msg) {
    var el = document.getElementById('activation-err');
    if (!el) return;
    el.textContent   = msg || '';
    el.style.display = msg ? 'block' : 'none';
  }

  async function activateMemberAccess() {
    var accessId  = ((document.getElementById('activation-access-id')?.value)         || '').trim();
    var email     = ((document.getElementById('activation-email')?.value)              || '').trim();
    var password  = ((document.getElementById('activation-new-password')?.value)       || '');
    var confirm   = ((document.getElementById('activation-confirm-password')?.value)   || '');
    var btn       = document.getElementById('activate-access-btn');

    setActivationError('');

    if (!window.MemberAccessManager) {
      setActivationError("Module d'accès non disponible. Rechargez la page.");
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Activation...'; }

    try {
      var result = await window.MemberAccessManager.activateMemberAccount(
        accessId, email, password, confirm
      );

      if (!result.success) {
        setActivationError(result.message || "Erreur d'activation.");
      } else {
        setActivationError('');
        toast('🎉 Compte activé !');

        var sessionOpened = false;

        // Option A : Railway a retourné un Firebase Custom Token
        if (result.customToken) {
          try {
            var auth = window._auth || firebase.auth();
            var cred = await auth.signInWithCustomToken(result.customToken);
            var idToken = await cred.user.getIdToken();
            window.token = idToken;
            localStorage.setItem('sc_token', idToken);

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
          ['activation-access-id','activation-email',
           'activation-new-password','activation-confirm-password'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
          });
          setTimeout(backToLoginForm, 1200);
        }
      }
    } catch (e) {
      setActivationError('Erreur inattendue : ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Activer mon compte →'; }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     ACTIVITÉ
  ═══════════════════════════════════════════════════════════ */

  function buildActivityFeed() {
    State.activityFeed = [];
    State.members.forEach(function (member) {
      (State.pipelines[member.firebaseUid] || []).forEach(function (p) {
        State.activityFeed.push({
          memberName: member.name    || 'Commercial',
          company:    p.company_name || 'Entreprise',
          status:     p.status       || 'prospection',
          date:       p.updated_at   || p.created_at || new Date().toISOString(),
          note:       p.note         || ''
        });
      });
    });
    State.activityFeed.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }

  function renderActivityFeed() {
    var container = document.getElementById('team-activity-view');
    setLoading('activity-loading', false);
    if (!container) return;

    if (!State.activityFeed.length) {
      renderEmpty('team-activity-view', '⚡', 'Aucune activité', "L'activité de votre équipe apparaît ici.");
      return;
    }

    var icons  = { prospection: '🎯', negociation: '🤝', conclue: '✅' };
    var labels = { prospection: 'Prospection', negociation: 'Négociation', conclue: 'Conclue' };

    container.innerHTML = State.activityFeed.slice(0, CONFIG.ACTIVITY_FEED_LIMIT).map(function (item) {
      var dateStr     = formatDate(item.date);
      var truncNote   = item.note.length > 80 ? item.note.slice(0, 80) + '...' : item.note;
      return '<div class="activity-item">'
        + '<div class="activity-dot-wrap"><div class="activity-dot ' + escapeHtml(item.status) + '"></div></div>'
        + '<div class="activity-body">'
        +   '<div class="activity-text"><strong>' + escapeHtml(item.memberName) + '</strong> — '
        +     (icons[item.status] || '') + ' <strong>' + escapeHtml(item.company) + '</strong>'
        +     ' en ' + (labels[item.status] || 'Prospection')
        +   '</div>'
        +   (item.note
          ? '<div style="font-size:11.5px;color:var(--tx3);margin-top:2px;font-style:italic">'
            + escapeHtml(truncNote) + '</div>'
          : '')
        +   '<div class="activity-meta">' + escapeHtml(dateStr) + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════════
     ASSIGNATION DESKTOP — source Firestore (membres actifs)
  ═══════════════════════════════════════════════════════════ */

  async function loadTeamMembersDesktop() {
    var sel = document.getElementById('assign-assignee-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Chargement...</option>';

    // Utiliser les membres déjà chargés (depuis Firestore, pas /api/team)
    var members = State.members;

    if (!members.length) {
      // Charger si pas encore fait
      members = await loadTeamMembersFromFirestore();
      State.members = members;
    }

    sel.innerHTML = members.length
      ? members.map(function (m) {
          return '<option value="' + escapeHtml(m.firebaseUid) + '">'
            + escapeHtml(m.name || m.email || m.firebaseUid) + '</option>';
        }).join('')
      : '<option value="">Aucun membre actif</option>';
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */

  function initialize() {
    // Patch showApp pour déclencher l'init manager
    var origShowApp = window.showApp;
    if (typeof origShowApp === 'function' && !window.__teamManagerPatched) {
      window.showApp = function () {
        origShowApp.apply(this, arguments);
        applyManagerRole();
        var u = getUser();
        if (u && u.role === 'manager') {
          setTimeout(function () {
            loadTeamData();
            loadAccesses();
          }, 600);
        }
      };
      window.__teamManagerPatched = true;
    }

    // Bind bouton activate
    var activateBtn = document.getElementById('activate-access-btn');
    if (activateBtn && !activateBtn.dataset.tmBound) {
      activateBtn.onclick = activateMemberAccess;
      activateBtn.dataset.tmBound = '1';
    }

    // Bind bouton enterprise-access → activation flow
    var enterpriseBtn = document.getElementById('enterprise-access-btn');
    if (enterpriseBtn && !enterpriseBtn.dataset.tmBound) {
      enterpriseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        switchToActivationFlow();
      });
      enterpriseBtn.dataset.tmBound = '1';
    }

    // Bind lien "Connexion normale" dans le formulaire d'activation
    var backLink = document.getElementById('back-to-login-link');
    if (backLink && !backLink.dataset.tmBound) {
      backLink.addEventListener('click', function (e) {
        e.preventDefault();
        backToLoginForm();
      });
      backLink.dataset.tmBound = '1';
    }

    if (window.user) applyManagerRole();
  }

  /* ═══════════════════════════════════════════════════════════
     EXPOSITION GLOBALE — SOURCE UNIQUE DE VÉRITÉ
  ═══════════════════════════════════════════════════════════ */

  window.TeamManager = {
    // Navigation
    switchToTeamTab:       switchToTeamTab,
    switchToSearchTab:     switchToSearchTab,
    switchTeamSeg:         switchTeamSeg,

    // Sheets
    openSheet:             openSheet,
    closeSheet:            closeSheet,

    // Équipe
    loadTeamData:          loadTeamData,
    renderTeamMembers:     renderTeamMembers,
    toggleMemberCard:      toggleMemberCard,
    loadTeamMembersDesktop:loadTeamMembersDesktop,

    // Accès
    loadAccesses:          loadAccesses,
    renderAccesses:        renderAccesses,
    openCreateAccessSheet: openCreateAccessSheet,
    updateAccessPreview:   updateAccessPreview,
    submitCreateAccess:    submitCreateAccess,
    copyAccessId:          copyAccessId,
    revokeAccess:          revokeAccess,

    // Activation
    switchToActivationFlow:switchToActivationFlow,
    backToLoginForm:       backToLoginForm,
    activateMemberAccess:  activateMemberAccess,

    // Activité
    buildActivityFeed:     buildActivityFeed,
    renderActivityFeed:    renderActivityFeed,

    // Rôle
    applyManagerRole:      applyManagerRole,

    // Refresh global
    refreshTeamData: async function () {
      await loadTeamData();
      await loadAccesses();
    }
  };

  // Exposer directement sur window pour les onclick inline du HTML
  window.switchTeamSeg          = switchTeamSeg;
  window.switchToActivationFlow = switchToActivationFlow;
  window.backToLoginForm        = backToLoginForm;
  window.activateMemberAccess   = activateMemberAccess;
  window.applyManagerRole       = applyManagerRole;
  window.refreshTeamData        = function () { return window.TeamManager.refreshTeamData(); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();