const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { notifyNewReview } = require('../services/whatsapp');

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

// Submit review (public - no auth required)
router.post('/submit', async (req, res) => {
  try {
    const { name, location, rating, review_text, service } = req.body;

    // Validation
    if (!name || !location || !rating || !review_text || !service) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' });
    }

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Naam moet tussen 2 en 100 tekens zijn' });
    }

    if (typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 100) {
      return res.status(400).json({ error: 'Plaats moet tussen 2 en 100 tekens zijn' });
    }

    if (typeof review_text !== 'string' || review_text.trim().length < 20 || review_text.trim().length > 1000) {
      return res.status(400).json({ error: 'Review moet tussen 20 en 1000 tekens zijn' });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Beoordeling moet tussen 1 en 5 zijn' });
    }

    const validServices = ['Airco installatie', 'UniFi netwerk', 'Zonnepanelen', 'Thuisaccu', 'Laadpaal', 'Algemeen'];
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: 'Ongeldige dienst geselecteerd' });
    }

    // Current date for review_date
    const review_date = new Date().toISOString().split('T')[0];

    // Insert with is_visible = false (pending approval)
    const [result] = await db.query(
      'INSERT INTO reviews (name, location, rating, review_text, service, review_date, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), location.trim(), rating, review_text.trim(), service, review_date, false]
    );

    // Send WhatsApp notification (async, don't wait for result)
    notifyNewReview({
      name: name.trim(),
      location: location.trim(),
      rating,
      review_text: review_text.trim(),
      service,
    }).catch(err => console.error('WhatsApp notification failed:', err));

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Review ontvangen! Deze wordt na controle gepubliceerd.' 
    });
  } catch (error) {
    console.error('Error submitting review:', error);
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
