require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { db, UPLOADS_DIR, nextTopPosition } = require('./db');
const { getSetting, setSetting, getLatestVideos } = require('./instagram');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_NAME = process.env.SITE_NAME || 'விழுதுகள் Media';
const SITE_NAME_EN = process.env.SITE_NAME_EN || 'Vizhuthugal Media';
const SITE_TAGLINE = process.env.SITE_TAGLINE || 'மக்கள் பேசும் செய்தி… விழுதுகள் சொல்லும்!';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || 'vizhuthugal-media-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hours
}));

// Make site name + categories available to every view
app.use((req, res, next) => {
  res.locals.SITE_NAME = SITE_NAME;
  res.locals.SITE_NAME_EN = SITE_NAME_EN;
  res.locals.SITE_TAGLINE = SITE_TAGLINE;
  res.locals.categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  res.locals.isAdmin = !!(req.session && req.session.adminId);
  res.locals.SOCIAL_INSTAGRAM = getSetting('social_instagram_url', '');
  res.locals.SOCIAL_FACEBOOK = getSetting('social_facebook_url', '');
  res.locals.SOCIAL_YOUTUBE = getSetting('social_youtube_url', '');
  next();
});

// ---------- Image upload config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|gif/.test(file.mimetype);
    cb(ok ? null : new Error('படங்கள் மட்டுமே (jpg/png/webp/gif) அனுமதிக்கப்படும்'), ok);
  }
});

// ---------- Helpers ----------
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/admin/login');
}

function makeUniqueSlug(title, excludeId) {
  let base = slugify(title, { lower: true, strict: true, trim: true }) || 'article';
  let candidate = base;
  let i = 1;
  const exists = (s) => {
    const row = excludeId
      ? db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(s, excludeId)
      : db.prepare('SELECT id FROM articles WHERE slug = ?').get(s);
    return !!row;
  };
  while (exists(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

function toParagraphs(text) {
  return (text || '')
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br>').trim()}</p>`)
    .join('\n');
}
app.locals.toParagraphs = toParagraphs;

// A banner slot is "active" only when it has both an uploaded image and is
// toggled on. Returns null when the slot shouldn't render.
function getBanner(slot) {
  const active = getSetting(`banner_${slot}_active`) === '1';
  const image = getSetting(`banner_${slot}_image`);
  if (!active || !image) return null;
  return {
    image,
    link: getSetting(`banner_${slot}_link`, '') || null
  };
}

// =====================================================
// PUBLIC ROUTES
// =====================================================

app.get('/', async (req, res) => {
  const top = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug
    FROM articles a LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.published = 1
    ORDER BY a.position ASC, a.created_at DESC
    LIMIT 15
  `).all();

  const heroMain = top[0] || null;
  const heroSide = top.slice(1, 3);
  const rest = top.slice(3);

  let igVideos = [];
  try {
    igVideos = await getLatestVideos(6);
  } catch (e) {
    console.error('[instagram] homepage fetch error:', e.message);
  }

  const banners = {
    top: getBanner('top'),
    infeed: getBanner('infeed')
  };

  res.render('index', { heroMain, heroSide, rest, igVideos, banners });
});

app.get('/category/:slug', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!category) return res.status(404).render('404');

  const articles = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug
    FROM articles a LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.published = 1 AND a.category_id = ?
    ORDER BY a.created_at DESC
  `).all(category.id);

  res.render('category', { category, articles });
});

app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  let articles = [];
  if (q) {
    articles = db.prepare(`
      SELECT a.*, c.name AS category_name, c.slug AS category_slug
      FROM articles a LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.published = 1 AND (a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)
      ORDER BY a.created_at DESC
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  res.render('search', { q, articles });
});

app.get('/article/:slug', (req, res) => {
  const article = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug
    FROM articles a LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.slug = ? AND a.published = 1
  `).get(req.params.slug);

  if (!article) return res.status(404).render('404');

  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(article.id);

  const related = db.prepare(`
    SELECT * FROM articles
    WHERE category_id = ? AND id != ? AND published = 1
    ORDER BY created_at DESC LIMIT 4
  `).all(article.category_id, article.id);

  res.render('article', { article, related, banner: getBanner('article') });
});

// =====================================================
// ADMIN ROUTES
// =====================================================

app.get('/admin/login', (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password || '', admin.password_hash)) {
    return res.render('admin/login', { error: 'தவறான பயனர்பெயர் அல்லது கடவுச்சொல்' });
  }
  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  res.redirect('/admin');
});

app.post('/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAdmin, (req, res) => {
  const articles = db.prepare(`
    SELECT a.*, c.name AS category_name
    FROM articles a LEFT JOIN categories c ON a.category_id = c.id
    ORDER BY a.created_at DESC
  `).all();
  res.render('admin/dashboard', { articles, adminUsername: req.session.adminUsername });
});

// ---- Article create/edit ----
app.get('/admin/articles/new', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  res.render('admin/article-form', { article: null, categories, error: null });
});

app.post('/admin/articles/new', requireAdmin, upload.single('image'), (req, res) => {
  const { title, summary, content, category_id, published } = req.body;
  if (!title || !content) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    return res.render('admin/article-form', { article: req.body, categories, error: 'தலைப்பு மற்றும் உள்ளடக்கம் அவசியம்' });
  }
  const slug = makeUniqueSlug(title);
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const position = nextTopPosition();
  db.prepare(`
    INSERT INTO articles (title, slug, summary, content, image, category_id, published, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, slug, summary || '', content, image, category_id || null, published ? 1 : 0, position);
  res.redirect('/admin');
});

app.get('/admin/articles/:id/edit', requireAdmin, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.redirect('/admin');
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  res.render('admin/article-form', { article, categories, error: null });
});

app.post('/admin/articles/:id/edit', requireAdmin, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.redirect('/admin');

  const { title, summary, content, category_id, published } = req.body;
  if (!title || !content) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    return res.render('admin/article-form', { article: { ...existing, ...req.body }, categories, error: 'தலைப்பு மற்றும் உள்ளடக்கம் அவசியம்' });
  }

  let slug = existing.slug;
  if (title !== existing.title) slug = makeUniqueSlug(title, existing.id);

  let image = existing.image;
  if (req.file) {
    image = `/uploads/${req.file.filename}`;
    // remove old file if present
    if (existing.image) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(existing.image));
      fs.unlink(oldPath, () => {});
    }
  }

  db.prepare(`
    UPDATE articles SET title=?, slug=?, summary=?, content=?, image=?, category_id=?, published=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, slug, summary || '', content, image, category_id || null, published ? 1 : 0, existing.id);

  res.redirect('/admin');
});

app.post('/admin/articles/:id/delete', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (existing) {
    if (existing.image) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(existing.image));
      fs.unlink(oldPath, () => {});
    }
    db.prepare('DELETE FROM articles WHERE id = ?').run(existing.id);
  }
  res.redirect('/admin');
});

// ---- Categories management ----
app.get('/admin/categories', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  res.render('admin/categories', { categories, error: null });
});

app.post('/admin/categories/new', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (name && name.trim()) {
    const slug = makeCategorySlug(name.trim());
    try {
      db.prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)').run(name.trim(), slug, 999);
    } catch (e) { /* duplicate ignored */ }
  }
  res.redirect('/admin/categories');
});

function makeCategorySlug(name) {
  let base = slugify(name, { lower: true, strict: true, trim: true }) || 'category';
  let candidate = base, i = 1;
  while (db.prepare('SELECT id FROM categories WHERE slug = ?').get(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

app.post('/admin/categories/:id/delete', requireAdmin, (req, res) => {
  const inUse = db.prepare('SELECT COUNT(*) AS c FROM articles WHERE category_id = ?').get(req.params.id).c;
  if (inUse === 0) {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  }
  res.redirect('/admin/categories');
});

// ---- Social media & Instagram settings ----
app.get('/admin/social', requireAdmin, (req, res) => {
  const tokenSavedAt = getSetting('ig_token_updated_at');
  res.render('admin/social', {
    instagram_url: getSetting('social_instagram_url', ''),
    facebook_url: getSetting('social_facebook_url', ''),
    youtube_url: getSetting('social_youtube_url', ''),
    ig_user_present: !!getSetting('ig_access_token'),
    ig_token_saved_at: tokenSavedAt ? new Date(parseInt(tokenSavedAt, 10)).toLocaleDateString('ta-IN') : null,
    saved: null
  });
});

app.post('/admin/social', requireAdmin, (req, res) => {
  const { instagram_url, facebook_url, youtube_url, ig_access_token } = req.body;
  setSetting('social_instagram_url', (instagram_url || '').trim());
  setSetting('social_facebook_url', (facebook_url || '').trim());
  setSetting('social_youtube_url', (youtube_url || '').trim());
  if (ig_access_token && ig_access_token.trim()) {
    setSetting('ig_access_token', ig_access_token.trim());
    setSetting('ig_token_updated_at', String(Date.now()));
  }

  const tokenSavedAt = getSetting('ig_token_updated_at');
  res.render('admin/social', {
    instagram_url: getSetting('social_instagram_url', ''),
    facebook_url: getSetting('social_facebook_url', ''),
    youtube_url: getSetting('social_youtube_url', ''),
    ig_user_present: !!getSetting('ig_access_token'),
    ig_token_saved_at: tokenSavedAt ? new Date(parseInt(tokenSavedAt, 10)).toLocaleDateString('ta-IN') : null,
    saved: 'சேமிக்கப்பட்டது'
  });
});

// ---- Homepage order (manual placement) ----
app.get('/admin/homepage-order', requireAdmin, (req, res) => {
  const articles = db.prepare(`
    SELECT a.*, c.name AS category_name
    FROM articles a LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.published = 1
    ORDER BY a.position ASC, a.created_at DESC
  `).all();
  res.render('admin/homepage-order', { articles });
});

app.post('/admin/homepage-order/move', requireAdmin, (req, res) => {
  const { id, direction } = req.body;
  const ordered = db.prepare(`
    SELECT id, position FROM articles WHERE published = 1 ORDER BY position ASC, created_at DESC
  `).all();

  const idx = ordered.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return res.redirect('/admin/homepage-order');

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ordered.length) return res.redirect('/admin/homepage-order');

  const a = ordered[idx];
  const b = ordered[swapIdx];
  const update = db.prepare('UPDATE articles SET position = ? WHERE id = ?');
  const swap = db.transaction(() => {
    update.run(b.position, a.id);
    update.run(a.position, b.id);
  });
  swap();

  res.redirect('/admin/homepage-order');
});

// ---- Banner ads ----
const BANNER_SLOTS = {
  top: { label: 'முகப்பு மேல் பகுதி (Top of homepage)', size: '1200 × 150 px' },
  infeed: { label: 'செய்திகளுக்கு நடுவே (Between news grid & Instagram)', size: '1200 × 150 px' },
  article: { label: 'செய்தி பக்கம் (Below article content)', size: '336 × 280 px' }
};

app.get('/admin/banners', requireAdmin, (req, res) => {
  const slots = Object.entries(BANNER_SLOTS).map(([key, meta]) => ({
    key,
    ...meta,
    image: getSetting(`banner_${key}_image`),
    link: getSetting(`banner_${key}_link`, ''),
    active: getSetting(`banner_${key}_active`) === '1'
  }));
  res.render('admin/banners', { slots, saved: null });
});

app.post('/admin/banners',
  requireAdmin,
  upload.fields(Object.keys(BANNER_SLOTS).map(key => ({ name: `banner_${key}`, maxCount: 1 }))),
  (req, res) => {
    Object.keys(BANNER_SLOTS).forEach(key => {
      const file = req.files && req.files[`banner_${key}`] && req.files[`banner_${key}`][0];
      if (file) {
        const oldImage = getSetting(`banner_${key}_image`);
        if (oldImage) {
          const oldPath = path.join(UPLOADS_DIR, path.basename(oldImage));
          fs.unlink(oldPath, () => {});
        }
        setSetting(`banner_${key}_image`, `/uploads/${file.filename}`);
      }
      setSetting(`banner_${key}_link`, (req.body[`link_${key}`] || '').trim());
      setSetting(`banner_${key}_active`, req.body[`active_${key}`] ? '1' : '0');
    });

    const slots = Object.entries(BANNER_SLOTS).map(([key, meta]) => ({
      key,
      ...meta,
      image: getSetting(`banner_${key}_image`),
      link: getSetting(`banner_${key}_link`, ''),
      active: getSetting(`banner_${key}_active`) === '1'
    }));
    res.render('admin/banners', { slots, saved: 'சேமிக்கப்பட்டது' });
  }
);

// ---- Responsive device preview ----
app.get('/admin/preview', requireAdmin, (req, res) => {
  res.render('admin/preview');
});

// ---- Change password ----
app.get('/admin/password', requireAdmin, (req, res) => {
  res.render('admin/password', { error: null, success: null });
});

app.post('/admin/password', requireAdmin, (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!bcrypt.compareSync(current_password || '', admin.password_hash)) {
    return res.render('admin/password', { error: 'தற்போதைய கடவுச்சொல் தவறு', success: null });
  }
  if (!new_password || new_password.length < 6) {
    return res.render('admin/password', { error: 'புதிய கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்', success: null });
  }
  if (new_password !== confirm_password) {
    return res.render('admin/password', { error: 'கடவுச்சொற்கள் பொருந்தவில்லை', success: null });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  res.render('admin/password', { error: null, success: 'கடவுச்சொல் மாற்றப்பட்டது' });
});

// 404
app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`Vizhuthugal Media running on port ${PORT}`);
});
