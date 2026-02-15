const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getWascoScraper } = require('../services/wasco');
const logger = require('../services/logger');

const router = express.Router();

// ============================================
// Wasco Price Scraping Routes (Admin only)
// ============================================

// Get all product-wasco mappings
router.get('/mappings', authMiddleware, async (req, res) => {
  try {
    const [mappings] = await db.query(`
      SELECT 
        wm.id,
        wm.product_id,
        wm.wasco_article_number,
        wm.last_synced_at,
        wm.last_bruto_price,
        wm.last_netto_price,
        p.name as product_name,
        p.brand as product_brand,
        p.category,
        p.purchase_price,
        p.base_price
      FROM wasco_mappings wm
      JOIN products p ON p.id = wm.product_id
      ORDER BY p.category, p.sort_order, p.name
    `);
    res.json(mappings);
  } catch (error) {
    logger.error('WASCO', 'Error fetching mappings', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Add a product-wasco mapping
router.post('/mappings', authMiddleware, async (req, res) => {
  try {
    const { product_id, wasco_article_number } = req.body;

    if (!product_id || !wasco_article_number) {
      return res.status(400).json({ error: 'product_id en wasco_article_number zijn verplicht' });
    }

    // Check if product exists
    const [products] = await db.query('SELECT id FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product niet gevonden' });
    }

    // Check if mapping already exists
    const [existing] = await db.query(
      'SELECT id FROM wasco_mappings WHERE product_id = ?',
      [product_id]
    );

    if (existing.length > 0) {
      // Update existing mapping
      await db.query(
        'UPDATE wasco_mappings SET wasco_article_number = ? WHERE product_id = ?',
        [wasco_article_number, product_id]
      );
      res.json({ message: 'Mapping bijgewerkt' });
    } else {
      // Create new mapping
      await db.query(
        'INSERT INTO wasco_mappings (product_id, wasco_article_number) VALUES (?, ?)',
        [product_id, wasco_article_number]
      );
      res.status(201).json({ message: 'Mapping aangemaakt' });
    }
  } catch (error) {
    logger.error('WASCO', 'Error saving mapping', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete a mapping
router.delete('/mappings/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM wasco_mappings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Mapping verwijderd' });
  } catch (error) {
    logger.error('WASCO', 'Error deleting mapping', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Search Wasco products
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Zoekterm (q) is verplicht' });
    }

    const scraper = getWascoScraper();
    if (!scraper.isLoggedIn) {
      await scraper.login();
    }
    
    const results = await scraper.searchProducts(q);
    res.json(results);
  } catch (error) {
    logger.error('WASCO', 'Search error', { error: error.message });
    res.status(500).json({ error: `Zoeken mislukt: ${error.message}` });
  }
});

// Scrape a single product preview (without saving)
router.get('/scrape/:articleNumber', authMiddleware, async (req, res) => {
  try {
    const scraper = getWascoScraper();
    if (!scraper.isLoggedIn) {
      await scraper.login();
    }

    const result = await scraper.scrapeProduct(req.params.articleNumber);
    res.json(result);
  } catch (error) {
    logger.error('WASCO', 'Scrape error', { error: error.message });
    res.status(500).json({ error: `Scrapen mislukt: ${error.message}` });
  }
});

// Sync all mapped products (manual trigger)
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    // Get all mappings
    const [mappings] = await db.query(
      'SELECT product_id, wasco_article_number FROM wasco_mappings'
    );

    if (mappings.length === 0) {
      return res.json({ message: 'Geen productkoppelingen gevonden', total: 0 });
    }

    const scraper = getWascoScraper();
    const results = await scraper.syncProducts(db, mappings);

    // Update last_synced_at and prices for successful syncs
    for (const detail of results.details) {
      if (detail.status === 'updated') {
        await db.query(
          `UPDATE wasco_mappings SET 
            last_synced_at = NOW(),
            last_bruto_price = ?,
            last_netto_price = ?
          WHERE product_id = ?`,
          [detail.brutoPrice, detail.nettoPrice, detail.productId]
        );
      }
    }

    res.json(results);
  } catch (error) {
    logger.error('WASCO', 'Sync error', { error: error.message });
    res.status(500).json({ error: `Sync mislukt: ${error.message}` });
  }
});

// Sync a single product
router.post('/sync/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    const [mappings] = await db.query(
      'SELECT product_id, wasco_article_number FROM wasco_mappings WHERE product_id = ?',
      [productId]
    );

    if (mappings.length === 0) {
      return res.status(404).json({ error: 'Geen Wasco koppeling voor dit product' });
    }

    const scraper = getWascoScraper();
    const results = await scraper.syncProducts(db, mappings);

    // Update mapping
    const detail = results.details[0];
    if (detail && detail.status === 'updated') {
      await db.query(
        `UPDATE wasco_mappings SET 
          last_synced_at = NOW(),
          last_bruto_price = ?,
          last_netto_price = ?
        WHERE product_id = ?`,
        [detail.brutoPrice, detail.nettoPrice, detail.productId]
      );
    }

    res.json(results);
  } catch (error) {
    logger.error('WASCO', 'Single sync error', { error: error.message });
    res.status(500).json({ error: `Sync mislukt: ${error.message}` });
  }
});

// Get price history for a product
router.get('/history/:productId', authMiddleware, async (req, res) => {
  try {
    const [history] = await db.query(
      `SELECT * FROM wasco_price_log 
       WHERE product_id = ? 
       ORDER BY scraped_at DESC 
       LIMIT 50`,
      [req.params.productId]
    );
    res.json(history);
  } catch (error) {
    logger.error('WASCO', 'History error', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

// Test connection (login)
router.post('/test-connection', authMiddleware, async (req, res) => {
  try {
    const scraper = getWascoScraper();
    scraper.logout(); // Clear any existing session
    await scraper.login();
    res.json({ success: true, message: 'Verbinding met Wasco.nl succesvol' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
