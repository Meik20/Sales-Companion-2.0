/**
 * Vercel Serverless Function - Sales Companion API
 * This exports the Express app for Vercel deployment
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// Firebase
const { auth, db } = require('../server/firebase-config');
const {
  verifyToken,
  verifyAdmin,
  createUser,
  getUser,
  updateUserPlan,
  searchCompanies,
  importCompaniesBatch,
  addSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
  getUserPipeline,
  addPipelineProspect,
  updatePipelineProspect,
  deletePipelineProspect,
  checkCompanyInPipeline,
  getConfig,
  setConfig,
  logUsage,
  consumeCredit,
  createSupportMessage,
  getSupportMessages,
  getSupportMessagesForUser,
  replyToSupportMessage,
  closeSupportMessage,
} = require('../server/firestore-operations');

// ── SERVER SETUP ──────────────────────────────────────────────
const app = express();
const UPLOAD_DIR = path.join('/tmp', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'server', 'admin')));
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));

// ── ROUTES DE BASE ──────────────────────────────────────────────

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Public Firebase Config (safe to expose - public credentials only)
app.get('/api/config/firebase', (req, res) => {
  try {
    // Load from environment variables (set in Vercel or .env)
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_PUBLIC_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || ''
    };
    
    // Validate that we have at least projectId and apiKey
    if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
      console.warn('⚠️ Firebase config incomplete - check environment variables');
      return res.status(503).json({ 
        error: 'Firebase configuration not available',
        message: 'Please configure Firebase environment variables'
      });
    }
    
    res.json(firebaseConfig);
  } catch (error) {
    console.error('Firebase config error:', error);
    res.status(500).json({ error: 'Failed to retrieve Firebase config' });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await createUser({ email, password, name });
    res.json({ user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken' });
    }
    const decodedToken = await auth.verifyIdToken(idToken);
    res.json({ uid: decodedToken.uid, email: decodedToken.email });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Calculer remaining = dailyLimit - dailyUsed
    const today = new Date().toISOString().split('T')[0];
    const lastReset = user.lastReset ? user.lastReset.split('T')[0] : null;
    
    // Réinitialiser si c'est un nouveau jour
    if (lastReset !== today) {
      user.dailyUsed = 0;
      await db.collection('users').doc(req.userId).update({
        dailyUsed: 0,
        lastReset: new Date().toISOString(),
      });
    }
    
    user.remaining = (user.dailyLimit || 10) - (user.dailyUsed || 0);
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Routes
app.post('/api/admin/import-companies', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const upload = multer({ dest: UPLOAD_DIR }).single('file');
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const companies = XLSX.utils.sheet_to_json(sheet);
      await importCompaniesBatch(companies);
      fs.unlinkSync(req.file.path);
      res.json({ success: true, count: companies.length });
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search Route
app.get('/api/companies/search', verifyToken, async (req, res) => {
  try {
    const { query, sector, region, city, limit } = req.query;
    const companies = await searchCompanies({
      query,
      sector,
      region,
      city,
      limit: limit || 50,
      active: true,
    });
    res.json({ companies });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/search', verifyToken, async (req, res) => {
  try {
    const { query, filters = {} } = req.body;
    console.log(`[SEARCH] User ${req.userId} searching: "${query}" with filters:`, filters);

    // Consommer 1 crédit pour la recherche
    const creditResult = await consumeCredit(req.userId);
    console.log(`[SEARCH] Credit consumption result for user ${req.userId}:`, creditResult);

    if (!creditResult.ok) {
      console.log(`[SEARCH] Credit limit reached for user ${req.userId}: ${creditResult.message}`);
      return res.status(429).json({
        error: creditResult.message || 'Limite quotidienne atteinte',
        upgrade: true,
        remaining: creditResult.remaining || 0
      });
    }

    console.log(`[SEARCH] Credit consumed successfully for user ${req.userId}, remaining: ${creditResult.remaining}`);

    const companies = await searchCompanies({
      query,
      sector: filters.secteur || filters.sector,
      region: filters.region,
      city: filters.ville || filters.city,
      limit: filters.limit || 50,
      active: true,
    });

    console.log(`[SEARCH] Found ${companies.length} companies for user ${req.userId}`);

    res.json({
      count: companies.length,
      source: 'database',
      results: companies,
      remaining: creditResult.remaining
    });
  } catch (error) {
    console.error('[SEARCH] Error for user', req.userId, ':', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', verifyToken, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    console.log(`[CHAT] User ${req.userId} sending ${messages.length} messages`);

    // Vérifier et consommer 1 crédit
    const creditResult = await consumeCredit(req.userId);
    console.log(`[CHAT] Credit consumption result for user ${req.userId}:`, creditResult);

    if (!creditResult.ok) {
      console.log(`[CHAT] Credit limit reached for user ${req.userId}: ${creditResult.message}`);
      return res.status(429).json({
        error: creditResult.message || 'Limite quotidienne atteinte',
        upgrade: true,
        remaining: creditResult.remaining || 0
      });
    }

    console.log(`[CHAT] Credit consumed successfully for user ${req.userId}, remaining: ${creditResult.remaining}`);

    // Réponse IA (à configurer avec Groq)
    res.json({
      choices: [
        {
          message: {
            content: "Je suis l'assistant IA de Sales Companion. Pour le moment, je suis en cours de configuration. Veuillez réessayer plus tard ou contactez le support.",
            role: "assistant"
          }
        }
      ],
      remaining: creditResult.remaining
    });
  } catch (error) {
    console.error('[CHAT] Error for user', req.userId, ':', error);
    res.status(500).json({ error: error.message });
  }
});
            content:
              'Assistant IA non configuré. Veuillez définir la clé groq_api_key dans la configuration du serveur.',
          },
        },
      ],
      remaining: creditResult.remaining,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/saved-searches', verifyToken, async (req, res) => {
  try {
    const saved = await addSavedSearch(req.userId, req.body);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('Saved search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/saved-searches', verifyToken, async (req, res) => {
  try {
    const searches = await getSavedSearches(req.userId);
    res.json({ data: searches });
  } catch (error) {
    console.error('Saved search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/saved-searches/:id', verifyToken, async (req, res) => {
  try {
    await deleteSavedSearch(req.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Saved search delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pipeline', verifyToken, async (req, res) => {
  try {
    const pipeline = await getUserPipeline(req.userId);
    res.json(pipeline);
  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pipeline/check', verifyToken, async (req, res) => {
  try {
    const { companyId, companyName } = req.query;
    const result = await checkCompanyInPipeline(req.userId, companyId, companyName);
    res.json({ data: result });
  } catch (error) {
    console.error('Pipeline check error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pipeline', verifyToken, async (req, res) => {
  try {
    const prospect = await addPipelineProspect(req.userId, req.body);
    res.json({ data: prospect });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: 'Prospect déjà présent dans le pipeline' });
    }
    console.error('Pipeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pipeline/:id', verifyToken, async (req, res) => {
  try {
    const prospect = await updatePipelineProspect(req.userId, req.params.id, req.body);
    res.json({ data: prospect });
  } catch (error) {
    console.error('Pipeline update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pipeline/:id', verifyToken, async (req, res) => {
  try {
    await deletePipelineProspect(req.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Pipeline delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Config Routes
app.get('/api/config', verifyToken, async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }
    const config = await getConfig(key);
    res.json({ key, value: config });
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config', verifyToken, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing key' });
    }
    await setConfig(key, value);
    res.json({ success: true });
  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Usage Logging
app.post('/api/usage/log', verifyToken, async (req, res) => {
  try {
    const { action, details } = req.body;
    await logUsage(req.userId, action, details);
    res.json({ success: true });
  } catch (error) {
    console.error('Usage log error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── SUPPORT MESSAGING ─────────────────────────────────────────

app.post('/api/support/messages', verifyToken, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const result = await createSupportMessage(req.userId, { subject, message });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Support message error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/support/messages', verifyAdmin, async (req, res) => {
  try {
    const messages = await getSupportMessages(100);
    res.json({ data: messages });
  } catch (error) {
    console.error('Get support messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/support/messages/user', verifyToken, async (req, res) => {
  try {
    const messages = await getSupportMessagesForUser(req.userId);
    res.json({ data: messages });
  } catch (error) {
    console.error('Get user support messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/support/messages/:id', verifyAdmin, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: 'Reply is required' });
    }
    await replyToSupportMessage(req.params.id, reply, req.userEmail);
    res.json({ success: true });
  } catch (error) {
    console.error('Reply support message error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/support/messages/:id/close', verifyAdmin, async (req, res) => {
  try {
    await closeSupportMessage(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Close support message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
