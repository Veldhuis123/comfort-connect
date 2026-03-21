const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/settings/calculators — public, no auth needed
router.get('/calculators', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'calculator_settings' LIMIT 1"
    );
    if (rows.length > 0) {
      res.json(JSON.parse(rows[0].setting_value));
    } else {
      // Return defaults
      res.json({
        airco: { enabled: true, name: "Airco" },
        pv: { enabled: true, name: "Zonnepanelen" },
        battery: { enabled: true, name: "Thuisaccu" },
        unifi: { enabled: true, name: "UniFi Netwerk" },
        charging: { enabled: true, name: "Laadpalen" },
        schema: { enabled: true, name: "Installatie" },
      });
    }
  } catch (error) {
    console.error('Error fetching calculator settings:', error);
    res.status(500).json({ error: 'Kon instellingen niet ophalen' });
  }
});

// PUT /api/settings/calculators — admin only
router.put('/calculators', requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    const json = JSON.stringify(settings);

    await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value) 
       VALUES ('calculator_settings', ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [json, json]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving calculator settings:', error);
    res.status(500).json({ error: 'Kon instellingen niet opslaan' });
  }
});

module.exports = router;
