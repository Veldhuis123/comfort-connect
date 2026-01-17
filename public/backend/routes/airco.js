const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all active airco units (public)
router.get('/', async (req, res) => {
  try {
    const [units] = await db.query(
      'SELECT * FROM airco_units WHERE is_active = TRUE ORDER BY sort_order ASC'
    );
    
    // Parse JSON features
    const parsedUnits = units.map(unit => ({
      ...unit,
      features: JSON.parse(unit.features)
    }));

    res.json(parsedUnits);
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get all airco units (admin)
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const [units] = await db.query('SELECT * FROM airco_units ORDER BY sort_order ASC');
    
    const parsedUnits = units.map(unit => ({
      ...unit,
      features: JSON.parse(unit.features)
    }));

    res.json(parsedUnits);
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Create airco unit (admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { id, name, brand, capacity, min_m2, max_m2, base_price, image_url, features, energy_label, is_active, sort_order } = req.body;

    await db.query(
      `INSERT INTO airco_units (id, name, brand, capacity, min_m2, max_m2, base_price, image_url, features, energy_label, is_active, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, brand, capacity, min_m2, max_m2, base_price, image_url, JSON.stringify(features), energy_label, is_active !== false, sort_order || 0]
    );

    res.status(201).json({ message: 'Airco toegevoegd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update airco unit (admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, capacity, min_m2, max_m2, base_price, image_url, features, energy_label, is_active, sort_order } = req.body;

    await db.query(
      `UPDATE airco_units SET name = ?, brand = ?, capacity = ?, min_m2 = ?, max_m2 = ?, 
       base_price = ?, image_url = ?, features = ?, energy_label = ?, is_active = ?, sort_order = ? 
       WHERE id = ?`,
      [name, brand, capacity, min_m2, max_m2, base_price, image_url, JSON.stringify(features), energy_label, is_active, sort_order, id]
    );

    res.json({ message: 'Airco bijgewerkt' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete airco unit (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM airco_units WHERE id = ?', [id]);
    res.json({ message: 'Airco verwijderd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

// Toggle active status (admin)
router.patch('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE airco_units SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
    res.json({ message: 'Status gewijzigd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
