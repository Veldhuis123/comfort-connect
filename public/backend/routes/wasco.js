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
        wm.discount_percent,
        wm.last_synced_at,
        wm.last_bruto_price,
        wm.last_netto_price,
        p.name as product_name,
        p.brand as product_brand,
        p.category,
        p.base_price,
        p.image_url
      FROM wasco_mappings wm
      LEFT JOIN products p ON p.id COLLATE utf8mb4_unicode_ci = wm.product_id COLLATE utf8mb4_unicode_ci
      ORDER BY p.category, p.name
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
    const { product_id, wasco_article_number, discount_percent } = req.body;

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
        'UPDATE wasco_mappings SET wasco_article_number = ?, discount_percent = ? WHERE product_id = ?',
        [wasco_article_number, discount_percent || 0, product_id]
      );
      res.json({ message: 'Mapping bijgewerkt' });
    } else {
      // Create new mapping
      await db.query(
        'INSERT INTO wasco_mappings (product_id, wasco_article_number, discount_percent) VALUES (?, ?, ?)',
        [product_id, wasco_article_number, discount_percent || 0]
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
    const [mappings] = await db.query(
      'SELECT product_id, wasco_article_number, discount_percent FROM wasco_mappings'
    );

    if (mappings.length === 0) {
      return res.json({ message: 'Geen productkoppelingen gevonden', total: 0 });
    }

    const scraper = getWascoScraper();
    const results = await scraper.syncProducts(db, mappings);
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
      'SELECT product_id, wasco_article_number, discount_percent FROM wasco_mappings WHERE product_id = ?',
      [productId]
    );

    if (mappings.length === 0) {
      return res.status(404).json({ error: 'Geen Wasco koppeling voor dit product' });
    }

    const scraper = getWascoScraper();
    const results = await scraper.syncProducts(db, mappings);
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

// Import a new product from Wasco (scrape + create product + mapping)
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const { wasco_article_number, category = 'airco' } = req.body;

    if (!wasco_article_number) {
      return res.status(400).json({ error: 'wasco_article_number is verplicht' });
    }

    // Scrape the product info from Wasco
    const scraper = getWascoScraper();
    if (!scraper.isLoggedIn) {
      await scraper.login();
    }

    const scraped = await scraper.scrapeProduct(wasco_article_number);

    if (scraped.error) {
      return res.status(400).json({ error: `Kon product niet ophalen: ${scraped.error}` });
    }

    if (!scraped.name) {
      return res.status(400).json({ error: 'Geen productnaam gevonden op Wasco' });
    }

    // Determine price
    const purchasePrice = scraped.nettoPrice || scraped.brutoPrice || 0;
    const brand = scraped.brand || 'Onbekend';
    const truncatedName = (scraped.name || '').substring(0, 100);
    const imageUrl = scraped.imageUrl || null;
    const rawSpecs = scraped.specs || {};
    const description = scraped.description || scraped.name || '';
    
    // Normalize specs to frontend-expected keys
    const specs = { ...rawSpecs };
    
    // Map Wasco spec keys to frontend keys
    const capacityVal = rawSpecs['Koelcapaciteit (kW)'] || rawSpecs['Koelvermogen (kW)'] || rawSpecs['Capaciteit (kW)'];
    if (capacityVal) specs.capacity = parseFloat(String(capacityVal).replace(',', '.')) + ' kW';
    
    const minM2 = rawSpecs['Geschikt voor ruimtes van (m²)'] || rawSpecs['Geschikt voor ruimtes van (m2)'];
    if (minM2) specs.min_m2 = parseFloat(String(minM2).replace(',', '.'));
    
    const maxM2 = rawSpecs['Geschikt voor ruimtes tot (m²)'] || rawSpecs['Geschikt voor ruimtes tot (m2)'];
    if (maxM2) specs.max_m2 = parseFloat(String(maxM2).replace(',', '.'));
    
    const energyLabel = rawSpecs['Energielabel koelen'] || rawSpecs['Energielabel'] || rawSpecs['Energie-efficiëntieklasse'];
    if (energyLabel) specs.energy_label = String(energyLabel).trim();
    
    // Build features array from scraped features + specs
    const features = [...(scraped.featuresList || [])];
    const specFeatures = {
      'Koelmiddel': 'Koelmiddel',
      'Koelcapaciteit (kW)': 'Koelvermogen',
      'Verwarmingscapaciteit (kW)': 'Verwarmingsvermogen',
      'Energielabel koelen': 'Energielabel koelen',
      'Energielabel verwarmen': 'Energielabel verwarmen',
      'Geluidsniveau binnen (dB(A))': 'Geluid binnen',
      'Geluidsniveau buiten (dB(A))': 'Geluid buiten',
      'Wifi': 'Wifi',
      'Afmetingen binnenunit (hxbxd)': 'Binnenunit',
      'Afmetingen buitenunit (hxbxd)': 'Buitenunit',
      'Geschikt voor ruimtes van (m²)': 'Geschikt voor',
      'Geschikt voor ruimtes tot (m²)': 'Tot m²',
      'SCOP verwarmen': 'SCOP',
      'SEER koelen': 'SEER',
    };
    for (const [specKey, label] of Object.entries(specFeatures)) {
      if (rawSpecs[specKey] && !features.some(f => f.includes(label))) {
        features.push(`${label}: ${rawSpecs[specKey]}`);
      }
    }

    // Generate a unique product ID
    const productId = `wasco-${wasco_article_number}`;

    // Check if product already exists
    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
    
    if (existing.length > 0) {
      // Product exists - update all info
      await db.query(
        `UPDATE products SET 
          name = ?, brand = ?, base_price = ?, image_url = ?,
          specs = ?, features = ?, description = ?,
          updated_at = NOW() 
        WHERE id = ?`,
        [truncatedName, brand, purchasePrice, imageUrl,
         JSON.stringify(specs), JSON.stringify(features), description,
         productId]
      );

      // Upsert the wasco mapping
      const [existingMapping] = await db.query(
        'SELECT id FROM wasco_mappings WHERE product_id = ?', [productId]
      );
      if (existingMapping.length > 0) {
        await db.query(
          `UPDATE wasco_mappings SET wasco_article_number = ?, last_synced_at = NOW(), last_bruto_price = ?, last_netto_price = ? WHERE product_id = ?`,
          [wasco_article_number, scraped.brutoPrice, scraped.nettoPrice, productId]
        );
      } else {
        await db.query(
          `INSERT INTO wasco_mappings (product_id, wasco_article_number, last_synced_at, last_bruto_price, last_netto_price) VALUES (?, ?, NOW(), ?, ?)`,
          [productId, wasco_article_number, scraped.brutoPrice, scraped.nettoPrice]
        );
      }
    } else {
      await db.query(
        `INSERT INTO products (id, name, brand, category, base_price, image_url, specs, features, description, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [productId, truncatedName, brand, category, purchasePrice, imageUrl,
         JSON.stringify(specs), JSON.stringify(features), description]
      );

      // Create the wasco mapping
      await db.query(
        `INSERT INTO wasco_mappings (product_id, wasco_article_number, last_synced_at, last_bruto_price, last_netto_price)
         VALUES (?, ?, NOW(), ?, ?)`,
        [productId, wasco_article_number, scraped.brutoPrice, scraped.nettoPrice]
      );
    }

    // Log the price
    await db.query(
      `INSERT INTO wasco_price_log (product_id, wasco_article_number, bruto_price, netto_price, scraped_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [productId, wasco_article_number, scraped.brutoPrice, scraped.nettoPrice]
    );

    logger.info('WASCO', `Imported product ${productId} from Wasco article ${wasco_article_number}`, {
      name: scraped.name,
      brand,
      purchasePrice,
    });

    res.status(201).json({
      message: 'Product geïmporteerd',
      product: {
        id: productId,
        name: scraped.name,
        brand,
        category,
        purchasePrice,
        brutoPrice: scraped.brutoPrice,
        nettoPrice: scraped.nettoPrice,
        articleNumber: wasco_article_number,
      },
    });
  } catch (error) {
    logger.error('WASCO', 'Import error', { error: error.message });
    res.status(500).json({ error: `Import mislukt: ${error.message}` });
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
