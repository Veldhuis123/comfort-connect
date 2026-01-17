const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all quotes (admin)
router.get('/', authMiddleware, async (req, res) => {
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
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get single quote with photos (admin)
router.get('/:id', authMiddleware, async (req, res) => {
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
    res.status(500).json({ error: 'Server fout' });
  }
});

// Create quote request (public - from calculator)
router.post('/', async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      rooms,
      total_size,
      total_capacity,
      selected_airco_id,
      selected_airco_name,
      selected_airco_brand,
      estimated_price,
      pipe_color,
      pipe_length,
      additional_notes
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO quote_requests 
       (customer_name, customer_email, customer_phone, rooms, total_size, total_capacity, 
        selected_airco_id, selected_airco_name, selected_airco_brand, estimated_price, 
        pipe_color, pipe_length, additional_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_email, customer_phone, JSON.stringify(rooms), 
       total_size, total_capacity, selected_airco_id, selected_airco_name, 
       selected_airco_brand, estimated_price, pipe_color, pipe_length, additional_notes]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Offerteaanvraag ontvangen' 
    });
  } catch (error) {
    console.error('Quote creation error:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update quote status (admin)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    await db.query(
      'UPDATE quote_requests SET status = ?, admin_notes = ? WHERE id = ?',
      [status, admin_notes, id]
    );

    res.json({ message: 'Status bijgewerkt' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete quote (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quote_requests WHERE id = ?', [id]);
    res.json({ message: 'Offerte verwijderd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get quote stats (admin)
router.get('/stats/summary', authMiddleware, async (req, res) => {
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
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
