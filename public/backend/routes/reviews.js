const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all visible reviews (public)
router.get('/', async (req, res) => {
  try {
    const [reviews] = await db.query(
      'SELECT id, name, location, rating, review_text, service, review_date FROM reviews WHERE is_visible = TRUE ORDER BY created_at DESC'
    );
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get all reviews (admin)
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const [reviews] = await db.query(
      'SELECT * FROM reviews ORDER BY created_at DESC'
    );
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Create review (admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, location, rating, review_text, service, review_date, is_visible } = req.body;

    const [result] = await db.query(
      'INSERT INTO reviews (name, location, rating, review_text, service, review_date, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, location, rating, review_text, service, review_date, is_visible !== false]
    );

    res.status(201).json({ id: result.insertId, message: 'Review toegevoegd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update review (admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, rating, review_text, service, review_date, is_visible } = req.body;

    await db.query(
      'UPDATE reviews SET name = ?, location = ?, rating = ?, review_text = ?, service = ?, review_date = ?, is_visible = ? WHERE id = ?',
      [name, location, rating, review_text, service, review_date, is_visible, id]
    );

    res.json({ message: 'Review bijgewerkt' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete review (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    res.json({ message: 'Review verwijderd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Toggle visibility (admin)
router.patch('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE reviews SET is_visible = NOT is_visible WHERE id = ?',
      [id]
    );
    res.json({ message: 'Zichtbaarheid gewijzigd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
