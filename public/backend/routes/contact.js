const express = require('express');
const axios = require('axios');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { sendContactNotification } = require('../services/email');

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
    const { name, email, phone, subject, message, recaptchaToken } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Naam, email en bericht zijn verplicht' });
    }

    // Verify reCAPTCHA only if token is provided AND secret key is configured
    if (recaptchaToken && process.env.RECAPTCHA_SECRET_KEY) {
      try {
        const recaptchaResponse = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          null,
          {
            params: {
              secret: process.env.RECAPTCHA_SECRET_KEY,
              response: recaptchaToken
            }
          }
        );

        if (!recaptchaResponse.data.success) {
          return res.status(400).json({ error: 'reCAPTCHA verificatie mislukt' });
        }
      } catch (recaptchaError) {
        console.error('reCAPTCHA verification error:', recaptchaError.message);
        return res.status(500).json({ error: 'reCAPTCHA verificatie fout' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, subject, message]
    );

    // Send email notification
    sendContactNotification({ name, email, phone, subject, message }).catch(err => {
      console.error('Failed to send contact notification email:', err.message);
    });

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Bericht verzonden' 
    });
  } catch (error) {
    console.error('Contact message error:', error.message);
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
