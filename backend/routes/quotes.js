const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendQuoteNotification, sendQuoteConfirmation } = require('../services/email');
const logger = require('../services/logger');

const router = express.Router();

// Strikte rate limiter voor publieke offerte aanvragen
const quoteSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Te veel offerteaanvragen. Probeer het later opnieuw.' },
});

// Get all quotes (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM quote_requests ORDER BY created_at DESC';
    let params = [];

    if (status) {
      query = 'SELECT * FROM quote_requests WHERE status = ? ORDER BY created_at DESC';
      params = [status];
    }

    const [quotes] = await db.query(query, params);
    res.json(quotes);
  } catch (error) {
    logger.error('QUOTES', 'Error fetching quotes', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get single quote with photos (admin)
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [quotes] = await db.query(
      'SELECT * FROM quote_requests WHERE id = ?',
      [id]
    );

    if (quotes.length === 0) {
      return res.status(404).json({ error: 'Offerte niet gevonden' });
    }

    const [photos] = await db.query(
      'SELECT * FROM quote_photos WHERE quote_request_id = ?',
      [id]
    );

    res.json({ ...quotes[0], photos });
  } catch (error) {
    logger.error('QUOTES', 'Error fetching quote', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Create quote request (public - from calculator)
router.post('/', quoteSubmitLimiter, async (req, res) => {
  try {
    const {
      customer_name, customer_email, customer_phone,
      rooms, total_size, total_capacity,
      selected_airco_id, selected_airco_name, selected_airco_brand,
      estimated_price, pipe_color, pipe_length, additional_notes
    } = req.body;

    // Input validation
    if (customer_name && (typeof customer_name !== 'string' || customer_name.length > 100)) {
      return res.status(400).json({ error: 'Naam mag maximaal 100 tekens bevatten' });
    }
    if (customer_email && (typeof customer_email !== 'string' || customer_email.length > 255)) {
      return res.status(400).json({ error: 'E-mail mag maximaal 255 tekens bevatten' });
    }
    if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
      return res.status(400).json({ error: 'Ongeldig e-mailadres' });
    }
    if (customer_phone && (typeof customer_phone !== 'string' || customer_phone.length > 20)) {
      return res.status(400).json({ error: 'Telefoonnummer mag maximaal 20 tekens bevatten' });
    }
    if (additional_notes && (typeof additional_notes !== 'string' || additional_notes.length > 2000)) {
      return res.status(400).json({ error: 'Opmerkingen mogen maximaal 2000 tekens bevatten' });
    }
    if (selected_airco_name && (typeof selected_airco_name !== 'string' || selected_airco_name.length > 200)) {
      return res.status(400).json({ error: 'Productnaam te lang' });
    }
    if (pipe_color && (typeof pipe_color !== 'string' || pipe_color.length > 50)) {
      return res.status(400).json({ error: 'Leidingkleur te lang' });
    }
    
    // Sanitize inputs
    const sanitizedName = customer_name ? customer_name.trim() : null;
    const sanitizedEmail = customer_email ? customer_email.trim().toLowerCase() : null;
    const sanitizedPhone = customer_phone ? customer_phone.trim() : null;
    const sanitizedNotes = additional_notes ? additional_notes.trim() : null;

    const [result] = await db.query(
      `INSERT INTO quote_requests 
       (customer_name, customer_email, customer_phone, rooms, total_size, total_capacity, 
        selected_airco_id, selected_airco_name, selected_airco_brand, estimated_price, 
        pipe_color, pipe_length, additional_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sanitizedName, sanitizedEmail, sanitizedPhone, JSON.stringify(rooms), 
       total_size, total_capacity, selected_airco_id, selected_airco_name, 
       selected_airco_brand, estimated_price, pipe_color, pipe_length, sanitizedNotes]
    );

    const quoteData = {
      id: result.insertId, customer_name, customer_email, customer_phone,
      rooms, total_size, total_capacity, selected_airco_id, selected_airco_name,
      selected_airco_brand, estimated_price, pipe_color, pipe_length, additional_notes
    };
    
    sendQuoteNotification(quoteData).catch(err => {
      logger.error('EMAIL', 'Failed to send quote notification', { error: err.message });
    });

    sendQuoteConfirmation(quoteData).catch(err => {
      logger.error('EMAIL', 'Failed to send quote confirmation', { error: err.message });
    });

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Offerteaanvraag ontvangen' 
    });
  } catch (error) {
    logger.error('QUOTES', 'Error creating quote', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update quote status (admin)
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    await db.query(
      'UPDATE quote_requests SET status = ?, admin_notes = ? WHERE id = ?',
      [status, admin_notes, id]
    );

    res.json({ message: 'Status bijgewerkt' });
  } catch (error) {
    logger.error('QUOTES', 'Error updating status', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete quote (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quote_requests WHERE id = ?', [id]);
    res.json({ message: 'Offerte verwijderd' });
  } catch (error) {
    logger.error('QUOTES', 'Error deleting quote', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get quote stats (admin)
router.get('/stats/summary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as count FROM quote_requests');
    const [byStatus] = await db.query(
      'SELECT status, COUNT(*) as count FROM quote_requests GROUP BY status'
    );
    const [thisMonth] = await db.query(
      'SELECT COUNT(*) as count FROM quote_requests WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())'
    );

    res.json({
      total: total[0].count,
      thisMonth: thisMonth[0].count,
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('QUOTES', 'Error fetching stats', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
