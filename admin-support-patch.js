// ═══════════════════════════════════════════════════════════════════
// PATCH admin/index.html — 3 fonctions à corriger
// Toutes les URLs support pointaient sur /support/* au lieu de /api/support/*
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// FONCTION 1 — loadSupportMessages()
// URL : /support/messages  →  /api/support/messages
// Réponse serveur : { success, count, messages[] }  (pas un tableau direct)
// ──────────────────────────────────────────────────────────────────
async function loadSupportMessages() {
  const listEl = document.getElementById('support-list');
  listEl.innerHTML = '<p style="color:var(--tx3);font-size:12px;padding:8px">Chargement...</p>';
  try {
    // ✅ URL corrigée : /api/support/messages
    const r = await apiFetch(`${API}/api/support/messages`, { method: 'GET' });
    if (!r) return;
    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Erreur ${r.status} : ${errData.error || 'Impossible de charger les messages'}</p>
      </div>`;
      document.getElementById('support-count').textContent = '0';
      return;
    }
    const body = await r.json();
    // Le serveur renvoie { success, count, messages } OU un tableau direct
    const list = Array.isArray(body) ? body : (body.messages || body.data || []);
    document.getElementById('support-count').textContent = list.length;
    if (!list.length) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">💬</div>
        <p>Aucun message de support</p>
        <p style="font-size:11px;margin-top:6px">Les messages envoyés par les utilisateurs apparaîtront ici.</p>
      </div>`;
      return;
    }
    listEl.innerHTML = '';
    list.forEach(msg => {
      const statusIcon = msg.status === 'answered' ? '✅' : msg.status === 'closed' ? '🔒' : '⏳';
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px;border:1px solid var(--bd);border-radius:6px;cursor:pointer;background:var(--bg2);transition:background 0.2s';
      item.onmouseenter = () => item.style.background = 'var(--bg3)';
      item.onmouseleave = () => item.style.background = 'var(--bg2)';
      item.innerHTML = `
        <div style="font-weight:600;font-size:13px">${statusIcon} ${msg.subject || '(sans sujet)'}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:4px">${msg.userName || msg.userEmail || '—'}</div>
        <div style="font-size:10px;color:var(--tx3)">${new Date(msg.created_at || msg.createdAt).toLocaleDateString()}</div>`;
      item.onclick = () => showSupportDetail(msg);
      listEl.appendChild(item);
    });
  } catch (e) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <p>Erreur réseau : ${e.message}</p>
    </div>`;
    console.error('loadSupportMessages:', e);
  }
}


// ──────────────────────────────────────────────────────────────────
// FONCTION 2 — submitSupportReply()
// URL : PUT /support/messages/:id  →  POST /api/support/messages/:id/reply
// Body : { reply }  (inchangé)
// ──────────────────────────────────────────────────────────────────
async function submitSupportReply(messageId, reply) {
  try {
    // ✅ URL corrigée + méthode POST + /reply ajouté
    const r = await apiFetch(`${API}/api/support/messages/${messageId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
    if (r && r.ok) {
      toast('✅ Réponse envoyée');
      loadSupportMessages();
    } else {
      const d = await r?.json().catch(() => ({}));
      toast('❌ ' + (d?.error || 'Erreur lors de l\'envoi'));
    }
  } catch (e) {
    console.error(e);
    toast('Erreur réseau');
  }
}


// ──────────────────────────────────────────────────────────────────
// FONCTION 3 — closeSupportMessage()
// URL : PUT /support/messages/:id/close  →  POST /api/support/messages/:id/close
// ──────────────────────────────────────────────────────────────────
async function closeSupportMessage(messageId) {
  if (!confirm('Fermer ce ticket ?')) return;
  try {
    // ✅ URL corrigée + méthode POST
    const r = await apiFetch(`${API}/api/support/messages/${messageId}/close`, {
      method: 'POST',
    });
    if (r && r.ok) {
      toast('🔒 Ticket fermé');
      loadSupportMessages();
    } else {
      toast('❌ Erreur lors de la fermeture');
    }
  } catch (e) {
    console.error(e);
  }
}
