const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'food-' + unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET all active food items (public - display uses this)
router.get('/', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT * FROM food_items WHERE active = 1 ORDER BY category, sort_order, name
    `).all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all food items including inactive (admin only)
router.get('/all', authMiddleware, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT * FROM food_items ORDER BY category, sort_order, name
    `).all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new food item
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  const { name, description, price, category, sort_order } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO food_items (name, description, price, category, image_path, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name,
      description || null,
      price ? parseFloat(price) : null,
      category || null,
      req.file ? '/uploads/' + req.file.filename : null,
      sort_order ? parseInt(sort_order) : 0
    );

    const item = db.prepare('SELECT * FROM food_items WHERE id = ?').get(result.lastInsertRowid);

    // Notify display clients of update
    req.app.get('io').emit('menu_updated', { type: 'food' });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update food item
router.put('/:id', authMiddleware, upload.single('image'), (req, res) => {
  const { name, description, price, category, active, sort_order } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM food_items WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const stmt = db.prepare(`
      UPDATE food_items SET
        name = ?,
        description = ?,
        price = ?,
        category = ?,
        image_path = ?,
        active = ?,
        sort_order = ?
      WHERE id = ?
    `);
    stmt.run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      price !== undefined ? parseFloat(price) : existing.price,
      category !== undefined ? category : existing.category,
      req.file ? '/uploads/' + req.file.filename : existing.image_path,
      active !== undefined ? parseInt(active) : existing.active,
      sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM food_items WHERE id = ?').get(req.params.id);
    req.app.get('io').emit('menu_updated', { type: 'food' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE food item
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM food_items WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    db.prepare('DELETE FROM food_items WHERE id = ?').run(req.params.id);
    req.app.get('io').emit('menu_updated', { type: 'food' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
