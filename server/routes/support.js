/**
 * Support admin routes — admin-only read/write via Admin SDK
 */
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyAdmin } = require('../firestore-operations');

/**
 * GET /api/support/messages
 * Récupère tous les fils de support (admin uniquement)
 */
router.get('/messages', verifyAdmin, async (req, res) => {
  try {
    // Récupérer tous les threads
    const snapshot = await admin.firestore()
      .collection('support_threads')
      .orderBy('updatedAt', 'desc')
      .get();

    const threads = [];
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      threads.push({
        id: doc.id,
        userId: data.userId || '',
        userEmail: data.userEmail || '',
        userName: data.userName || '',
        subject: data.subject || '',
        status: data.status || 'open',
        lastMessage: data.lastMessage || '',
        unreadByAdmin: !!data.unreadByAdmin,
        unreadByUser: !!data.unreadByUser,
        createdAt: data.createdAt && data.createdAt._seconds
          ? new Date(data.createdAt._seconds * 1000).toISOString()
          : '',
        updatedAt: data.updatedAt && data.updatedAt._seconds
          ? new Date(data.updatedAt._seconds * 1000).toISOString()
          : ''
      });
    });

    res.json({ success: true, data: threads });
  } catch (error) {
    console.error('[GET /support/messages]', error);
    res.status(500).json({ error: 'Erreur serveur : ' + error.message });
  }
});

/**
 * GET /api/support/threads/:threadId/messages
 */
router.get('/threads/:threadId/messages', verifyAdmin, async (req, res) => {
  try {
    const { threadId } = req.params;

    const snapshot = await admin.firestore()
      .collection('support_threads')
      .doc(threadId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    const messages = [];
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      messages.push({
        id: doc.id,
        content: data.content || '',
        senderId: data.senderId || '',
        senderRole: data.senderRole || 'user',
        createdAt: data.createdAt && data.createdAt._seconds
          ? new Date(data.createdAt._seconds * 1000).toISOString()
          : ''
      });
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('[GET /support/threads/:threadId/messages]', error);
    res.status(500).json({ error: 'Erreur serveur : ' + error.message });
  }
});

/**
 * POST /api/support/threads/:threadId/reply
 * L'admin répond à un fil
 */
router.post('/threads/:threadId/reply', verifyAdmin, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message vide' });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Ajouter le message
    await admin.firestore()
      .collection('support_threads')
      .doc(threadId)
      .collection('messages')
      .add({
        content: content.trim(),
        senderId: req.user.uid,
        senderRole: 'admin',
        createdAt: now
      });

    // Mettre à jour le thread
    await admin.firestore()
      .collection('support_threads')
      .doc(threadId)
      .update({
        lastMessage: content.trim().slice(0, 80),
        updatedAt: now,
        unreadByUser: true,
        unreadByAdmin: false
      });

    res.json({ success: true });
  } catch (error) {
    console.error('[POST /support/threads/:threadId/reply]', error);
    res.status(500).json({ error: 'Erreur serveur : ' + error.message });
  }
});

module.exports = router;
