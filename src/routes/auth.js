const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const auth = require('../middleware/auth');

// Register (run this once to create your admin user, then you can disable it)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    stmt.run(username, hashed);
    res.json({ message: 'User created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all users
router.get('/users', auth, (req, res) => {
  const users = db.prepare('SELECT id, username, created_at FROM users ORDER BY created_at ASC').all();
  res.json(users);
});

// Create user
router.post('/users', auth, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed);
    res.json({ id: Number(result.lastInsertRowid), username });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update user (password optional — omit to keep current)
router.put('/users/:id', auth, async (req, res) => {
  const { username, password } = req.body;
  const id = parseInt(req.params.id);
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  try {
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET username = ?, password = ? WHERE id = ?').run(username, hashed, id);
    } else {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id);
    }
    res.json({ message: 'User updated' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete user (cannot delete yourself or the last user)
router.delete('/users/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last admin user' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
