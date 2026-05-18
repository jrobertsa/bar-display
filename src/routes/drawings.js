const router = require('express').Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── PUBLIC ───────────────────────────────────────────

router.get('/register/:code', (req, res) => {
  const drawing = db.prepare(`
    SELECT id, name, type, entry_fee, draw_date, status
    FROM drawings WHERE registration_code = ? AND status = 'open'
  `).get(req.params.code.toUpperCase());
  if (!drawing) return res.status(404).json({ error: 'Drawing not found or not open' });
  res.json(drawing);
});

router.post('/register/:code', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) return res.status(400).json({ error: 'Phone must be 10 digits' });

  const drawing = db.prepare('SELECT id, name, status FROM drawings WHERE registration_code = ?')
    .get(req.params.code.toUpperCase());
  if (!drawing) return res.status(404).json({ error: 'Drawing not found' });
  if (drawing.status !== 'open') return res.status(400).json({ error: 'This drawing is closed' });

  try {
    const maxRow = db.prepare(
      'SELECT MAX(CAST(ticket_number AS INTEGER)) as max FROM drawing_entries WHERE drawing_id = ?'
    ).get(drawing.id);
    const ticketNumber = String((maxRow.max || 0) + 1).padStart(4, '0');

    const result = db.prepare(
      'INSERT INTO drawing_entries (drawing_id, ticket_number, name, phone) VALUES (?, ?, ?, ?)'
    ).run(drawing.id, ticketNumber, name.trim(), cleanPhone);
    res.json({ message: 'Successfully entered!', entryId: result.lastInsertRowid, ticketNumber, drawing });
  } catch (err) {
    if (err.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'This phone number has already been entered' });
    res.status(500).json({ error: err.message });
  }
});

// Public — used by display app
router.get('/results/latest', (req, res) => {
  const result = db.prepare(`
    SELECT dr.*, d.name as drawing_name, d.type as drawing_type
    FROM drawing_results dr
    JOIN drawings d ON d.id = dr.drawing_id
    ORDER BY dr.drawn_at DESC LIMIT 1
  `).get();
  res.json(result || null);
});

// ─── ADMIN ────────────────────────────────────────────

router.get('/', auth, (req, res) => {
  const drawings = db.prepare(`
    SELECT d.*,
      COUNT(e.id) as entry_count,
      SUM(CASE WHEN e.has_paid = 1 THEN 1 ELSE 0 END) as paid_count
    FROM drawings d
    LEFT JOIN drawing_entries e ON e.drawing_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `).all();
  res.json(drawings);
});

router.post('/', auth, (req, res) => {
  const { type, name, entry_fee, prize_percentage, draw_date, pool_total } = req.body;
  if (!type || !name) return res.status(400).json({ error: 'Type and name are required' });

  let code;
  let attempts = 0;
  do {
    code = generateCode();
    if (++attempts > 20) return res.status(500).json({ error: 'Could not generate unique code' });
  } while (db.prepare('SELECT id FROM drawings WHERE registration_code = ?').get(code));

  const rollover = parseFloat(pool_total) || 0;
  const result = db.prepare(`
    INSERT INTO drawings (type, name, entry_fee, prize_percentage, draw_date, pool_total, rollover_amount, registration_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(type, name, parseFloat(entry_fee) || 1.00, parseFloat(prize_percentage) || 80.0,
         draw_date || null, rollover, rollover, code);

  res.status(201).json(db.prepare('SELECT * FROM drawings WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', auth, (req, res) => {
  const drawing = db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id);
  if (!drawing) return res.status(404).json({ error: 'Drawing not found' });
  res.json(drawing);
});

router.put('/:id', auth, (req, res) => {
  const { name, entry_fee, prize_percentage, draw_date, status, active } = req.body;
  const existing = db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Drawing not found' });

  db.prepare(`
    UPDATE drawings SET name=?, entry_fee=?, prize_percentage=?, draw_date=?, status=?, active=?
    WHERE id=?
  `).run(
    name ?? existing.name,
    entry_fee !== undefined ? parseFloat(entry_fee) : existing.entry_fee,
    prize_percentage !== undefined ? parseFloat(prize_percentage) : existing.prize_percentage,
    draw_date !== undefined ? draw_date : existing.draw_date,
    status ?? existing.status,
    active !== undefined ? parseInt(active) : existing.active,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id));
});

router.get('/:id/entries', auth, (req, res) => {
  res.json(db.prepare(
    'SELECT * FROM drawing_entries WHERE drawing_id = ? ORDER BY entered_at ASC'
  ).all(req.params.id));
});

router.put('/:id/entries/:entryId/pay', auth, (req, res) => {
  const entry = db.prepare('SELECT * FROM drawing_entries WHERE id = ? AND drawing_id = ?')
    .get(req.params.entryId, req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const newPaid = entry.has_paid ? 0 : 1;
  db.prepare('UPDATE drawing_entries SET has_paid = ?, paid_at = ? WHERE id = ?')
    .run(newPaid, newPaid ? new Date().toISOString() : null, entry.id);

  const drawing = db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id);
  const paidCount = db.prepare(
    'SELECT COUNT(*) as c FROM drawing_entries WHERE drawing_id = ? AND has_paid = 1'
  ).get(req.params.id).c;
  db.prepare('UPDATE drawings SET pool_total = ? WHERE id = ?')
    .run(paidCount * drawing.entry_fee + drawing.rollover_amount, req.params.id);

  res.json(db.prepare('SELECT * FROM drawing_entries WHERE id = ?').get(entry.id));
});

router.post('/:id/draw', auth, (req, res) => {
  const drawing = db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id);
  if (!drawing) return res.status(404).json({ error: 'Drawing not found' });
  if (drawing.status !== 'open') return res.status(400).json({ error: 'Drawing is not open' });

  const entries = db.prepare('SELECT * FROM drawing_entries WHERE drawing_id = ?').all(req.params.id);
  if (!entries.length) return res.status(400).json({ error: 'No entries in this drawing' });

  const selected = entries[Math.floor(Math.random() * entries.length)];
  let insertResult;

  if (selected.has_paid) {
    const prizeAmount = drawing.pool_total * (drawing.prize_percentage / 100);
    const rollover = drawing.pool_total - prizeAmount;
    insertResult = db.prepare(`
      INSERT INTO drawing_results (drawing_id, winner_entry_id, winner_name, winner_phone, pool_total, prize_amount, rollover_amount, no_winner)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(drawing.id, selected.id, selected.name, selected.phone, drawing.pool_total, prizeAmount, rollover);
  } else {
    insertResult = db.prepare(`
      INSERT INTO drawing_results (drawing_id, winner_entry_id, winner_name, winner_phone, pool_total, prize_amount, rollover_amount, no_winner)
      VALUES (?, ?, ?, ?, ?, 0, ?, 1)
    `).run(drawing.id, selected.id, selected.name, selected.phone, drawing.pool_total, drawing.pool_total);
  }

  db.prepare("UPDATE drawings SET status = 'drawn' WHERE id = ?").run(drawing.id);

  const result = db.prepare('SELECT * FROM drawing_results WHERE id = ?').get(insertResult.lastInsertRowid);
  result.drawing_name = drawing.name;
  result.ticket_number = selected.ticket_number;

  req.app.get('io').emit(selected.has_paid ? 'drawing_winner' : 'drawing_no_winner', result);
  res.json(result);
});

router.get('/:id/results', auth, (req, res) => {
  res.json(db.prepare(
    'SELECT * FROM drawing_results WHERE drawing_id = ? ORDER BY drawn_at DESC'
  ).all(req.params.id));
});

router.get('/:id/qrcode', auth, async (req, res) => {
  const drawing = db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id);
  if (!drawing) return res.status(404).json({ error: 'Drawing not found' });

  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  const url = `${origin}/register/${drawing.registration_code}`;

  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    res.json({ qrcode: dataUrl, url });
  } catch {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
