const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/projects - Public: visible projects
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM projects WHERE is_visible = TRUE ORDER BY sort_order ASC, completion_date DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Kon projecten niet ophalen' });
  }
});

// GET /api/projects/admin/all - Admin: all projects
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching admin projects:', err);
    res.status(500).json({ error: 'Kon projecten niet ophalen' });
  }
});

// POST /api/projects - Create project
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, location, completion_date, photos, is_visible, sort_order } = req.body;
    const [result] = await db.query(
      'INSERT INTO projects (title, description, category, location, completion_date, photos, is_visible, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description || null, category || 'airco', location || null, completion_date || null, JSON.stringify(photos || []), is_visible !== false, sort_order || 0]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Kon project niet aanmaken' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, location, completion_date, photos, is_visible, sort_order } = req.body;
    await db.query(
      'UPDATE projects SET title=?, description=?, category=?, location=?, completion_date=?, photos=?, is_visible=?, sort_order=? WHERE id=?',
      [title, description || null, category || 'airco', location || null, completion_date || null, JSON.stringify(photos || []), is_visible !== false, sort_order || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Kon project niet bijwerken' });
  }
});

// PATCH /api/projects/:id/toggle - Toggle visibility
router.patch('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT is_visible FROM projects WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project niet gevonden' });
    const newVisibility = !rows[0].is_visible;
    await db.query('UPDATE projects SET is_visible = ? WHERE id = ?', [newVisibility, req.params.id]);
    res.json({ is_visible: newVisibility });
  } catch (err) {
    console.error('Error toggling project:', err);
    res.status(500).json({ error: 'Kon zichtbaarheid niet wijzigen' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Kon project niet verwijderen' });
  }
});

// POST /api/projects/:id/image - Upload project image
router.post('/:id/image', authMiddleware, async (req, res) => {
  try {
    // Use multer from upload route pattern
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    
    const uploadDir = path.join(__dirname, '..', 'uploads', 'projects');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });
    
    const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single('image');
    
    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: 'Upload mislukt' });
      if (!req.file) return res.status(400).json({ error: 'Geen bestand' });
      
      const imageUrl = `/uploads/projects/${req.file.filename}`;
      
      // Add to photos array
      const [rows] = await db.query('SELECT photos FROM projects WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Project niet gevonden' });
      
      let photos = [];
      try { photos = JSON.parse(rows[0].photos || '[]'); } catch { photos = []; }
      photos.push(imageUrl);
      
      await db.query('UPDATE projects SET photos = ? WHERE id = ?', [JSON.stringify(photos), req.params.id]);
      res.json({ image_url: imageUrl, photos });
    });
  } catch (err) {
    console.error('Error uploading project image:', err);
    res.status(500).json({ error: 'Upload mislukt' });
  }
});

module.exports = router;
