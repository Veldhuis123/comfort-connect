const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all contact messages (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { unread } = req.query;
    let query = 'SELECT * FROM contact_messages ORDER BY created_at DESC';
    let params = [];

    if (unread === 'true') {
      query = 'SELECT * FROM contact_messages WHERE is_read = FALSE ORDER BY created_at DESC';
    }

    const [messages] = await db.query(query, params);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get single message (admin)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [messages] = await db.query(
      'SELECT * FROM contact_messages WHERE id = ?',
      [id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Bericht niet gevonden' });
    }

    // Mark as read
    await db.query('UPDATE contact_messages SET is_read = TRUE WHERE id = ?', [id]);

    res.json(messages[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Create contact message (public)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Naam, email en bericht zijn verplicht' });
    }

    const [result] = await db.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, subject, message]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Bericht verzonden' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Mark as replied (admin)
router.patch('/:id/replied', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE contact_messages SET replied_at = NOW() WHERE id = ?',
      [id]
    );
    res.json({ message: 'Gemarkeerd als beantwoord' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete message (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM contact_messages WHERE id = ?', [id]);
    res.json({ message: 'Bericht verwijderd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get unread count (admin)
router.get('/stats/unread', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM contact_messages WHERE is_read = FALSE'
    );
    res.json({ unread: result[0].count });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
