/* ═══════════════════════════════════════════════════════════
   MANAGER TEAM MANAGEMENT — VERSION COMPLÈTE FINALE
   - Champ Entreprise dans la création d'accès
   - Format ID : PrenomNom@Entreprise
   - Refresh quasi temps réel côté manager
   - Un seul bouton "Créer accès" conservé (header)
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURATION & CONSTANTES
     ═══════════════════════════════════════════════════════════ */

  const CONFIG = {
    MAX_ACTIVE_ACCESSES: 10,
    BATCH_SIZE: 5,
    DEBOUNCE_DELAY: 150,
    ACTIVITY_FEED_LIMIT: 30,
    PIPELINE_PREVIEW_LIMIT: 5,
    REALTIME_REFRESH_INTERVAL: 10000
  };

  /* ═══════════════════════════════════════════════════════════
     STATE MANAGEMENT
     ═══════════════════════════════════════════════════════════ */

  const TeamState = {
    members: [],
    pipelines: {},
    accesses: [],
    activityFeed: [],
    currentSeg: 'members',
    selectedAssigneeMobile: null,
    isTeamTabActive: false,
    loadingPromise: null,
    realtimeInterval: null,

    update(key, value) {
      this[key] = value;
      this.persist(key);
    },

    persist(key) {
      try {
        if (key === 'accesses' && window.user) {
          localStorage.setItem(
            `team_accesses_${window.user.uid}`,
            JSON.stringify(this.accesses)
          );
        }
      } catch (e) {
        console.error('[State] Persist error:', e);
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     UTILITIES & HELPERS
     ═══════════════════════════════════════════════════════════ */

  const Utils = {
    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    sanitizeInput(str) {
      return (str || '').trim().replace(/[<>]/g, '');
    },

    normalizeAccessPart(str) {
      return (str || '')
        .trim()
        .replace(/[<>]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9\u00C0-\u017F_-]/g, '');
    },

    formatDate(dateStr) {
      if (!dateStr) return '—';
      try {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        console.error('[Utils] Date format error:', e);
        return '—';
      }
    },

    getInitials(name, email) {
      const text = name || email || '?';
      return text
        .split(/\s+/)
        .slice(0, 2)
        .map(w => (w[0] || '').toUpperCase())
        .join('') || 'U';
    },

    debounce(func, delay) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    },

    async copyToClipboard(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }

        const input = document.createElement('input');
        input.value = text;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const success = document.execCommand('copy');
        document.body.removeChild(input);
        return success;
      } catch (e) {
        console.error('[Utils] Clipboard error:', e);
        return false;
      }
    },

    validateAccessId(accessId) {
      const pattern = /^[a-zA-Z\u00C0-\u017F]+[a-zA-Z\u00C0-\u017F-]*@[a-zA-Z0-9\u00C0-\u017F_-]+$/;
      return pattern.test(accessId);
    },

    validatePassword(password) {
      return password && password.length >= 8;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     API SERVICE
     ═══════════════════════════════════════════════════════════ */

  const API = {
    async request(method, endpoint, data = null) {
      const RAILWAY_SERVER = window.RAILWAY_SERVER || '';
      if (!RAILWAY_SERVER) {
        throw new Error('Server not configured');
      }

      const token = window.token;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        options.headers.Authorization = `Bearer ${token}`;
      }

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      try {
        const response = await fetch(`${RAILWAY_SERVER}${endpoint}`, options);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return response;
      } catch (error) {
        console.error(`[API] ${method} ${endpoint}:`, error);
        throw error;
      }
    },

    async loadTeamMembers() {
      const response = await this.request('GET', '/api/team');
      const data = await response.json();
      return data.data || [];
    },

    async loadMemberPipeline(memberUid) {
      try {
        const response = await this.request(
          'GET',
          `/api/pipeline?assignee=${encodeURIComponent(memberUid)}`
        );
        const data = await response.json();
        return data.data || [];
      } catch (e) {
        console.warn(`[API] Pipeline error for ${memberUid}:`, e);
        return [];
      }
    },

    async loadAccesses() {
      try {
        const response = await this.request('GET', '/api/team/accesses');
        const data = await response.json();
        return data.data || [];
      } catch (e) {
        console.warn('[API] Accesses load error, using fallback:', e);
        return this.getAccessesFromStorage();
      }
    },

    async createAccess(accessData) {
      try {
        const response = await this.request('POST', '/api/team/accesses', accessData);
        const data = await response.json();
        return data.access || accessData;
      } catch (e) {
        console.warn('[API] Create access error, saving locally:', e);
        return accessData;
      }
    },

    async revokeAccess(accessId) {
      try {
        await this.request(
          'PUT',
          `/api/team/accesses/${encodeURIComponent(accessId)}`,
          { status: 'revoked' }
        );
        return true;
      } catch (e) {
        console.warn('[API] Revoke access error:', e);
        return false;
      }
    },

    async activateMemberAccess(accessId, password) {
      const response = await this.request('POST', '/api/auth/activate-member', {
        access_id: accessId,
        new_password: password
      });
      return response.json();
    },

    getAccessesFromStorage() {
      const user = window.user;
      if (!user) return [];

      try {
        const stored = localStorage.getItem(`team_accesses_${user.uid}`);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error('[API] Storage read error:', e);
        return [];
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     UI CONTROLLER
     ═══════════════════════════════════════════════════════════ */

  const UI = {
    toast(message) {
      if (typeof window.toast === 'function') {
        window.toast(message);
      } else {
        console.log('[TOAST]', message);
        alert(message);
      }
    },

    openSheet(sheetId) {
      const sheet = document.getElementById(sheetId);
      if (sheet) {
        sheet.classList.add('open');
        const firstInput = sheet.querySelector('input, textarea, button, select');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 150);
        }
      }
    },

    closeSheet(sheetId) {
      const sheet = typeof sheetId === 'string'
        ? document.getElementById(sheetId)
        : sheetId;
      if (sheet) {
        sheet.classList.remove('open');
      }
    },

    setLoading(elementId, isLoading) {
      const el = document.getElementById(elementId);
      if (el) {
        el.style.display = isLoading ? 'flex' : 'none';
      }
    },

    setButtonState(buttonId, state) {
      const btn = document.getElementById(buttonId);
      if (!btn) return;

      switch (state) {
        case 'loading':
          btn.disabled = true;
          btn.dataset.originalText = btn.textContent;
          btn.textContent = btn.dataset.loadingText || 'Chargement...';
          break;
        case 'default':
          btn.disabled = false;
          btn.textContent = btn.dataset.originalText || btn.textContent;
          break;
        case 'disabled':
          btn.disabled = true;
          break;
        default:
          btn.disabled = false;
      }
    },

    empty(containerId, emptyConfig) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const { icon = '📭', title = 'Aucune donnée', message = '' } = emptyConfig;

      container.innerHTML = `
        <div class="team-empty">
          <div class="team-empty-icon">${Utils.escapeHtml(icon)}</div>
          <h3>${Utils.escapeHtml(title)}</h3>
          <p>${Utils.escapeHtml(message)}</p>
        </div>
      `;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ROLE MANAGEMENT
     ═══════════════════════════════════════════════════════════ */

  function applyManagerRole() {
    const user = window.user;
    const isManager = user && user.role === 'manager';

    const tbTeamBtn = document.getElementById('tb-team-btn');
    if (tbTeamBtn) {
      tbTeamBtn.style.display = isManager ? 'block' : 'none';
    }

    const managerBtn = document.getElementById('manager-assign-btn');
    if (managerBtn) {
      managerBtn.style.display = isManager ? 'inline-flex' : 'none';
    }

    const avatar = document.getElementById('tb-avatar');
    if (avatar && user) {
      avatar.textContent = Utils.getInitials(user.name, user.email);
    }
  }

  function updateTeamHeaderActions(seg) {
    const createBtnHeader = document.getElementById('create-access-btn-header');
    if (createBtnHeader) {
      createBtnHeader.style.display = seg === 'access' ? 'inline-flex' : 'none';
    }
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════ */

  function switchToTeamTab() {
    if (!TeamState.isTeamTabActive) {
      const panelCenter = document.querySelector('.panel-center');
      const panelRight = document.querySelector('.panel-right');
      const teamContent = document.getElementById('team-manager-content');

      if (panelCenter) panelCenter.style.display = 'none';
      if (panelRight) panelRight.style.display = 'none';

      if (teamContent) {
        teamContent.style.display = 'flex';
        teamContent.style.flex = '1';
      }

      const tbTeamBtn = document.getElementById('tb-team-btn');
      if (tbTeamBtn) {
        tbTeamBtn.style.background = 'rgba(255,255,255,0.25)';
        tbTeamBtn.style.borderRadius = '8px';
        tbTeamBtn.style.fontWeight = '700';
      }

      TeamState.isTeamTabActive = true;
      startRealtimeRefresh();

      if (!TeamState.members.length) {
        TeamManager.loadTeamData();
      }
      if (!TeamState.accesses.length) {
        AccessManager.loadAccesses();
      }

      const segButtons = Array.from(document.querySelectorAll('.tseg'));
      const currentSeg = TeamState.currentSeg || 'members';
      const segMap = {
        members: segButtons[0],
        activity: segButtons[1],
        access: segButtons[2]
      };

      switchTeamSeg(currentSeg, segMap[currentSeg] || segButtons[0]);
    } else {
      switchToSearchTab();
    }
  }

  function switchToSearchTab() {
    const panelCenter = document.querySelector('.panel-center');
    const panelRight = document.querySelector('.panel-right');
    const teamContent = document.getElementById('team-manager-content');

    if (panelCenter) panelCenter.style.display = '';
    if (panelRight) panelRight.style.display = '';
    if (teamContent) teamContent.style.display = 'none';

    const tbTeamBtn = document.getElementById('tb-team-btn');
    if (tbTeamBtn) {
      tbTeamBtn.style.background = 'transparent';
      tbTeamBtn.style.fontWeight = '500';
    }

    stopRealtimeRefresh();
    TeamState.isTeamTabActive = false;
  }

  function switchTeamSeg(seg, el) {
    TeamState.currentSeg = seg;
    updateTeamHeaderActions(seg);

    document.querySelectorAll('.tseg').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });

    if (el) {
      el.classList.add('active');
      el.setAttribute('aria-selected', 'true');
    }

    const views = {
      members: document.getElementById('team-members-view'),
      activity: document.getElementById('team-activity-view'),
      access: document.getElementById('team-access-view')
    };

    Object.keys(views).forEach(key => {
      if (views[key]) {
        views[key].style.display = key === seg ? 'block' : 'none';
        views[key].setAttribute('aria-hidden', key !== seg);
      }
    });

    UI.setLoading('team-loading', false);
    UI.setLoading('activity-loading', false);

    switch (seg) {
      case 'activity':
        ActivityManager.render();
        break;
      case 'access':
        AccessManager.render();
        break;
      case 'members':
      default:
        TeamManager.render();
        break;
    }
  }

  function startRealtimeRefresh() {
    stopRealtimeRefresh();

    TeamState.realtimeInterval = setInterval(async () => {
      try {
        const user = window.user;
        if (!user || user.role !== 'manager' || !TeamState.isTeamTabActive) {
          return;
        }

        const members = await API.loadTeamMembers();
        TeamState.update('members', members);

        await TeamManager.loadPipelinesInBatches(members);
        ActivityManager.buildFeed();

        if (TeamState.currentSeg === 'members') {
          TeamManager.render();
        } else if (TeamState.currentSeg === 'activity') {
          ActivityManager.render();
        }

        await AccessManager.loadAccesses();
      } catch (e) {
        console.warn('[Realtime] Refresh error:', e);
      }
    }, CONFIG.REALTIME_REFRESH_INTERVAL);
  }

  function stopRealtimeRefresh() {
    if (TeamState.realtimeInterval) {
      clearInterval(TeamState.realtimeInterval);
      TeamState.realtimeInterval = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TEAM MANAGER
     ═══════════════════════════════════════════════════════════ */

  const TeamManager = {
    async loadTeamData() {
      const user = window.user;
      const token = window.token;

      if (!user || user.role !== 'manager' || !token) {
        console.warn('[TeamManager] Invalid user or role');
        return;
      }

      if (TeamState.loadingPromise) {
        return TeamState.loadingPromise;
      }

      UI.setLoading('team-loading', true);

      TeamState.loadingPromise = (async () => {
        try {
          const members = await API.loadTeamMembers();
          TeamState.update('members', members);

          await this.loadPipelinesInBatches(members);
          ActivityManager.buildFeed();

          if (TeamState.currentSeg === 'members') {
            this.render();
          }
          if (TeamState.currentSeg === 'activity') {
            ActivityManager.render();
          }
        } catch (error) {
          console.error('[TeamManager] Load error:', error);
          UI.empty('team-members-view', {
            icon: '📡',
            title: 'Erreur de chargement',
            message: error.message || 'Impossible de charger les données'
          });
          UI.toast('Erreur de chargement de l\'équipe');
        } finally {
          UI.setLoading('team-loading', false);
          TeamState.loadingPromise = null;
        }
      })();

      return TeamState.loadingPromise;
    },

    async loadPipelinesInBatches(members) {
      const batchSize = CONFIG.BATCH_SIZE;

      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async member => {
            const pipeline = await API.loadMemberPipeline(member.uid);
            TeamState.pipelines[member.uid] = pipeline;
          })
        );
      }
    },

    render() {
      const container = document.getElementById('team-members-view');
      UI.setLoading('team-loading', false);

      if (!container) return;

      if (!TeamState.members.length) {
        UI.empty('team-members-view', {
          icon: '👥',
          title: 'Aucun commercial',
          message: 'Créez des accès depuis l\'onglet Accès, puis vos commerciaux s\'activeront eux-mêmes.'
        });
        return;
      }

      container.innerHTML = '';

      TeamState.members.forEach(member => {
        const card = this.createMemberCard(member);
        container.appendChild(card);
      });
    },

    createMemberCard(member) {
      const pipeline = TeamState.pipelines[member.uid] || [];
      const stats = this.calculateStats(pipeline);
      const initials = Utils.getInitials(member.name, member.email);
      const recentItems = pipeline.slice(0, CONFIG.PIPELINE_PREVIEW_LIMIT);

      const safeUid = Utils.escapeHtml(member.uid || '');
      const safeName = Utils.escapeHtml(member.name || 'Sans nom');
      const safeEmail = Utils.escapeHtml(member.email || '');

      const card = document.createElement('div');
      card.className = 'member-card';
      card.id = `member-${member.uid}`;
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `Carte de ${member.name || member.email}`);

      const pipelineHTML = recentItems.length
        ? recentItems.map(p => this.createPipelineItem(p)).join('')
        : '<div style="font-size:12px;color:#757575;padding:4px 0">Aucun prospect assigné</div>';

      card.innerHTML = `
        <div class="member-head"
             role="button"
             tabindex="0"
             aria-expanded="false"
             aria-controls="member-${safeUid}-details">
          <div class="member-av" aria-hidden="true">${Utils.escapeHtml(initials)}</div>
          <div class="member-info">
            <div class="member-name">${safeName}</div>
            <div class="member-email">${safeEmail}</div>
          </div>
          <svg class="member-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div id="member-${safeUid}-details" class="member-details">
          <div class="member-kpi">
            <div class="mkpi">
              <div class="mkpi-val">${stats.prospection}</div>
              <div class="mkpi-lbl">Prosp.</div>
            </div>
            <div class="mkpi">
              <div class="mkpi-val neg">${stats.negociation}</div>
              <div class="mkpi-lbl">Négo.</div>
            </div>
            <div class="mkpi">
              <div class="mkpi-val ok">${stats.conclue}</div>
              <div class="mkpi-lbl">Conclu</div>
            </div>
          </div>
          <div class="member-pipeline">
            <div class="mpip-title">Pipeline récent</div>
            ${pipelineHTML}
          </div>
        </div>
      `;

      const header = card.querySelector('.member-head');
      const toggleCard = () => this.toggleCard(member.uid);

      if (header) {
        header.addEventListener('click', toggleCard);
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCard();
          }
        });
      }

      return card;
    },

    createPipelineItem(prospect) {
      const statusLabels = {
        prospection: 'Prospect',
        negociation: 'Négo',
        conclue: 'Conclu'
      };

      return `
        <div class="mpip-item">
          <span class="mpip-item-name">${Utils.escapeHtml(prospect.company_name || '—')}</span>
          <span class="mpip-item-status ${prospect.status || 'prospection'}">
            ${statusLabels[prospect.status] || 'Prospect'}
          </span>
        </div>
      `;
    },

    calculateStats(pipeline) {
      return {
        prospection: pipeline.filter(p => p.status === 'prospection').length,
        negociation: pipeline.filter(p => p.status === 'negociation').length,
        conclue: pipeline.filter(p => p.status === 'conclue').length
      };
    },

    toggleCard(uid) {
      const card = document.getElementById(`member-${uid}`);
      if (!card) return;

      const isExpanded = card.classList.toggle('expanded');
      const header = card.querySelector('.member-head');

      if (header) {
        header.setAttribute('aria-expanded', String(isExpanded));
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ACCESS MANAGER
     ═══════════════════════════════════════════════════════════ */

  const AccessManager = {
    async loadAccesses() {
      const user = window.user;
      if (!user || user.role !== 'manager') return;

      try {
        const accesses = await API.loadAccesses();
        TeamState.update('accesses', accesses);

        if (TeamState.currentSeg === 'access') {
          this.render();
        }
      } catch (error) {
        console.error('[AccessManager] Load error:', error);
        UI.toast('Erreur de chargement des accès');
      }
    },

    render() {
      const container = document.getElementById('team-access-view');
      if (!container) return;

      const activeAccesses = TeamState.accesses.filter(a =>
        a.status === 'active' || a.status === 'pending'
      );
      const canCreateMore = activeAccesses.length < CONFIG.MAX_ACTIVE_ACCESSES;
      const quotaPercent = Math.round(
        (activeAccesses.length / CONFIG.MAX_ACTIVE_ACCESSES) * 100
      );

      const quotaColor = activeAccesses.length >= 9
        ? '#e53935'
        : activeAccesses.length >= 7
          ? '#fb8c00'
          : '#43a047';

      let html = this.renderQuotaHeader(
        activeAccesses.length,
        quotaPercent,
        quotaColor,
        canCreateMore
      );

      if (!TeamState.accesses.length) {
        html += this.renderEmptyState();
      } else {
        html += '<div style="display:flex;flex-direction:column;gap:10px">';
        TeamState.accesses.forEach(access => {
          html += this.renderAccessCard(access);
        });
        html += '</div>';
      }

      container.innerHTML = html;
      this.attachAccessCardListeners();
    },

    renderQuotaHeader(activeCount, quotaPercent, quotaColor) {
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;
                    padding:16px;background:var(--bg4,#f5f5f5);border-radius:12px;border:1px solid var(--bd,#e0e0e0)">
          <div>
            <div style="font-size:26px;font-weight:800;color:${quotaColor}">
              ${activeCount}
              <span style="font-size:14px;color:#757575;font-weight:500">/${CONFIG.MAX_ACTIVE_ACCESSES}</span>
            </div>
            <div style="font-size:11px;font-weight:700;color:#757575;text-transform:uppercase;letter-spacing:.05em;margin-top:2px">
              Accès actifs
            </div>
            <div style="margin-top:8px;height:4px;width:120px;background:#e0e0e0;border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${quotaPercent}%;background:${quotaColor};border-radius:2px;transition:width .3s"></div>
            </div>
          </div>
        </div>
      `;
    },

    renderEmptyState() {
      return `
        <div class="team-empty">
          <div class="team-empty-icon">🔑</div>
          <h3>Aucun accès créé</h3>
          <p style="font-size:13px;color:#757575;margin-top:6px;line-height:1.6">
            Générez des identifiants d'accès pour vos commerciaux.<br>
            Ils pourront activer leur compte avec l'ID reçu.
          </p>
        </div>
      `;
    },

    renderAccessCard(access) {
      const statusConfig = {
        pending: { icon: '⏳', label: 'En attente', bg: 'rgba(251,140,0,.1)', color: '#e65100' },
        active: { icon: '✅', label: 'Actif', bg: 'rgba(67,160,71,.1)', color: '#43a047' },
        revoked: { icon: '❌', label: 'Révoqué', bg: 'rgba(229,57,53,.1)', color: '#e53935' }
      };

      const sc = statusConfig[access.status] || statusConfig.pending;
      const safeAccessId = Utils.escapeHtml(access.access_id || '');

      return `
        <div class="access-card" data-access-id="${safeAccessId}"
             style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:14px;transition:box-shadow .2s">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-family:monospace;font-size:13px;font-weight:700;color:#212121;
                        background:#f5f5f5;padding:6px 12px;border-radius:6px;border:1px solid #e0e0e0">
              ${safeAccessId}
            </div>
            <div style="font-size:11px;padding:4px 10px;border-radius:4px;font-weight:700;
                        background:${sc.bg};color:${sc.color};display:flex;align-items:center;gap:4px">
              ${sc.icon} ${sc.label}
            </div>
          </div>
          <div style="font-size:12px;color:#616161;margin-bottom:10px;line-height:1.6">
            <div><strong>Nom :</strong> ${Utils.escapeHtml(access.member_name || '—')}</div>
            <div><strong>Entreprise :</strong> ${Utils.escapeHtml(access.company_name || '—')}</div>
            <div><strong>Créé le :</strong> ${Utils.formatDate(access.created_at)}</div>
            ${access.activated_at ? `<div><strong>Activé le :</strong> ${Utils.formatDate(access.activated_at)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            ${access.status === 'pending' ? `
              <button class="copy-access-btn"
                      aria-label="Copier l'identifiant ${safeAccessId}"
                      style="flex:1;padding:7px 12px;font-size:11.5px;font-weight:600;
                             border:1px solid rgba(67,160,71,.3);border-radius:6px;
                             background:rgba(67,160,71,.05);color:#43a047;cursor:pointer;
                             display:flex;align-items:center;justify-content:center;gap:5px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copier l'ID
              </button>
            ` : ''}
            ${access.status !== 'revoked' ? `
              <button class="revoke-access-btn"
                      aria-label="Révoquer l'accès ${safeAccessId}"
                      style="${access.status === 'pending' ? '' : 'flex:1;'}padding:7px 12px;font-size:11.5px;font-weight:600;
                             border:1px solid rgba(229,57,53,.25);border-radius:6px;
                             background:rgba(229,57,53,.05);color:#e53935;cursor:pointer;
                             display:flex;align-items:center;justify-content:center;gap:5px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Révoquer
              </button>
            ` : ''}
          </div>
        </div>
      `;
    },

    attachAccessCardListeners() {
      document.querySelectorAll('.copy-access-btn').forEach(btn => {
        if (btn.dataset.boundCopy) return;
        btn.addEventListener('click', async (e) => {
          const card = e.currentTarget.closest('.access-card');
          const accessId = card?.dataset.accessId;
          if (accessId) {
            const success = await Utils.copyToClipboard(accessId);
            if (success) {
              UI.toast(`📋 ID copié : ${accessId}`);
            } else {
              UI.toast('Erreur de copie');
            }
          }
        });
        btn.dataset.boundCopy = '1';
      });

      document.querySelectorAll('.revoke-access-btn').forEach(btn => {
        if (btn.dataset.boundRevoke) return;
        btn.addEventListener('click', async (e) => {
          const card = e.currentTarget.closest('.access-card');
          const accessId = card?.dataset.accessId;
          if (accessId) {
            await this.revokeAccess(accessId);
          }
        });
        btn.dataset.boundRevoke = '1';
      });
    },

    openCreateSheet() {
      const activeCount = TeamState.accesses.filter(a =>
        a.status === 'active' || a.status === 'pending'
      ).length;

      if (activeCount >= CONFIG.MAX_ACTIVE_ACCESSES) {
        UI.toast(`Limite atteinte : ${CONFIG.MAX_ACTIVE_ACCESSES} accès maximum`);
        return;
      }

      const user = window.user;
      const firstnameEl = document.getElementById('new-access-firstname');
      const lastnameEl = document.getElementById('new-access-lastname');
      const companyEl = document.getElementById('new-access-company');
      const previewEl = document.getElementById('new-access-preview');

      if (firstnameEl) firstnameEl.value = '';
      if (lastnameEl) lastnameEl.value = '';
      if (companyEl) companyEl.value = user?.company_name || '';
      if (previewEl) {
        previewEl.textContent = `@${user?.company_name || 'Entreprise'}`;
      }

      UI.setButtonState('create-access-btn', 'default');
      UI.openSheet('create-access-sheet');
    },

    updatePreview: Utils.debounce(function() {
      const firstname = Utils.normalizeAccessPart(
        document.getElementById('new-access-firstname')?.value
      );
      const lastname = Utils.normalizeAccessPart(
        document.getElementById('new-access-lastname')?.value
      );
      const company = Utils.normalizeAccessPart(
        document.getElementById('new-access-company')?.value
      ) || 'Entreprise';

      const preview = (firstname || lastname)
        ? `${firstname}${lastname}@${company}`
        : `@${company}`;

      const previewEl = document.getElementById('new-access-preview');
      if (previewEl) {
        previewEl.textContent = preview;
      }
    }, CONFIG.DEBOUNCE_DELAY),

    async createAccess() {
      const user = window.user;
      const firstnameRaw = document.getElementById('new-access-firstname')?.value || '';
      const lastnameRaw = document.getElementById('new-access-lastname')?.value || '';
      const companyRaw = document.getElementById('new-access-company')?.value || '';

      const firstname = Utils.normalizeAccessPart(firstnameRaw);
      const lastname = Utils.normalizeAccessPart(lastnameRaw);
      const company = Utils.normalizeAccessPart(companyRaw);

      if (!firstname || !lastname || !company) {
        UI.toast('Veuillez renseigner le prénom, le nom et l’entreprise');
        return;
      }

      const accessId = `${firstname}${lastname}@${company}`;

      if (!Utils.validateAccessId(accessId)) {
        UI.toast('Format d\'ID invalide');
        return;
      }

      UI.setButtonState('create-access-btn', 'loading');

      try {
        const newAccess = {
          id: Date.now().toString(),
          access_id: accessId,
          member_name: `${Utils.sanitizeInput(firstnameRaw)} ${Utils.sanitizeInput(lastnameRaw)}`,
          manager_uid: user.uid,
          company_name: company,
          status: 'pending',
          created_at: new Date().toISOString(),
          activated_at: null
        };

        const createdAccess = await API.createAccess(newAccess);
        TeamState.accesses.push(createdAccess);
        TeamState.persist('accesses');

        await TeamManager.loadTeamData();
        await this.loadAccesses();

        UI.toast(`✅ Accès créé — ID : ${accessId}`);
        UI.closeSheet('create-access-sheet');
        this.render();

        setTimeout(async () => {
          await Utils.copyToClipboard(accessId);
        }, 600);
      } catch (error) {
        console.error('[AccessManager] Create error:', error);
        UI.toast(`Erreur : ${error.message}`);
      } finally {
        UI.setButtonState('create-access-btn', 'default');
      }
    },

    async revokeAccess(accessId) {
      if (!confirm(`Révoquer l'accès « ${accessId} » ?`)) {
        return;
      }

      const access = TeamState.accesses.find(a => a.access_id === accessId);
      if (!access) {
        UI.toast('Accès introuvable');
        return;
      }

      try {
        await API.revokeAccess(accessId);
        access.status = 'revoked';
        TeamState.persist('accesses');

        UI.toast('✅ Accès révoqué');
        this.render();
      } catch (error) {
        console.error('[AccessManager] Revoke error:', error);
        UI.toast('Erreur de révocation');
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ACTIVITY MANAGER
     ═══════════════════════════════════════════════════════════ */

  const ActivityManager = {
    buildFeed() {
      const feed = [];

      TeamState.members.forEach(member => {
        const pipeline = TeamState.pipelines[member.uid] || [];

        pipeline.forEach(prospect => {
          feed.push({
            memberName: member.name || member.email || 'Commercial',
            company: prospect.company_name || 'Entreprise',
            status: prospect.status || 'prospection',
            date: prospect.updated_at || prospect.created_at || new Date().toISOString(),
            note: prospect.note || ''
          });
        });
      });

      feed.sort((a, b) => new Date(b.date) - new Date(a.date));
      TeamState.update('activityFeed', feed);
    },

    render() {
      const container = document.getElementById('team-activity-view');
      UI.setLoading('activity-loading', false);

      if (!container) return;

      if (!TeamState.activityFeed.length) {
        UI.empty('team-activity-view', {
          icon: '⚡',
          title: 'Aucune activité',
          message: 'L\'activité de votre équipe apparaît ici en temps réel.'
        });
        return;
      }

      const html = TeamState.activityFeed
        .slice(0, CONFIG.ACTIVITY_FEED_LIMIT)
        .map(item => this.createActivityItem(item))
        .join('');

      container.innerHTML = html;
    },

    createActivityItem(item) {
      const icons = {
        prospection: '🎯',
        negociation: '🤝',
        conclue: '✅'
      };

      const statusLabels = {
        prospection: 'Prospection',
        negociation: 'Négociation',
        conclue: 'Conclue'
      };

      const dateStr = Utils.formatDate(item.date);
      const truncatedNote = item.note.length > 80
        ? item.note.slice(0, 80) + '...'
        : item.note;

      return `
        <div class="activity-item">
          <div class="activity-dot-wrap">
            <div class="activity-dot ${item.status}"></div>
          </div>
          <div class="activity-body">
            <div class="activity-text">
              <strong>${Utils.escapeHtml(item.memberName)}</strong> —
              ${icons[item.status] || ''}
              <strong>${Utils.escapeHtml(item.company)}</strong>
              en ${statusLabels[item.status] || 'Prospection'}
            </div>
            ${item.note ? `
              <div style="font-size:11.5px;color:#757575;margin-top:2px;font-style:italic">
                ${Utils.escapeHtml(truncatedNote)}
              </div>
            ` : ''}
            <div class="activity-meta">${dateStr}</div>
          </div>
        </div>
      `;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     MEMBER ACTIVATION
     ═══════════════════════════════════════════════════════════ */

  const MemberActivation = {
    switchToActivationFlow() {
      const loginForm = document.getElementById('login-form');
      const activationForm = document.getElementById('activation-form');
      const enterpriseLoginForm = document.getElementById('enterprise-login-form');
      const tabs = document.getElementById('auth-tabs') || document.querySelector('.a-tabs');

      if (loginForm) loginForm.style.display = 'none';
      if (activationForm) activationForm.style.display = 'block';
      if (enterpriseLoginForm) enterpriseLoginForm.style.display = 'none';
      if (tabs) tabs.style.display = 'none';

      const input = document.getElementById('activation-access-id');
      if (input) {
        input.value = '';
        input.focus();
      }
    },

    backToLoginForm() {
      const loginForm = document.getElementById('login-form');
      const activationForm = document.getElementById('activation-form');
      const enterpriseLoginForm = document.getElementById('enterprise-login-form');
      const tabs = document.getElementById('auth-tabs') || document.querySelector('.a-tabs');

      if (loginForm) loginForm.style.display = 'block';
      if (activationForm) activationForm.style.display = 'none';
      if (enterpriseLoginForm) enterpriseLoginForm.style.display = 'none';
      if (tabs) tabs.style.display = 'flex';
    },

    async activate() {
      const accessId = Utils.sanitizeInput(
        document.getElementById('activation-access-id')?.value
      );
      const newPwd = document.getElementById('activation-new-password')?.value || '';
      const confirmPwd = document.getElementById('activation-confirm-password')?.value || '';

      if (!accessId) {
        UI.toast('Entrez votre ID d\'accès');
        return;
      }

      if (!Utils.validateAccessId(accessId)) {
        UI.toast('Format d\'ID invalide (attendu: PrenomNom@Entreprise)');
        return;
      }

      if (!Utils.validatePassword(newPwd)) {
        UI.toast('Mot de passe : 8 caractères minimum');
        return;
      }

      if (newPwd !== confirmPwd) {
        UI.toast('Les mots de passe ne correspondent pas');
        return;
      }

      const btn = document.getElementById('activate-access-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Activation...';
      }

      try {
        const data = await API.activateMemberAccess(accessId, newPwd);

        window.token = data.token;
        window.user = data.user;
        localStorage.setItem('sc_token', data.token);

        UI.toast('🎉 Compte activé !');

        setTimeout(() => {
          if (typeof window.showApp === 'function') {
            window.showApp();
          }
        }, 800);
      } catch (error) {
        console.error('[MemberActivation] Error:', error);
        UI.toast(`Erreur : ${error.message || 'ID invalide ou déjà utilisé'}`);

        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Activer mon compte →';
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     INTEGRATION & INITIALIZATION
     ═══════════════════════════════════════════════════════════ */

  function initialize() {
    const originalShowApp = window.showApp;
    if (typeof originalShowApp === 'function' && !window.__teamManagerShowAppPatched) {
      window.showApp = function() {
        originalShowApp();
        applyManagerRole();

        const user = window.user;
        if (user && user.role === 'manager') {
          setTimeout(() => {
            TeamManager.loadTeamData();
            AccessManager.loadAccesses();
          }, 800);
        }
      };
      window.__teamManagerShowAppPatched = true;
    }

    const originalSwitchTab2 = window.switchTab2;
    if (typeof originalSwitchTab2 === 'function' && !window.__teamManagerSwitchTab2Patched) {
      window.switchTab2 = function(name) {
        originalSwitchTab2(name);

        if (name === 'team') {
          const user = window.user;
          if (user && user.role === 'manager' && !TeamState.members.length) {
            TeamManager.loadTeamData();
          }
        }
      };
      window.__teamManagerSwitchTab2Patched = true;
    }

    const firstnameInput = document.getElementById('new-access-firstname');
    const lastnameInput = document.getElementById('new-access-lastname');
    const companyInput = document.getElementById('new-access-company');

    if (firstnameInput && !firstnameInput.dataset.tmBound) {
      firstnameInput.addEventListener('input', AccessManager.updatePreview);
      firstnameInput.dataset.tmBound = '1';
    }

    if (lastnameInput && !lastnameInput.dataset.tmBound) {
      lastnameInput.addEventListener('input', AccessManager.updatePreview);
      lastnameInput.dataset.tmBound = '1';
    }

    if (companyInput && !companyInput.dataset.tmBound) {
      companyInput.addEventListener('input', AccessManager.updatePreview);
      companyInput.dataset.tmBound = '1';
    }

    updateTeamHeaderActions(TeamState.currentSeg);
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORT GLOBAL API
     ═══════════════════════════════════════════════════════════ */

  window.TeamManager = {
    // Navigation
    switchToTeamTab,
    switchToSearchTab,
    switchTeamSeg,

    // UI
    openSheet: (id) => UI.openSheet(id),
    closeSheet: (id) => UI.closeSheet(id),

    // Team
    loadTeamData: () => TeamManager.loadTeamData(),
    renderTeamMembers: () => TeamManager.render(),
    toggleMemberCard: (uid) => TeamManager.toggleCard(uid),

    // Access
    openCreateAccessSheet: () => AccessManager.openCreateSheet(),
    updateAccessPreview: () => AccessManager.updatePreview(),
    submitCreateAccess: () => AccessManager.createAccess(),
    loadAccesses: () => AccessManager.loadAccesses(),
    renderAccesses: () => AccessManager.render(),
    copyAccessId: (id) => Utils.copyToClipboard(id).then(success => {
      if (success) UI.toast(`📋 ID copié : ${id}`);
      else UI.toast('Erreur de copie');
    }),
    revokeAccess: (id) => AccessManager.revokeAccess(id),

    // Activation
    switchToActivationFlow: () => MemberActivation.switchToActivationFlow(),
    backToLoginForm: () => MemberActivation.backToLoginForm(),
    activateMemberAccess: () => MemberActivation.activate(),

    // Utilities
    applyManagerRole,
    refreshTeamData: async () => {
      await TeamManager.loadTeamData();
      await AccessManager.loadAccesses();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();