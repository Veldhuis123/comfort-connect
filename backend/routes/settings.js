const express = require('express');
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const logger = require('../services/logger');

const router = express.Router();

// GET /api/settings/calculators — public, no auth needed
router.get('/calculators', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'calculator_settings' LIMIT 1"
    );
    if (rows.length > 0) {
      res.json(JSON.parse(rows[0].setting_value));
    } else {
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
    logger.error('SETTINGS', 'Error fetching calculator settings', { error: error.message });
    res.status(500).json({ error: 'Kon instellingen niet ophalen' });
  }
});

// PUT /api/settings/calculators — admin only
router.put('/calculators', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = req.body;
    const json = JSON.stringify(settings);

    await db.query(
      `INSERT INTO app_settings (setting_key, setting_value) 
       VALUES ('calculator_settings', ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [json, json]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('SETTINGS', 'Error saving calculator settings', { error: error.message });
    res.status(500).json({ error: 'Kon instellingen niet opslaan' });
  }
});

module.exports = router;
