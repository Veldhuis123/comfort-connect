const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ============================================
// INSTALLATION SETTINGS
// ============================================

// Get all settings for a category
router.get('/settings/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const [settings] = await db.query(
      'SELECT * FROM installation_settings WHERE category = ? ORDER BY setting_key',
      [category]
    );
    
    // Convert to key-value object for easy frontend use
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = {
        value: parseFloat(s.setting_value),
        unit: s.unit,
        description: s.description
      };
    });
    
    res.json({ category, settings: settingsObj, raw: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update settings for a category - admin
router.put('/settings/:category', authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const { settings } = req.body; // Object with { key: value }
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Ongeldige instellingen' });
    }
    
    const updatePromises = Object.entries(settings).map(([key, value]) =>
      db.query(
        `INSERT INTO installation_settings (category, setting_key, setting_value) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [category, key, value, value]
      )
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Instellingen opgeslagen' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Add or update a single setting - admin
router.post('/settings/:category/:key', authMiddleware, async (req, res) => {
  try {
    const { category, key } = req.params;
    const { value, unit, description } = req.body;
    
    await db.query(
      `INSERT INTO installation_settings (category, setting_key, setting_value, unit, description) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         setting_value = VALUES(setting_value),
         unit = COALESCE(VALUES(unit), unit),
         description = COALESCE(VALUES(description), description)`,
      [category, key, value, unit || null, description || null]
    );
    
    res.json({ message: 'Instelling opgeslagen' });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// ============================================
// CAPACITY PRICING
// ============================================

// Get capacity pricing for a category
router.get('/capacity/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const [pricing] = await db.query(
      'SELECT * FROM capacity_pricing WHERE category = ? ORDER BY min_capacity',
      [category]
    );
    
    res.json(pricing);
  } catch (error) {
    console.error('Error fetching capacity pricing:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update capacity pricing - admin
router.put('/capacity/:category', authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const { pricing } = req.body; // Array of pricing entries
    
    if (!Array.isArray(pricing)) {
      return res.status(400).json({ error: 'Ongeldige prijzen' });
    }
    
    // Delete existing and insert new
    await db.query('DELETE FROM capacity_pricing WHERE category = ?', [category]);
    
    for (const p of pricing) {
      await db.query(
        `INSERT INTO capacity_pricing (category, min_capacity, max_capacity, extra_hours, extra_materials, notes) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [category, p.min_capacity, p.max_capacity, p.extra_hours || 0, p.extra_materials || 0, p.notes || null]
      );
    }
    
    res.json({ message: 'Capaciteitsprijzen opgeslagen' });
  } catch (error) {
    console.error('Error updating capacity pricing:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// ============================================
// PIPE DIAMETER PRICING
// ============================================

// Get pipe diameter pricing for a category
router.get('/pipes/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const [pricing] = await db.query(
      'SELECT * FROM pipe_diameter_pricing WHERE category = ? ORDER BY min_capacity',
      [category]
    );
    
    res.json(pricing);
  } catch (error) {
    console.error('Error fetching pipe pricing:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update pipe diameter pricing - admin
router.put('/pipes/:category', authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const { pricing } = req.body;
    
    if (!Array.isArray(pricing)) {
      return res.status(400).json({ error: 'Ongeldige prijzen' });
    }
    
    // Delete existing and insert new
    await db.query('DELETE FROM pipe_diameter_pricing WHERE category = ?', [category]);
    
    for (const p of pricing) {
      await db.query(
        `INSERT INTO pipe_diameter_pricing (category, min_capacity, max_capacity, liquid_line, suction_line, price_per_meter, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [category, p.min_capacity, p.max_capacity, p.liquid_line, p.suction_line, p.price_per_meter, p.notes || null]
      );
    }
    
    res.json({ message: 'Leidingprijzen opgeslagen' });
  } catch (error) {
    console.error('Error updating pipe pricing:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// ============================================
// PRICE CALCULATION
// ============================================

// Calculate installation price
router.post('/calculate', async (req, res) => {
  try {
    const { 
      productId,
      category = 'airco',
      pipeLength = 3,      // meters extra boven standaard
      needsElectricalGroup = false,
      needsCableDuct = 0,  // meters
      needsCondensatePump = false,
      quantity = 1
    } = req.body;
    
    // Get product info
    let productPrice = 0;
    let expectedHours = 4;
    let coolingCapacity = 2.5;
    
    if (productId) {
      const [products] = await db.query(
        'SELECT base_price, purchase_price, margin_percent, expected_hours, cooling_capacity FROM products WHERE id = ?',
        [productId]
      );
      
      if (products.length > 0) {
        const product = products[0];
        // Use selling price or calculate from purchase + margin
        if (product.purchase_price) {
          productPrice = parseFloat(product.purchase_price) * (1 + (parseFloat(product.margin_percent) || 30) / 100);
        } else {
          productPrice = parseFloat(product.base_price) || 0;
        }
        expectedHours = parseFloat(product.expected_hours) || 4;
        coolingCapacity = parseFloat(product.cooling_capacity) || 2.5;
      }
    }
    
    // Get installation settings
    const [settings] = await db.query(
      'SELECT setting_key, setting_value FROM installation_settings WHERE category = ?',
      [category]
    );
    
    const config = {};
    settings.forEach(s => {
      config[s.setting_key] = parseFloat(s.setting_value);
    });
    
    // Get capacity-based extras
    const [capacityPricing] = await db.query(
      'SELECT extra_hours, extra_materials FROM capacity_pricing WHERE category = ? AND ? >= min_capacity AND ? <= max_capacity LIMIT 1',
      [category, coolingCapacity, coolingCapacity]
    );
    
    const capacityExtras = capacityPricing[0] || { extra_hours: 0, extra_materials: 0 };
    
    // Get pipe diameter pricing based on capacity
    const [pipeDiameterPricing] = await db.query(
      'SELECT liquid_line, suction_line, price_per_meter FROM pipe_diameter_pricing WHERE category = ? AND ? >= min_capacity AND ? <= max_capacity LIMIT 1',
      [category, coolingCapacity, coolingCapacity]
    );
    
    const pipeInfo = pipeDiameterPricing[0] || { liquid_line: '1/4"', suction_line: '3/8"', price_per_meter: 35 };
    
    // Calculate totals
    const hourlyRate = config.hourly_rate || 55;
    const travelCost = config.travel_cost || 35;
    const pipePerMeter = parseFloat(pipeInfo.price_per_meter) || config.pipe_per_meter || 35;
    const includedPipeMeters = config.pipe_included_meters || 3;
    const cableDuctPerMeter = config.cable_duct_per_meter || 12.5;
    const electricalGroup = config.electrical_group || 185;
    const smallMaterials = config.small_materials || 45;
    const vacuumNitrogen = config.vacuum_nitrogen || 35;
    const condensatePump = config.condensate_pump || 95;
    const vatRate = config.vat_rate || 21;
    
    // Labor costs
    const totalHours = expectedHours + (capacityExtras.extra_hours || 0);
    const laborCost = totalHours * hourlyRate;
    
    // Material costs
    const extraPipeLength = Math.max(0, pipeLength - includedPipeMeters);
    const pipeCost = extraPipeLength * pipePerMeter;
    const ductCost = needsCableDuct * cableDuctPerMeter;
    const electricalCost = needsElectricalGroup ? electricalGroup : 0;
    const pumpCost = needsCondensatePump ? condensatePump : 0;
    const materialsCost = smallMaterials + vacuumNitrogen + (capacityExtras.extra_materials || 0);
    
    // Subtotals
    const productTotal = productPrice * quantity;
    const laborTotal = laborCost + travelCost;
    const materialsTotal = pipeCost + ductCost + electricalCost + pumpCost + materialsCost;
    
    const subtotalExcl = productTotal + laborTotal + materialsTotal;
    const vatAmount = subtotalExcl * (vatRate / 100);
    const totalIncl = subtotalExcl + vatAmount;
    
    res.json({
      breakdown: {
        product: {
          price: productPrice,
          quantity,
          total: productTotal
        },
        labor: {
          hours: totalHours,
          rate: hourlyRate,
          travel: travelCost,
          total: laborTotal
        },
        materials: {
          pipes: pipeCost,
          pipePerMeter: pipePerMeter,
          pipeDiameter: {
            liquid: pipeInfo.liquid_line,
            suction: pipeInfo.suction_line
          },
          duct: ductCost,
          electrical: electricalCost,
          pump: pumpCost,
          small: materialsCost,
          total: materialsTotal
        }
      },
      totals: {
        subtotal_excl: Math.round(subtotalExcl * 100) / 100,
        vat_rate: vatRate,
        vat_amount: Math.round(vatAmount * 100) / 100,
        total_incl: Math.round(totalIncl * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// ============================================
// PRODUCT PRICING - Admin endpoints
// ============================================

// Update product pricing fields - admin
router.patch('/product/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      purchase_price, 
      margin_percent, 
      expected_hours,
      energy_label,
      cooling_capacity,
      heating_capacity,
      seer,
      scop,
      refrigerant,
      noise_indoor,
      noise_outdoor
    } = req.body;
    
    // Build dynamic update query
    const updates = {};
    if (purchase_price !== undefined) updates.purchase_price = purchase_price;
    if (margin_percent !== undefined) updates.margin_percent = margin_percent;
    if (expected_hours !== undefined) updates.expected_hours = expected_hours;
    if (energy_label !== undefined) updates.energy_label = energy_label;
    if (cooling_capacity !== undefined) updates.cooling_capacity = cooling_capacity;
    if (heating_capacity !== undefined) updates.heating_capacity = heating_capacity;
    if (seer !== undefined) updates.seer = seer;
    if (scop !== undefined) updates.scop = scop;
    if (refrigerant !== undefined) updates.refrigerant = refrigerant;
    if (noise_indoor !== undefined) updates.noise_indoor = noise_indoor;
    if (noise_outdoor !== undefined) updates.noise_outdoor = noise_outdoor;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Geen velden om bij te werken' });
    }
    
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    await db.query(`UPDATE products SET ${setClause} WHERE id = ?`, values);
    
    // Calculate and update selling price (base_price)
    if (purchase_price !== undefined || margin_percent !== undefined) {
      await db.query(
        `UPDATE products SET base_price = ROUND(purchase_price * (1 + margin_percent / 100), 2) 
         WHERE id = ? AND purchase_price IS NOT NULL`,
        [id]
      );
    }
    
    res.json({ message: 'Productprijzen bijgewerkt' });
  } catch (error) {
    console.error('Error updating product pricing:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get product with calculated selling price
router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [products] = await db.query(
      `SELECT p.*, 
        CASE WHEN p.purchase_price IS NOT NULL 
          THEN ROUND(p.purchase_price * (1 + p.margin_percent / 100), 2) 
          ELSE p.base_price 
        END as calculated_selling_price
       FROM products p WHERE p.id = ?`,
      [id]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product niet gevonden' });
    }
    
    const product = products[0];
    product.specs = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs;
    product.features = typeof product.features === 'string' ? JSON.parse(product.features) : product.features;
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
