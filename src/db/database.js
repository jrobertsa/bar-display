const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'bar.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    category TEXT,
    image_path TEXT,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS drink_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    category TEXT,
    image_path TEXT,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT,
    image_path TEXT,
    duration INTEGER DEFAULT 8,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    schedule_start TEXT,
    schedule_end TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS drawings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    type              TEXT NOT NULL,
    name              TEXT NOT NULL,
    entry_fee         REAL DEFAULT 1.00,
    prize_percentage  REAL DEFAULT 80.0,
    status            TEXT DEFAULT 'open',
    draw_date         TEXT,
    pool_total        REAL DEFAULT 0.00,
    rollover_amount   REAL DEFAULT 0.00,
    registration_code TEXT UNIQUE,
    active            INTEGER DEFAULT 1,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS drawing_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    drawing_id    INTEGER REFERENCES drawings(id),
    ticket_number TEXT,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL,
    has_paid      INTEGER DEFAULT 0,
    paid_at       DATETIME,
    entered_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(drawing_id, phone)
  );

  CREATE TABLE IF NOT EXISTS drawing_results (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    drawing_id      INTEGER REFERENCES drawings(id),
    winner_entry_id INTEGER REFERENCES drawing_entries(id),
    winner_name     TEXT,
    winner_phone    TEXT,
    pool_total      REAL,
    prize_amount    REAL,
    rollover_amount REAL,
    no_winner       INTEGER DEFAULT 0,
    drawn_at        DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate existing drawing_entries tables that predate ticket_number
try { db.exec('ALTER TABLE drawing_entries ADD COLUMN ticket_number TEXT'); } catch {}

// Default settings
const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);
insertSetting.run('slide_duration', '8');
insertSetting.run('transition_effect', 'fade');
insertSetting.run('happy_hour_start', '16:00');
insertSetting.run('happy_hour_end', '18:00');
insertSetting.run('bar_name', 'My Bar');
insertSetting.run('happy_hour_title', "IT'S HAPPY HOUR!");
insertSetting.run('food_slide_duration', '12');
insertSetting.run('drink_slide_duration', '12');
insertSetting.run('weather_zip', '');
insertSetting.run('show_clock', 'true');
insertSetting.run('show_weather', 'true');

module.exports = db;
