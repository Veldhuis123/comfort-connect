const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for public upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 uploads per IP per 15 min
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
    // Sanitize category to prevent path traversal
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = path.join(uploadDir, safeCategory);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize original filename extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
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

// Upload photos for quote request (public but protected by rate limiting and quote verification)
router.post('/quote/:quoteId', uploadLimiter, upload.array('photos', 10), async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { category } = req.body;
    const files = req.files;

    // Validate quoteId is a number
    if (!/^\d+$/.test(quoteId)) {
      return res.status(400).json({ error: 'Ongeldig offerte ID' });
    }

    // Verify the quote exists and was recently created (within last hour)
    const [quotes] = await db.query(
      'SELECT id, created_at FROM quote_requests WHERE id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [quoteId]
    );
    
    if (quotes.length === 0) {
      return res.status(404).json({ error: 'Offerte niet gevonden of te oud voor uploads' });
    }
  try {
    const { quoteId } = req.params;
    const { category } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Geen bestanden geüpload' });
    }

    const insertPromises = files.map(file => {
      return db.query(
        'INSERT INTO quote_photos (quote_request_id, category, file_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
        [quoteId, category, file.originalname, file.path, file.size, file.mimetype]
      );
    });

    await Promise.all(insertPromises);

    res.status(201).json({ 
      message: `${files.length} foto(s) geüpload`,
      files: files.map(f => ({
        filename: f.filename,
        path: f.path
      }))
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload mislukt' });
  }
});

// Delete photo (admin)
router.delete('/:photoId', authMiddleware, async (req, res) => {
  try {
    const { photoId } = req.params;

    // Get file path
    const [photos] = await db.query(
      'SELECT file_path FROM quote_photos WHERE id = ?',
      [photoId]
    );

    if (photos.length > 0) {
      // Delete file from disk
      const filePath = photos[0].file_path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await db.query('DELETE FROM quote_photos WHERE id = ?', [photoId]);

    res.json({ message: 'Foto verwijderd' });
  } catch (error) {
    res.status(500).json({ error: 'Server fout' });
  }
});

module.exports = router;
