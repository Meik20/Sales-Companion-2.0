/**
 * Support Routes - /api/support/*
 * Handle support message creation, retrieval, and admin replies
 */

const express = require('express');
const router = express.Router();
const {
  verifyToken,
  verifyAdmin,
  createSupportMessage,
  getSupportMessages,
  getSupportMessagesForUser,
  replyToSupportMessage,
  closeSupportMessage,
} = require('../firestore-operations');

/**
 * GET /api/support/messages
 * Récupérer tous les messages de support (admin only)
 */
router.get('/messages', verifyAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const messages = await getSupportMessages(limit);
    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/support/messages/user
 * Récupérer les messages de l'utilisateur actuellement connecté
 */
router.get('/messages/user', verifyToken, async (req, res) => {
  try {
    const messages = await getSupportMessagesForUser(req.userId);
    res.json({
      success: true,
      userId: req.userId,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error('Error fetching user messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/support/messages
 * Créer un nouveau message de support
 */
router.post('/messages', verifyToken, async (req, res) => {
  try {
    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Subject and message are required',
      });
    }

    const messageData = {
      subject,
      message,
      priority: priority || 'normal',
    };

    const result = await createSupportMessage(req.userId, messageData);

    if (!result) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create support message',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message de support créé avec succès',
      messageId: result.id,
      data: result,
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/support/messages/:id/reply
 * Admin reply to a support message
 */
router.post('/messages/:id/reply', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({
        success: false,
        error: 'Reply text is required',
      });
    }

    const result = await replyToSupportMessage(id, reply, req.userEmail);

    res.json({
      success: true,
      message: 'Reply added successfully',
      messageId: id,
    });
  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/support/messages/:id/close
 * Close a support message (admin only)
 */
router.post('/messages/:id/close', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await closeSupportMessage(id);

    res.json({
      success: true,
      message: 'Message closed successfully',
      messageId: id,
    });
  } catch (error) {
    console.error('Error closing message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
