const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const logger = require('../services/logger');
const { convertFilesToWebp } = require('../services/imageOptimizer');

const router = express.Router();

// Rate limiting for public upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Te veel uploads. Probeer het later opnieuw.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'general';
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = path.join(uploadDir, safeCategory);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024
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

// Upload photos for quote request
router.post('/quote/:quoteId', uploadLimiter, upload.array('photos', 10), async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { category } = req.body;
    const files = req.files;

    if (!/^\d+$/.test(quoteId)) {
      return res.status(400).json({ error: 'Ongeldig offerte ID' });
    }

    const [quotes] = await db.query(
      'SELECT id, created_at FROM quote_requests WHERE id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [quoteId]
    );
    
    if (quotes.length === 0) {
      return res.status(404).json({ error: 'Offerte niet gevonden of te oud voor uploads' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Geen bestanden geüpload' });
    }

    // Converteer naar WebP voor kleinere bestanden + sneller laden
    await convertFilesToWebp(files, { quality: 82, maxWidth: 2400 });

    const insertPromises = files.map(file => {
      return db.query(
        'INSERT INTO quote_photos (quote_request_id, category, file_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
        [quoteId, category, file.originalname, file.path, file.size, file.mimetype]
      );
    });

    await Promise.all(insertPromises);

    logger.info('UPLOAD', `${files.length} photo(s) uploaded for quote ${quoteId}`, { quoteId, count: files.length });

    res.status(201).json({ 
      message: `${files.length} foto(s) geüpload`,
      files: files.map(f => ({
        filename: f.filename,
        path: f.path
      }))
    });
  } catch (error) {
    logger.error('UPLOAD', 'Upload error', { error: error.message });
    res.status(500).json({ error: 'Upload mislukt' });
  }
});

// Delete photo (admin)
router.delete('/:photoId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { photoId } = req.params;

    const [photos] = await db.query(
      'SELECT file_path FROM quote_photos WHERE id = ?',
      [photoId]
    );

    if (photos.length > 0) {
      const filePath = photos[0].file_path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.query('DELETE FROM quote_photos WHERE id = ?', [photoId]);

    res.json({ message: 'Foto verwijderd' });
  } catch (error) {
    logger.error('UPLOAD', 'Error deleting photo', { error: error.message });
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
