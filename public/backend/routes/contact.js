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

    // Required field validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Naam, email en bericht zijn verplicht' });
    }

    // Type and length validation
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ error: 'Naam moet tussen 1 en 100 tekens zijn' });
    }
    if (typeof email !== 'string' || email.length > 255) {
      return res.status(400).json({ error: 'E-mail mag maximaal 255 tekens bevatten' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ongeldig e-mailadres' });
    }
    if (typeof message !== 'string' || message.trim().length === 0 || message.length > 5000) {
      return res.status(400).json({ error: 'Bericht moet tussen 1 en 5000 tekens zijn' });
    }
    if (phone && (typeof phone !== 'string' || phone.length > 20)) {
      return res.status(400).json({ error: 'Telefoonnummer mag maximaal 20 tekens bevatten' });
    }
    if (subject && (typeof subject !== 'string' || subject.length > 200)) {
      return res.status(400).json({ error: 'Onderwerp mag maximaal 200 tekens bevatten' });
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedMessage = message.trim();
    const sanitizedPhone = phone ? phone.trim() : null;
    const sanitizedSubject = subject ? subject.trim() : null;

    // Verify reCAPTCHA v3 only if token is provided AND secret key is configured
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

        const { success, score, action } = recaptchaResponse.data;
        
        if (!success) {
          console.error('reCAPTCHA v3 failed:', recaptchaResponse.data['error-codes']);
          return res.status(400).json({ error: 'reCAPTCHA verificatie mislukt' });
        }

        // reCAPTCHA v3 returns a score from 0.0 to 1.0
        // 1.0 = very likely human, 0.0 = very likely bot
        // Threshold of 0.5 is recommended by Google
        const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5');
        if (score < threshold) {
          console.warn(`reCAPTCHA v3 score too low: ${score} (threshold: ${threshold}), action: ${action}`);
          return res.status(400).json({ error: 'Spam detectie - probeer het opnieuw' });
        }

        console.log(`reCAPTCHA v3 passed: score=${score}, action=${action}`);
      } catch (recaptchaError) {
        console.error('reCAPTCHA verification error:', recaptchaError.message);
        return res.status(500).json({ error: 'reCAPTCHA verificatie fout' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [sanitizedName, sanitizedEmail, sanitizedPhone, sanitizedSubject, sanitizedMessage]
    );

    // Send email notification
    sendContactNotification({ 
      name: sanitizedName, 
      email: sanitizedEmail, 
      phone: sanitizedPhone, 
      subject: sanitizedSubject, 
      message: sanitizedMessage 
    }).catch(err => {
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
