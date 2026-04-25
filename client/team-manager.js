/* ═══════════════════════════════════════════════════════════
   MANAGER TEAM MANAGEMENT — VERSION AVEC GÉNÉRATION D'ACCÈS
   Nouvelles fonctionnalités :
   1. Génération jusqu'à 10 accès membres par Manager
   2. Comptes liés automatiquement au Manager
   3. Activation par ID (format: Prénom/Nom@Entreprise)
   4. Changement obligatoire du mot de passe à la première connexion
   ═══════════════════════════════════════════════════════════ */

// Global variables for team manager (initialized early)
if (typeof window.selectedForAssignMobile === 'undefined') {
  window.selectedForAssignMobile = new Set();
}

var teamMembers = [];
var teamMembersPipeline = {};
var selectedAssigneeMobile = null;
var currentTeamSeg = 'members';
var activityFeed = [];
var generatedAccesses = []; // Stockage des accès générés

/* ═══════════════════════════════════════════════════════════
   HELPER FUNCTIONS FOR SHEETS/MODALS
   ═══════════════════════════════════════════════════════════ */

function openSheet(sheetId) {
  var sheet = document.getElementById(sheetId);
  if (sheet) sheet.classList.add('open');
}

function closeSheet(sheetId) {
  var sheet = typeof sheetId === 'string' ? document.getElementById(sheetId) : sheetId;
  if (sheet) sheet.classList.remove('open');
}

function openTab(tabName) {
  var form = document.getElementById(tabName + '-form');
  if (form) {
    document.querySelectorAll('[id$="-form"]').forEach(function(f) { f.style.display = 'none'; });
    form.style.display = 'block';
  }
}

/* ═══════════════════════════════════════════════════════════
   API WRAPPER FUNCTION
   ═══════════════════════════════════════════════════════════ */

async function api(method, endpoint, data, token) {
  if (typeof RAILWAY_SERVER === 'undefined') {
    console.error('RAILWAY_SERVER not defined');
    throw new Error('Server not configured');
  }
  
  var options = {
    method: method || 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  return fetch(RAILWAY_SERVER + endpoint, options);
}

function applyManagerRole() {
  var isManager = user && user.role === 'manager';
  var badge = document.getElementById('tb-manager-badge');
  if (badge) badge.classList.toggle('show', isManager);
  var navTeam = document.getElementById('nav-team');
  if (navTeam) navTeam.style.display = isManager ? '' : 'none';
  document.body.classList.toggle('is-manager', isManager);
  var mbtn = document.getElementById('manager-assign-btn-m');
  if (mbtn) mbtn.style.display = isManager ? 'block' : 'none';
  var wall = document.getElementById('team-wall');
  var teamContent = document.getElementById('team-manager-content');
  if (wall && teamContent) {
    wall.style.display = isManager ? 'none' : 'flex';
    teamContent.style.display = isManager ? 'flex' : 'none';
  }
}

function switchTeamSeg(seg, el) {
  currentTeamSeg = seg;
  document.querySelectorAll('.tseg').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('team-members-view').style.display = seg === 'members' ? '' : 'none';
  document.getElementById('team-activity-view').style.display = seg === 'activity' ? '' : 'none';
  document.getElementById('team-access-view').style.display = seg === 'access' ? '' : 'none';
  if (seg === 'activity') renderActivityFeed();
  if (seg === 'access') renderAccessManagement();
}

async function refreshTeamData() {
  if (!user || user.role !== 'manager') return;
  document.getElementById('team-loading').style.display = 'flex';
  document.getElementById('activity-loading').style.display = 'flex';
  await loadTeamData();
  await loadGeneratedAccesses();
}

async function loadTeamData() {
  if (!user || user.role !== 'manager') return;
  try {
    var r = await api('GET', '/api/team', null, token);
    if (!r.ok) throw new Error('Team load failed');
    var d = await r.json();
    teamMembers = d.data || [];
    var pipelinePromises = teamMembers.map(async function(member) {
      try {
        var pr = await api('GET', '/api/pipeline?assignee=' + encodeURIComponent(member.uid), null, token);
        if (pr.ok) { var pd = await pr.json(); teamMembersPipeline[member.uid] = pd.data || pd || []; }
        else { teamMembersPipeline[member.uid] = []; }
      } catch(e) { teamMembersPipeline[member.uid] = []; }
    });
    await Promise.all(pipelinePromises);
    renderTeamMembers();
    buildActivityFeed();
    if (currentTeamSeg === 'activity') renderActivityFeed();
    var pendingCount = teamMembers.reduce(function(acc, m) {
      var items = teamMembersPipeline[m.uid] || [];
      return acc + items.filter(function(p) { return p.status === 'prospection' || p.status === 'negociation'; }).length;
    }, 0);
    var tb = document.getElementById('team-badge');
    if (tb) { tb.textContent = pendingCount; tb.style.display = pendingCount ? '' : 'none'; }
  } catch(e) {
    document.getElementById('team-members-view').innerHTML = '<div class="team-empty"><div class="team-empty-icon">&#x1F4E1;</div><h3>Impossible de charger</h3><p>' + e.message + '</p></div>';
  }
}

/* ═══════════════════════════════════════════════════════════
   GESTION DES ACCÈS MEMBRES
   ═══════════════════════════════════════════════════════════ */

async function loadGeneratedAccesses() {
  if (!user || user.role !== 'manager') return;
  try {
    var r = await api('GET', '/api/team/accesses', null, token);
    if (r.ok) {
      var d = await r.json();
      generatedAccesses = d.data || [];
    }
  } catch(e) {
    generatedAccesses = [];
  }
}

function renderAccessManagement() {
  var container = document.getElementById('team-access-view');
  if (!container) return;
  
  var activeAccesses = generatedAccesses.filter(function(a) { return a.status === 'active' || a.status === 'pending'; });
  var canCreateMore = activeAccesses.length < 10;
  
  var html = '<div class="access-header">'
    + '<div class="access-quota">'
    + '<div class="access-quota-num">' + activeAccesses.length + '/10</div>'
    + '<div class="access-quota-label">Accès utilisés</div>'
    + '</div>'
    + '<button class="btn-primary" onclick="openCreateAccessSheet()" ' + (canCreateMore ? '' : 'disabled') + '>'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
    + 'Créer un accès'
    + '</button>'
    + '</div>';
  
  if (!generatedAccesses.length) {
    html += '<div class="team-empty">'
      + '<div class="team-empty-icon">&#x1F511;</div>'
      + '<h3>Aucun accès créé</h3>'
      + '<p>Générez des accès pour votre équipe commerciale (max 10)</p>'
      + '</div>';
  } else {
    html += '<div class="access-list">';
    generatedAccesses.forEach(function(access) {
      var statusIcons = { pending: '&#x23F3;', active: '&#x2705;', revoked: '&#x274C;' };
      var statusLabels = { pending: 'En attente', active: 'Actif', revoked: 'Révoqué' };
      var accessIdEsc = String(access.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      
      html += '<div class="access-card ' + access.status + '">'
        + '<div class="access-card-header">'
        + '<div class="access-card-id">' + access.access_id + '</div>'
        + '<div class="access-status-badge ' + access.status + '">'
        + statusIcons[access.status] + ' ' + statusLabels[access.status]
        + '</div>'
        + '</div>'
        + '<div class="access-card-info">'
        + '<div class="access-info-row"><strong>Nom:</strong> ' + access.member_name + '</div>'
        + '<div class="access-info-row"><strong>Créé le:</strong> ' + formatDate(access.created_at) + '</div>'
        + (access.activated_at ? '<div class="access-info-row"><strong>Activé le:</strong> ' + formatDate(access.activated_at) + '</div>' : '')
        + '</div>'
        + '<div class="access-card-actions">';
      
      if (access.status === 'pending') {
        html += '<button class="access-btn copy" onclick="copyAccessId(\'' + accessIdEsc + '\')">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
          + 'Copier l\'ID'
          + '</button>';
      }
      
      if (access.status !== 'revoked') {
        html += '<button class="access-btn revoke" onclick="revokeAccess(\'' + accessIdEsc + '\')">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
          + 'Révoquer'
          + '</button>';
      }
      
      html += '</div></div>';
    });
    html += '</div>';
  }
  
  container.innerHTML = html;
}

function openCreateAccessSheet() {
  var activeCount = generatedAccesses.filter(function(a) { 
    return a.status === 'active' || a.status === 'pending'; 
  }).length;
  
  if (activeCount >= 10) {
    toast('Limite atteinte : 10 accès maximum');
    return;
  }
  
  document.getElementById('new-access-firstname').value = '';
  document.getElementById('new-access-lastname').value = '';
  document.getElementById('new-access-preview').textContent = '@' + (user.company_name || 'Entreprise');
  
  openSheet('create-access-sheet');
}

function updateAccessPreview() {
  var firstname = document.getElementById('new-access-firstname').value.trim();
  var lastname = document.getElementById('new-access-lastname').value.trim();
  var company = user.company_name || 'Entreprise';
  
  var preview = '';
  if (firstname || lastname) {
    preview = (firstname || 'Prénom') + '/' + (lastname || 'Nom') + '@' + company;
  } else {
    preview = '@' + company;
  }
  
  document.getElementById('new-access-preview').textContent = preview;
}

async function submitCreateAccess() {
  var firstname = document.getElementById('new-access-firstname').value.trim();
  var lastname = document.getElementById('new-access-lastname').value.trim();
  
  if (!firstname || !lastname) {
    toast('Veuillez renseigner le prénom et le nom');
    return;
  }
  
  var company = user.company_name || 'Entreprise';
  var accessId = firstname + '/' + lastname + '@' + company;
  
  var btn = document.getElementById('create-access-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Création...';
  }
  
  try {
    var r = await api('POST', '/api/team/accesses', {
      member_name: firstname + ' ' + lastname,
      access_id: accessId,
      manager_uid: user.uid,
      company_name: company
    }, token);
    
    if (!r.ok) {
      var err = await r.json().catch(function() { return { message: 'Erreur de création' }; });
      throw new Error(err.message || 'Erreur de création');
    }
    
    var data = await r.json();
    toast('✅ Accès créé avec succès');
    
    closeSheet('create-access-sheet');
    await loadGeneratedAccesses();
    switchTeamSeg('access', document.querySelector('.tseg[onclick*="access"]'));
    
    // Afficher l'ID copié automatiquement
    setTimeout(function() {
      copyAccessId(accessId);
    }, 500);
    
  } catch(e) {
    toast('Erreur: ' + e.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Créer l\'accès';
    }
  }
}

async function copyAccessId(accessId) {
  try {
    await navigator.clipboard.writeText(accessId);
    toast('📋 ID copié : ' + accessId);
  } catch(e) {
    // Fallback pour les navigateurs sans clipboard API
    var input = document.createElement('input');
    input.value = accessId;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    toast('📋 ID copié');
  }
}

async function revokeAccess(accessId) {
  if (!confirm('Voulez-vous vraiment révoquer cet accès ?')) return;
  
  try {
    var r = await api('PUT', '/api/team/accesses/' + accessId, {
      status: 'revoked'
    }, token);
    
    if (!r.ok) throw new Error('Erreur de révocation');
    
    toast('✅ Accès révoqué');
    await loadGeneratedAccesses();
    renderAccessManagement();
    
  } catch(e) {
    toast('Erreur: ' + e.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   ACTIVATION D'ACCÈS MEMBRE (Première connexion)
   ═══════════════════════════════════════════════════════════ */

function showMemberActivationFlow() {
  // Afficher le formulaire d'activation au lieu de la connexion normale
  var loginForm = document.getElementById('login-form');
  var activationForm = document.getElementById('activation-form');
  
  if (loginForm) loginForm.style.display = 'none';
  if (activationForm) activationForm.style.display = 'block';
}

async function activateMemberAccess() {
  var accessId = document.getElementById('activation-access-id').value.trim();
  var newPassword = document.getElementById('activation-new-password').value;
  var confirmPassword = document.getElementById('activation-confirm-password').value;
  
  if (!accessId) {
    toast('Veuillez entrer votre ID d\'accès');
    return;
  }
  
  if (!newPassword || newPassword.length < 8) {
    toast('Le mot de passe doit contenir au moins 8 caractères');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    toast('Les mots de passe ne correspondent pas');
    return;
  }
  
  var btn = document.getElementById('activate-access-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Activation...';
  }
  
  try {
    var r = await api('POST', '/api/auth/activate-member', {
      access_id: accessId,
      new_password: newPassword
    }, null);
    
    if (!r.ok) {
      var err = await r.json().catch(function() { return { message: 'ID invalide ou déjà utilisé' }; });
      throw new Error(err.message);
    }
    
    var data = await r.json();
    
    // Connecter automatiquement le membre
    token = data.token;
    user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    toast('🎉 Compte activé avec succès !');
    
    setTimeout(function() {
      showApp();
    }, 1000);
    
  } catch(e) {
    toast('Erreur: ' + e.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Activer mon compte';
    }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch(e) {
    return dateStr;
  }
}

/* ═══════════════════════════════════════════════════════════
   FONCTIONS EXISTANTES (inchangées)
   ═══════════════════════════════════════════════════════════ */

function renderTeamMembers() {
  var container = document.getElementById('team-members-view');
  document.getElementById('team-loading').style.display = 'none';
  if (!teamMembers.length) {
    container.innerHTML = '<div class="team-empty"><div class="team-empty-icon">&#x1F465;</div><h3>Aucun commercial</h3><p>Créez des accès pour votre équipe dans l\'onglet "Accès".</p></div>';
    return;
  }
  container.innerHTML = '';
  teamMembers.forEach(function(member) {
    var pipeline = teamMembersPipeline[member.uid] || [];
    var cntP = pipeline.filter(function(p){ return p.status === 'prospection'; }).length;
    var cntN = pipeline.filter(function(p){ return p.status === 'negociation'; }).length;
    var cntC = pipeline.filter(function(p){ return p.status === 'conclue'; }).length;
    var initials = ((member.name || member.email || '?').split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2)).toUpperCase();
    var card = document.createElement('div');
    card.className = 'member-card';
    card.id = 'member-' + member.uid;
    var recentItems = pipeline.slice(0, 5);
    var pipelineHTML = recentItems.length ? recentItems.map(function(p) {
      return '<div class="mpip-item ' + (p.status||'prospection') + '">'
        + '<span class="mpip-item-name">' + (p.company_name || '&mdash;') + '</span>'
        + '<span class="mpip-item-status ' + (p.status||'prospection') + '">' + statusLabel(p.status) + '</span>'
        + '</div>';
    }).join('') : '<div style="font-size:12px;color:var(--text-tertiary);padding:4px 0">Aucun prospect assign&eacute;</div>';
    var uidEsc = member.uid.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var nameEsc = (member.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    card.innerHTML = '<div class="member-head" onclick="toggleMemberCard(\'' + uidEsc + '\')">'
      + '<div class="member-av">' + initials + '</div>'
      + '<div class="member-info">'
      + '<div class="member-name">' + (member.name || 'Sans nom') + '</div>'
      + '<div class="member-email">' + (member.email || '') + '</div>'
      + '</div>'
      + '<svg class="member-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>'
      + '</div>'
      + '<div class="member-kpi">'
      + '<div class="mkpi"><div class="mkpi-val">' + cntP + '</div><div class="mkpi-lbl">Prosp.</div></div>'
      + '<div class="mkpi"><div class="mkpi-val neg">' + cntN + '</div><div class="mkpi-lbl">N&eacute;go.</div></div>'
      + '<div class="mkpi"><div class="mkpi-val ok">' + cntC + '</div><div class="mkpi-lbl">Conclu</div></div>'
      + '</div>'
      + '<div class="member-pipeline">'
      + '<div class="mpip-title">Pipeline r&eacute;cent</div>'
      + pipelineHTML
      + '<div class="member-actions">'
      + '<button class="mact-btn assign" onclick="openAssignForMember(\'' + uidEsc + '\',\'' + nameEsc + '\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'
      + 'Assigner prospects'
      + '</button>'
      + '<button class="mact-btn view" onclick="viewMemberFullPipeline(\'' + uidEsc + '\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      + 'Voir tout'
      + '</button>'
      + '</div>'
      + '</div>';
    container.appendChild(card);
  });
}

function toggleMemberCard(uid) {
  var card = document.getElementById('member-' + uid);
  if (card) card.classList.toggle('expanded');
}

function statusLabel(status) {
  var labels = { prospection: 'Prospect', negociation: 'Négo', conclue: 'Conclu' };
  return labels[status] || status || 'Prospect';
}

function buildActivityFeed() {
  activityFeed = [];
  teamMembers.forEach(function(member) {
    var pipeline = teamMembersPipeline[member.uid] || [];
    pipeline.forEach(function(p) {
      activityFeed.push({
        memberName: member.name || member.email || 'Commercial',
        memberUid: member.uid,
        company: p.company_name || 'Entreprise',
        status: p.status || 'prospection',
        date: p.updated_at || p.created_at || new Date().toISOString(),
        note: p.note || ''
      });
    });
  });
  activityFeed.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
}

function renderActivityFeed() {
  var container = document.getElementById('team-activity-view');
  document.getElementById('activity-loading').style.display = 'none';
  container.innerHTML = '';
  if (!activityFeed.length) {
    container.innerHTML = '<div class="team-empty"><div class="team-empty-icon">&#x26A1;</div><h3>Aucune activité</h3><p>L\'activité de votre équipe apparaît ici en temps réel.</p></div>';
    return;
  }
  activityFeed.slice(0, 30).forEach(function(item) {
    var icons = { prospection: '&#x1F3AF;', negociation: '&#x1F91D;', conclue: '&#x2705;' };
    var dateStr = '';
    try { dateStr = new Date(item.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }); } catch(e) {}
    var el = document.createElement('div');
    el.className = 'activity-item';
    el.innerHTML = '<div class="activity-dot-wrap"><div class="activity-dot ' + item.status + '"></div></div>'
      + '<div class="activity-body">'
      + '<div class="activity-text"><strong>' + item.memberName + '</strong> &mdash; ' + (icons[item.status]||'') + ' <strong>' + item.company + '</strong> en ' + statusLabel(item.status) + '</div>'
      + (item.note ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;font-style:italic">' + item.note.slice(0,80) + (item.note.length > 80 ? '...' : '') + '</div>' : '')
      + '<div class="activity-meta">' + dateStr + '</div>'
      + '</div>';
    container.appendChild(el);
  });
}

function openAssignForMember(uid, name) {
  selectedAssigneeMobile = uid;
  if (selectedForAssignMobile.size === 0) {
    toast('Sélectionnez d\'abord des entreprises dans la recherche');
    switchTab2('search');
    return;
  }
  openManagerAssignSheet();
  setTimeout(function() { selectAssignMember(uid); }, 400);
}

function viewMemberFullPipeline(uid) {
  var member = teamMembers.find(function(m){ return m.uid === uid; });
  if (!member) return;
  var pipeline = teamMembersPipeline[uid] || [];
  var infoSheet = document.getElementById('assignments-sheet');
  var title = infoSheet ? infoSheet.querySelector('.sheet-title') : null;
  if (title) title.textContent = 'Pipeline de ' + (member.name || member.email);
  var list = document.getElementById('assignments-list');
  if (!list) return;
  if (!pipeline.length) {
    list.innerHTML = '<div class="pip-empty"><div class="ei">&#x1F4CB;</div><p>Aucun prospect assigné</p></div>';
  } else {
    list.innerHTML = pipeline.map(function(p) {
      return '<div class="pcard ' + (p.status||'prospection') + '">'
        + '<div class="pcard-name">' + (p.company_name||'&mdash;') + '</div>'
        + '<div class="pcard-meta">' + (p.company_sector ? '<span>&#x1F4C2; ' + p.company_sector + '</span>' : '') + (p.company_city ? '<span>&#x1F4CD; ' + p.company_city + '</span>' : '') + '</div>'
        + (p.note ? '<div class="pcard-note">' + p.note + '</div>' : '')
        + '<div class="pcard-actions"><span class="mpip-item-status ' + (p.status||'prospection') + '" style="padding:4px 12px">' + statusLabel(p.status) + '</span></div>'
        + '</div>';
    }).join('');
  }
  openSheet('assignments-sheet');
}

function toggleSelectForAssignMobile(i) {
  var co = lastResults[i]; if (!co) return;
  var key = co.id || co.niu || String(i);
  var card = document.querySelector('[data-card-index="' + i + '"]');
  if (selectedForAssignMobile.has(key)) {
    selectedForAssignMobile.delete(key);
    if (card) card.classList.remove('manager-selected');
  } else {
    selectedForAssignMobile.add(key);
    if (card) card.classList.add('manager-selected');
  }
  updateManagerSelectBar();
}

function updateManagerSelectBar() {
  var bar = document.getElementById('manager-select-bar');
  var count = document.getElementById('msb-count');
  if (!bar) return;
  var n = selectedForAssignMobile.size;
  bar.classList.toggle('show', n > 0 && user && user.role === 'manager');
  if (count) count.textContent = n;
}

function clearManagerSelection() {
  selectedForAssignMobile.clear();
  document.querySelectorAll('.co-card.manager-selected').forEach(function(c){ c.classList.remove('manager-selected'); });
  updateManagerSelectBar();
}

function openManagerAssignSheet() {
  if (!selectedForAssignMobile.size) { toast('Aucune entreprise sélectionnée'); return; }
  var companiesList = document.getElementById('assign-companies-list');
  var countBadge = document.getElementById('assign-count-badge');
  if (countBadge) countBadge.textContent = selectedForAssignMobile.size;
  if (companiesList) {
    var selectedKeys = Array.from(selectedForAssignMobile);
    var selectedCompanies = lastResults.filter(function(co, i) {
      var key = co.id || co.niu || String(i);
      return selectedKeys.includes(key);
    });
    companiesList.innerHTML = selectedCompanies.length ? selectedCompanies.map(function(co) {
      var name = co.raison_sociale || co.company_name || co.nom || co.name || '&mdash;';
      var initials = name.split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase();
      var sector = co.secteur || co.activite_principale || '';
      return '<div class="assign-co-chip">'
        + '<div class="assign-co-chip-av">' + initials + '</div>'
        + '<div class="assign-co-chip-name">' + name + '</div>'
        + (sector ? '<div class="assign-co-chip-sector">' + sector.split(' ')[0] + '</div>' : '')
        + '</div>';
    }).join('') : '<div style="color:var(--text-tertiary);font-size:13px;padding:8px 0">Aucune entreprise</div>';
  }
  selectedAssigneeMobile = null;
  document.getElementById('assign-note-m').value = '';
  populateAssignTeamList();
  var btn = document.getElementById('assign-submit-btn');
  if (btn) btn.disabled = true;
  openSheet('assign-create-sheet');
}

async function populateAssignTeamList() {
  var list = document.getElementById('assign-team-list');
  list.innerHTML = '<div class="loading-state" style="padding:20px 0"><div class="spinner"></div></div>';
  var members = teamMembers;
  if (!members.length) {
    try {
      var r = await api('GET', '/api/team', null, token);
      if (r.ok) { var d = await r.json(); members = d.data || []; teamMembers = members; }
    } catch(e) {}
  }
  if (!members.length) {
    list.innerHTML = '<div style="padding:12px;color:var(--text-tertiary);font-size:13px;text-align:center">Aucun commercial dans votre équipe</div>';
    return;
  }
  list.innerHTML = members.map(function(m) {
    var initials = ((m.name || m.email || '?').split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2)).toUpperCase();
    var pipeline = teamMembersPipeline[m.uid] || [];
    var activePip = pipeline.filter(function(p){ return p.status !== 'conclue'; }).length;
    var mUidEsc = m.uid.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return '<div class="assign-member-row" id="amrow-' + m.uid + '" onclick="selectAssignMember(\'' + mUidEsc + '\')">'
      + '<div class="assign-member-av">' + initials + '</div>'
      + '<div class="assign-member-info">'
      + '<div class="assign-member-name">' + (m.name || 'Sans nom') + '</div>'
      + '<div class="assign-member-sub">' + (m.email || '') + (activePip ? ' &bull; ' + activePip + ' en cours' : '') + '</div>'
      + '</div>'
      + '<div class="assign-member-check"><svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>'
      + '</div>';
  }).join('');
}

function selectAssignMember(uid) {
  document.querySelectorAll('.assign-member-row').forEach(function(r){ r.classList.remove('selected'); });
  var row = document.getElementById('amrow-' + uid);
  if (row) row.classList.add('selected');
  selectedAssigneeMobile = uid;
  var btn = document.getElementById('assign-submit-btn');
  if (btn) btn.disabled = false;
}

async function submitAssignmentNew() {
  if (!selectedAssigneeMobile) { toast('Choisissez un commercial'); return; }
  if (!selectedForAssignMobile.size) { toast('Aucune entreprise sélectionnée'); return; }
  var btn = document.getElementById('assign-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Création...'; }
  var note = document.getElementById('assign-note-m').value.trim();
  var selectedKeys = Array.from(selectedForAssignMobile);
  var selectedCompanies = lastResults.filter(function(co, i) {
    var key = co.id || co.niu || String(i);
    return selectedKeys.includes(key);
  });
  var member = teamMembers.find(function(m){ return m.uid === selectedAssigneeMobile; });
  var memberName = member ? (member.name || member.email) : '';
  try {
    var r = await api('POST', '/api/assignments', {
      assigneeId: selectedAssigneeMobile,
      prospectIds: selectedKeys,
      note: note,
      companies: selectedCompanies.map(function(co) {
        return {
          company_name: co.raison_sociale || co.company_name || co.nom || co.name || '',
          company_sector: co.secteur || co.activite_principale || '',
          company_city: co.ville || co.region || '',
          company_phone: co.telephone || co.tel || '',
          company_email: co.email || co.contact_email || '',
          company_id: co.id || co.siren || co.niu || null,
          status: 'prospection',
          note: note,
          company_assigned_to: memberName
        };
      })
    }, token);
    var d = await r.json().catch(function(){ return {}; });
    if (!r.ok) { await assignViaPipeline(selectedCompanies, memberName, note); }
    else { handleAssignSuccess(memberName, selectedCompanies.length); }
  } catch(e) {
    try { await assignViaPipeline(selectedCompanies, memberName, note); }
    catch(e2) {
      toast('Erreur: ' + e2.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Créer l\'assignation';
      }
    }
  }
}

async function assignViaPipeline(companies, memberName, note) {
  await Promise.all(companies.map(function(co) {
    return api('POST', '/api/pipeline', {
      company_name: co.raison_sociale || co.company_name || co.nom || co.name || '',
      company_sector: co.secteur || co.activite_principale || '',
      company_city: co.ville || co.region || '',
      company_phone: co.telephone || co.tel || '',
      company_email: co.email || co.contact_email || '',
      company_id: co.id || co.siren || co.niu || null,
      status: 'prospection',
      note: note,
      company_assigned_to: memberName,
      assigned_to_uid: selectedAssigneeMobile
    }, token);
  }));
  handleAssignSuccess(memberName, companies.length);
}

function handleAssignSuccess(memberName, count) {
  toast('✅ ' + count + ' prospect(s) assigné(s) à ' + memberName);
  closeSheet('assign-create-sheet');
  clearManagerSelection();
  setTimeout(loadTeamData, 500);
  setTimeout(function() { switchTab2('team'); }, 800);
}

async function submitAssignmentMobile() { await submitAssignmentNew(); }
function openManagerAssignMobile() { openManagerAssignSheet(); }

function openAssignmentsSheet() {
  var infoSheet = document.getElementById('assignments-sheet');
  var title = infoSheet ? infoSheet.querySelector('.sheet-title') : null;
  if (title) title.textContent = 'Mes tâches assignées';
  var list = document.getElementById('assignments-list');
  if (list) list.innerHTML = '<div class="loading-state"><div class="spinner"></div><div>Chargement des tâches...</div></div>';
  openSheet('assignments-sheet');
  refreshAssignments();
}

async function refreshAssignments() {
  try {
    var r = await api('GET', '/api/assignments', null, token);
    if (!r.ok) {
      document.getElementById('assignments-list').innerHTML = '<div class="pip-empty"><div class="ei">&#x274C;</div><p>Erreur de chargement</p></div>';
      return;
    }
    var data = await r.json();
    var list = data.data || [];
    if (!list.length) {
      var r2 = await api('GET', '/api/pipeline', null, token);
      if (r2.ok) {
        var pd = await r2.json();
        var assigned = (pd.data || pd || []).filter(function(p) {
          return p.assigned_to_uid === (user && user.uid) || p.company_assigned_to === (user && user.name);
        });
        if (assigned.length) { renderMyTasks(assigned); return; }
      }
      document.getElementById('assignments-list').innerHTML = '<div class="pip-empty"><div class="ei">&#x1F4CB;</div><p>Aucune tâche assignée</p></div>';
      return;
    }
    renderMyTasks(list);
  } catch(e) {
    document.getElementById('assignments-list').innerHTML = '<div class="pip-empty"><div class="ei">&#x1F4E1;</div><p>Connexion impossible</p></div>';
  }
}

async function markAssignmentDone(id) {
  try {
    var r = await api('PUT', '/api/assignments/' + id, { status: 'done' }, token);
    if (!r.ok) return toast('Erreur');
    toast('Tâche marquée comme faite');
    await refreshAssignments();
  } catch(e) { toast('Erreur: ' + e.message); }
}

function renderMyTasks(list) {
  var container = document.getElementById('assignments-list');
  container.innerHTML = list.map(function(a) {
    var name = a.company_name || a.company_id || '&mdash;';
    var status = a.status || 'prospection';
    var note = a.note ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;padding:6px 8px;background:var(--bg-secondary);border-radius:6px;line-height:1.4">' + a.note + '</div>' : '';
    var aIdEsc = String(a.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return '<div class="pcard ' + status + '">'
      + '<div class="pcard-name">' + name + '</div>'
      + '<div class="pcard-meta">'
      + (a.company_sector ? '<span>&#x1F4C2; ' + a.company_sector + '</span>' : '')
      + (a.company_city ? '<span>&#x1F4CD; ' + a.company_city + '</span>' : '')
      + '</div>'
      + note
      + '<div class="pcard-actions">'
      + '<span class="mpip-item-status ' + status + '" style="padding:5px 12px;font-size:11px;border-radius:var(--r-full);font-weight:700">' + statusLabel(status) + '</span>'
      + (status === 'prospection' ? '<button class="pact neg" onclick="updateTaskStatus(\'' + aIdEsc + '\',\'negociation\')">&rarr; Négociation</button>' : '')
      + (status === 'negociation' ? '<button class="pact ok" onclick="updateTaskStatus(\'' + aIdEsc + '\',\'conclue\')">&#x2713; Conclure</button>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}

async function updateTaskStatus(id, newStatus) {
  try {
    var r = await api('PUT', '/api/pipeline/' + id, { status: newStatus }, token);
    if (!r.ok) { toast('Erreur mise à jour'); return; }
    toast(newStatus === 'conclue' ? '🎉 Vente conclue !' : '→ Passé en négociation');
    await refreshAssignments();
    if (user && user.role === 'manager') setTimeout(loadTeamData, 1000);
  } catch(e) { toast('Erreur: ' + e.message); }
}

document.addEventListener('DOMContentLoaded', function() {

  var _baseShowApp = window.showApp;
  window.showApp = function() {
    _baseShowApp();
    applyManagerRole();
    if (user && user.role === 'manager') setTimeout(loadTeamData, 1000);
  };

  var _baseRenderResults = window.renderResults;
  window.renderResults = function(data) {
    _baseRenderResults(data);
    if (user && user.role === 'manager') {
      var cards = document.querySelectorAll('#results-area .co-card');
      cards.forEach(function(card, i) {
        card.setAttribute('data-card-index', i);
        var overlay = document.createElement('button');
        overlay.className = 'select-overlay-btn';
        overlay.title = 'Sélectionner';
        overlay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        overlay.onclick = (function(idx) {
          return function(e) { e.stopPropagation(); toggleSelectForAssignMobile(idx); };
        })(i);
        var co = lastResults[i];
        if (co) {
          var key = co.id || co.niu || String(i);
          if (selectedForAssignMobile.has(key)) card.classList.add('manager-selected');
        }
        card.appendChild(overlay);
      });
      updateManagerSelectBar();
    }
  };

  var _baseSwitchTab2 = window.switchTab2;
  window.switchTab2 = function(name) {
    _baseSwitchTab2(name);
    if (name === 'team' && user && user.role === 'manager') {
      if (!teamMembers.length) loadTeamData();
    }
  };

});
