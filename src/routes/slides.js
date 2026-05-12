const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'slide-' + unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET active slides (public - display uses this)
router.get('/', (req, res) => {
  try {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' +
                    now.getMinutes().toString().padStart(2, '0');

    const slides = db.prepare(`
      SELECT * FROM slides
      WHERE active = 1
      AND (schedule_start IS NULL OR schedule_start <= ?)
      AND (schedule_end IS NULL OR schedule_end >= ?)
      ORDER BY sort_order, created_at
    `).all(timeStr, timeStr);

    res.json(slides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all slides (admin)
router.get('/all', authMiddleware, (req, res) => {
  try {
    const slides = db.prepare('SELECT * FROM slides ORDER BY sort_order, created_at').all();
    res.json(slides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create slide
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  const { type, title, duration, sort_order, schedule_start, schedule_end } = req.body;

  if (!type) return res.status(400).json({ error: 'Slide type is required' });

  try {
    const stmt = db.prepare(`
      INSERT INTO slides (type, title, image_path, duration, sort_order, schedule_start, schedule_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      type,
      title || null,
      req.file ? '/uploads/' + req.file.filename : null,
      duration ? parseInt(duration) : 8,
      sort_order ? parseInt(sort_order) : 0,
      schedule_start || null,
      schedule_end || null
    );

    const slide = db.prepare('SELECT * FROM slides WHERE id = ?').get(result.lastInsertRowid);
    req.app.get('io').emit('slides_updated');
    res.status(201).json(slide);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update slide
router.put('/:id', authMiddleware, upload.single('image'), (req, res) => {
  const { type, title, duration, active, sort_order, schedule_start, schedule_end } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM slides WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Slide not found' });

    db.prepare(`
      UPDATE slides SET
        type = ?,
        title = ?,
        image_path = ?,
        duration = ?,
        active = ?,
        sort_order = ?,
        schedule_start = ?,
        schedule_end = ?
      WHERE id = ?
    `).run(
      type || existing.type,
      title !== undefined ? title : existing.title,
      req.file ? '/uploads/' + req.file.filename : existing.image_path,
      duration !== undefined ? parseInt(duration) : existing.duration,
      active !== undefined ? parseInt(active) : existing.active,
      sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
      schedule_start !== undefined ? schedule_start : existing.schedule_start,
      schedule_end !== undefined ? schedule_end : existing.schedule_end,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM slides WHERE id = ?').get(req.params.id);
    req.app.get('io').emit('slides_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE slide
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM slides WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Slide not found' });

    db.prepare('DELETE FROM slides WHERE id = ?').run(req.params.id);
    req.app.get('io').emit('slides_updated');
    res.json({ message: 'Slide deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
