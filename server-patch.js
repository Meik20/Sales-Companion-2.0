// ═══════════════════════════════════════════════════════════════════
// PATCH server.js — 3 blocs à remplacer
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// BLOC 1 — Remplacer GET /admin/import-logs (ligne ~264)
// Ajoute des logs d'erreur visibles pour déboguer l'index Firestore
// ──────────────────────────────────────────────────────────────────

app.get('/admin/import-logs', verifyAdmin, async (req, res) => {
  try {
    const { getFirestore } = require('firebase-admin/firestore');
    const adminDb = getFirestore();
    const snap = await adminDb
      .collection('import_logs')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[IMPORT-LOGS] ${logs.length} entrées trouvées`);
    res.json(logs); // ← tableau direct, pas {data:[]} pour simplifier
  } catch (error) {
    // Erreur probable : index Firestore manquant sur import_logs/createdAt
    // → Aller sur Firebase Console > Firestore > Index > Créer index :
    //   Collection: import_logs | Champ: createdAt DESC
    console.error('[IMPORT-LOGS] Erreur Firestore:', error.message);
    console.error('[IMPORT-LOGS] Code:', error.code);
    // Fallback sans orderBy si erreur d'index
    try {
      const { getFirestore } = require('firebase-admin/firestore');
      const snap2 = await getFirestore().collection('import_logs').limit(20).get();
      const logs2 = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[IMPORT-LOGS] Fallback sans tri: ${logs2.length} entrées`);
      return res.json(logs2);
    } catch (e2) {
      console.error('[IMPORT-LOGS] Fallback aussi échoué:', e2.message);
      return res.json([]);
    }
  }
});


// ──────────────────────────────────────────────────────────────────
// BLOC 2 — Remplacer POST /api/search (ligne ~339)
// Ajoute le logging complet pour le journal d'activité admin
// ──────────────────────────────────────────────────────────────────

app.post('/api/search', verifyToken, async (req, res) => {
  try {
    const { query, filters = {} } = req.body;
    const companies = await searchCompanies({
      query,
      sector:  filters.secteur || filters.sector || null,
      region:  filters.region  || null,
      city:    filters.ville   || filters.city   || null,
      limit:   filters.limit   || 50,
      active:  true,
    });

    // ── LOGGING pour le journal d'activité admin ──────────────────
    // On écrit directement dans usage_logs avec tous les champs
    // attendus par le dashboard : name, email, query, results_count, plan
    try {
      const { getFirestore, FieldValue } = require('firebase-admin/firestore');
      const user = await getUser(req.userId).catch(() => null);
      await getFirestore().collection('usage_logs').add({
        userId:        req.userId,
        email:         req.userEmail  || user?.email || '',
        name:          user?.name     || (req.userEmail || '').split('@')[0] || '—',
        plan:          user?.plan     || 'free',
        query:         query          || '',
        results_count: companies.length,
        action:        'search',
        createdAt:     new Date(), // Timestamp Firestore (pas ISO string)
      });
    } catch (logErr) {
      // Ne jamais bloquer la réponse à cause du logging
      console.warn('[LOG] Impossible d\'écrire usage_logs:', logErr.message);
    }
    // ─────────────────────────────────────────────────────────────

    res.json({ count: companies.length, source: 'database', results: companies });
  } catch (error) {
    return safeError(res, 500, 'Erreur lors de la recherche', error);
  }
});


// ──────────────────────────────────────────────────────────────────
// BLOC 3 — Remplacer GET /api/companies/search (ligne ~322)
// Ajoute le logging complet (même logique que ci-dessus)
// ──────────────────────────────────────────────────────────────────

app.get('/api/companies/search', verifyToken, async (req, res) => {
  try {
    const { sector, region, city, q } = req.query;
    const limit = parseLimit(req.query.limit);

    const companies = await searchCompanies({
      query:  q      || null,
      sector: sector || null,
      region: region || null,
      city:   city   || null,
      limit,
      active: true,
    });

    // ── LOGGING ───────────────────────────────────────────────────
    try {
      const { getFirestore } = require('firebase-admin/firestore');
      const user = await getUser(req.userId).catch(() => null);
      await getFirestore().collection('usage_logs').add({
        userId:        req.userId,
        email:         req.userEmail  || user?.email || '',
        name:          user?.name     || (req.userEmail || '').split('@')[0] || '—',
        plan:          user?.plan     || 'free',
        query:         q              || `sector:${sector || 'all'}`,
        results_count: companies.length,
        action:        'search',
        createdAt:     new Date(),
      });
    } catch (logErr) {
      console.warn('[LOG] Impossible d\'écrire usage_logs:', logErr.message);
    }
    // ─────────────────────────────────────────────────────────────

    res.json({ count: companies.length, data: companies });
  } catch (error) {
    return safeError(res, 500, 'Erreur lors de la recherche', error);
  }
});


// ──────────────────────────────────────────────────────────────────
// BLOC 4 — Remplacer GET /admin/stats (ligne ~196)
// Corriger recentLogs pour inclure les bons champs (createdAt Timestamp)
// ──────────────────────────────────────────────────────────────────

app.get('/admin/stats', verifyAdmin, async (req, res) => {
  const { getFirestore } = require('firebase-admin/firestore');
  const adminDb = getFirestore();

  const safeCount = async (query) => {
    try { return (await query.count().get()).data().count; } catch(_) { return 0; }
  };
  const safeDocs = async (query) => {
    try { return (await query.get()).docs.map(d => d.data()); } catch(_) { return []; }
  };

  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalUsers, totalCompanies, activeToday, totalSearches] = await Promise.all([
      safeCount(adminDb.collection('users')),
      safeCount(adminDb.collection('companies')),
      safeCount(adminDb.collection('usage_logs')
        .where('action', '==', 'search')      // ← seulement les recherches
        .where('createdAt', '>=', today)),
      safeCount(adminDb.collection('usage_logs').where('action', '==', 'search')),
    ]);

    const users     = await safeDocs(adminDb.collection('users'));
    const companies = await safeDocs(adminDb.collection('companies'));

    // Récupérer les logs récents avec les champs complets
    const recentLogsSnap = await adminDb
      .collection('usage_logs')
      .where('action', '==', 'search')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
      .catch(() => ({ docs: [] }));

    const recentLogs = recentLogsSnap.docs.map(d => {
      const data = d.data();
      // Normaliser createdAt (Timestamp Firestore → ISO string)
      const ts = data.createdAt;
      const createdAt = ts?.toDate ? ts.toDate().toISOString() : (ts || '');
      return { ...data, createdAt };
    });

    const planMap = {};
    users.forEach(u => { const p = u.plan || 'free'; planMap[p] = (planMap[p] || 0) + 1; });

    const regionMap = {}, secteurMap = {};
    companies.forEach(c => {
      if (c.region) regionMap[c.region]  = (regionMap[c.region]  || 0) + 1;
      if (c.sector) secteurMap[c.sector] = (secteurMap[c.sector] || 0) + 1;
    });

    res.json({
      totalUsers, totalCompanies, activeToday, totalSearches,
      planCounts:         Object.entries(planMap).map(([plan, c]) => ({ plan, c })),
      companiesByRegion:  Object.entries(regionMap).sort((a,b)  => b[1]-a[1]).slice(0,8).map(([region, c])  => ({ region, c })),
      companiesBySecteur: Object.entries(secteurMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([secteur, c]) => ({ secteur, c })),
      recentLogs,
    });
  } catch (error) {
    return safeError(res, 500, 'Erreur stats', error);
  }
});
