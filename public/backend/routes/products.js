const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Ensure product images directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const productImagesDir = path.join(uploadDir, 'products');
if (!fs.existsSync(productImagesDir)) {
  fs.mkdirSync(productImagesDir, { recursive: true });
}

// Configure multer for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Alleen afbeeldingen zijn toegestaan'));
  }
});

// Valid categories
const validCategories = [
  'airco', 
  'unifi_router', 
  'unifi_switch', 
  'unifi_accesspoint', 
  'unifi_camera', 
  'battery', 
  'charger',
  'solar'
];

// ============================================
// PUBLIC ENDPOINTS
// ============================================

// Get all active products (optionally filter by category)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM products WHERE is_active = TRUE';
    const params = [];
    
    if (category) {
      // Support multiple categories (comma-separated)
      const categories = category.split(',').filter(c => validCategories.includes(c));
      if (categories.length > 0) {
        query += ` AND category IN (${categories.map(() => '?').join(',')})`;
        params.push(...categories);
      }
    }
    
    query += ' ORDER BY category, sort_order, name';
    
    const [products] = await db.query(query, params);
    
    // Parse JSON fields
    const parsedProducts = products.map(p => ({
      ...p,
      specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
    
    res.json(parsedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?',
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

// ============================================
// ADMIN ENDPOINTS (require authentication)
// ============================================

// Get all products (including inactive) - admin
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM products';
    const params = [];
    
    if (category && validCategories.includes(category)) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, sort_order, name';
    
    const [products] = await db.query(query, params);
    
    const parsedProducts = products.map(p => ({
      ...p,
      specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
    
    res.json(parsedProducts);
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Create new product - admin
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { 
      id, name, brand, category, base_price, 
      description, specs, features, is_active, sort_order 
    } = req.body;
    
    // Validate required fields
    if (!id || !name || !brand || !category || base_price === undefined) {
      return res.status(400).json({ error: 'Vereiste velden ontbreken' });
    }
    
    // Validate category
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Ongeldige categorie' });
    }
    
    // Check if ID already exists
    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Product ID bestaat al' });
    }
    
    await db.query(
      `INSERT INTO products (id, name, brand, category, base_price, description, specs, features, is_active, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        brand,
        category,
        base_price,
        description || null,
        JSON.stringify(specs || {}),
        JSON.stringify(features || []),
        is_active !== false,
        sort_order || 0
      ]
    );
    
    res.status(201).json({ message: 'Product aangemaakt', id });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update product - admin
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, brand, category, base_price, 
      description, specs, features, is_active, sort_order 
    } = req.body;
    
    // Check if product exists
    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product niet gevonden' });
    }
    
    // Validate category if provided
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Ongeldige categorie' });
    }
    
    await db.query(
      `UPDATE products SET 
        name = COALESCE(?, name),
        brand = COALESCE(?, brand),
        category = COALESCE(?, category),
        base_price = COALESCE(?, base_price),
        description = COALESCE(?, description),
        specs = COALESCE(?, specs),
        features = COALESCE(?, features),
        is_active = COALESCE(?, is_active),
        sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [
        name,
        brand,
        category,
        base_price,
        description,
        specs ? JSON.stringify(specs) : null,
        features ? JSON.stringify(features) : null,
        is_active,
        sort_order,
        id
      ]
    );
    
    res.json({ message: 'Product bijgewerkt' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete product - admin
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get product to check for image
    const [products] = await db.query('SELECT image_url FROM products WHERE id = ?', [id]);
    
    if (products.length > 0 && products[0].image_url) {
      // Try to delete image file
      const imagePath = products[0].image_url;
      if (imagePath.startsWith('/uploads/') && fs.existsSync('.' + imagePath)) {
        fs.unlinkSync('.' + imagePath);
      }
    }
    
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    
    res.json({ message: 'Product verwijderd' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Toggle product active status - admin
router.patch('/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE products SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
    
    const [products] = await db.query('SELECT is_active FROM products WHERE id = ?', [id]);
    
    res.json({ 
      message: 'Status bijgewerkt', 
      is_active: products[0]?.is_active 
    });
  } catch (error) {
    console.error('Error toggling product:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Upload product image - admin
router.post('/:id/image', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Geen afbeelding geüpload' });
    }
    
    // Check if product exists
    const [products] = await db.query('SELECT id, image_url FROM products WHERE id = ?', [id]);
    if (products.length === 0) {
      // Delete uploaded file
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Product niet gevonden' });
    }
    
    // Delete old image if exists
    const oldImage = products[0].image_url;
    if (oldImage && oldImage.startsWith('/uploads/') && fs.existsSync('.' + oldImage)) {
      fs.unlinkSync('.' + oldImage);
    }
    
    // Update product with new image path
    const imageUrl = `/uploads/products/${file.filename}`;
    await db.query(
      'UPDATE products SET image_url = ? WHERE id = ?',
      [imageUrl, id]
    );
    
    res.json({ 
      message: 'Afbeelding geüpload', 
      image_url: imageUrl 
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Delete product image - admin
router.delete('/:id/image', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current image
    const [products] = await db.query('SELECT image_url FROM products WHERE id = ?', [id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product niet gevonden' });
    }
    
    const imageUrl = products[0].image_url;
    if (imageUrl && imageUrl.startsWith('/uploads/') && fs.existsSync('.' + imageUrl)) {
      fs.unlinkSync('.' + imageUrl);
    }
    
    // Clear image_url in database
    await db.query('UPDATE products SET image_url = NULL WHERE id = ?', [id]);
    
    res.json({ message: 'Afbeelding verwijderd' });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// Update sort order for multiple products - admin
router.patch('/sort', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { products } = req.body; // Array of { id, sort_order }
    
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Ongeldige data' });
    }
    
    const updatePromises = products.map(({ id, sort_order }) =>
      db.query('UPDATE products SET sort_order = ? WHERE id = ?', [sort_order, id])
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Volgorde bijgewerkt' });
  } catch (error) {
    console.error('Error updating sort order:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
