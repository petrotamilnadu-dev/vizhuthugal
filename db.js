const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// DATA_DIR should point to a persistent disk in production (Render).
// Locally / by default it just uses ./data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'news.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  image TEXT,
  category_id INTEGER,
  published INTEGER DEFAULT 1,
  position INTEGER,
  pinned INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// Migration safety net: if articles table already existed (from an earlier
// deploy) without the newer 'position' column, add it without touching data.
const articleCols = db.prepare("PRAGMA table_info(articles)").all().map(c => c.name);
if (!articleCols.includes('position')) {
  db.exec('ALTER TABLE articles ADD COLUMN position INTEGER');
  console.log('[setup] Added missing "position" column to articles table.');
}
if (!articleCols.includes('pinned')) {
  db.exec('ALTER TABLE articles ADD COLUMN pinned INTEGER DEFAULT 0');
  console.log('[setup] Added missing "pinned" column to articles table.');
}

// Backfill position for any existing articles that don't have one yet, so
// homepage ordering is always well-defined (newest = lowest position = top).
const unpositioned = db.prepare('SELECT id FROM articles WHERE position IS NULL ORDER BY created_at DESC').all();
if (unpositioned.length) {
  const minRow = db.prepare('SELECT MIN(position) AS m FROM articles').get();
  let next = (minRow.m === null ? 0 : minRow.m) - 1;
  const stmt = db.prepare('UPDATE articles SET position = ? WHERE id = ?');
  unpositioned.forEach(row => { stmt.run(next, row.id); next -= 1; });
}

// Seed default admin if none exists
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminCount === 0) {
  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASS || 'ChangeMe@123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`[setup] Default admin created -> username: ${username} / password: ${password}`);
  console.log('[setup] Please log in and change this, or set ADMIN_USER / ADMIN_PASS env vars.');
}

// Seed default categories if none exist
const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
if (catCount === 0) {
  const defaults = ['செய்திகள்', 'அரசியல்', 'சினிமா', 'விளையாட்டு', 'வணிகம்', 'உள்ளூர்', 'தொழில்நுட்பம்'];
  const slugs = ['news', 'politics', 'cinema', 'sports', 'business', 'local', 'tech'];
  const stmt = db.prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)');
  defaults.forEach((name, i) => stmt.run(name, slugs[i], i));
  console.log('[setup] Default categories created.');
}

// Seed default social links if not already set
const settingStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
settingStmt.run('social_instagram_url', 'https://www.instagram.com/vizhuthugalmedia/');
settingStmt.run('social_facebook_url', 'https://www.facebook.com/Vizuthugal');
settingStmt.run('social_youtube_url', 'https://www.youtube.com/@VizhuthugalMedia');

// Returns a position value lower than any existing article's, so a newly
// created article lands at the top of the homepage order by default.
function nextTopPosition() {
  const row = db.prepare('SELECT MIN(position) AS m FROM articles').get();
  return (row.m === null ? 0 : row.m) - 1;
}

module.exports = { db, DATA_DIR, UPLOADS_DIR, nextTopPosition };
