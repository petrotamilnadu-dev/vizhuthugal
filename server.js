require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db, UPLOADS_DIR, nextTopPosition } = require('./db');
const { getSetting, setSetting } = require('./settings');
const { getLatestVideos: getInstagramVideos } = require('./instagram');
const { getLatestVideos: getYoutubeVideos, getVideoInfo, getLiveVideo, extractVideoId: extractYoutubeId } = require('./youtube');
const { watermarkImage } = require('./watermark');

const app = express();
app.set('trust proxy', 1); // needed on Render so req.protocol reports https correctly (for og:image URLs etc.)
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
  if (res.locals.isAdmin) {
    res.locals.PENDING_COMMENTS_COUNT = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE approved = 0').get().c;
  }
  res.locals.SOCIAL_INSTAGRAM = getSetting('social_instagram_url', '');
  res.locals.SOCIAL_FACEBOOK = getSetting('social_facebook_url', '');
  res.locals.SOCIAL_YOUTUBE = getSetting('social_youtube_url', '');
  res.locals.RATE_GOLD = getSetting('rate_gold', '');
  res.locals.RATE_SILVER = getSetting('rate_silver', '');
  res.locals.RATE_GOLD_PAVUN = res.locals.RATE_GOLD ? (parseFloat(res.locals.RATE_GOLD) * 8).toLocaleString('en-IN') : '';
  res.locals.RATE_SILVER_KG = res.locals.RATE_SILVER ? (parseFloat(res.locals.RATE_SILVER) * 1000).toLocaleString('en-IN') : '';
  const rateUpdatedAt = getSetting('rate_updated_at');
  res.locals.RATE_UPDATED = rateUpdatedAt
    ? new Date(rateUpdatedAt).toLocaleDateString('ta-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  res.locals.LATEST_HEADLINES = db.prepare('SELECT title, slug FROM articles WHERE published = 1 ORDER BY created_at DESC LIMIT 6').all();
  res.locals.SITE_URL = `${req.protocol}://${req.get('host')}`;
  res.locals.CURRENT_URL = res.locals.SITE_URL + req.originalUrl;
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
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|gif|avif/.test(file.mimetype);
    cb(ok ? null : new Error('படங்கள் மட்டுமே (jpg/png/webp/gif/avif) அனுமதிக்கப்படும்'), ok);
  }
});

// ---------- Helpers ----------
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/admin/login');
}

// Builds a URL-safe slug that keeps the original script (Tamil, English,
// whatever) instead of transliterating/stripping it — so a Tamil headline
// gets a readable Tamil URL instead of falling back to a generic word.
function slugifyText(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeUniqueSlug(title, excludeId) {
  let base = slugifyText(title) || 'news';
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

// Splits content into paragraphs (same rule as toParagraphs) and spreads
// any gallery images evenly through the gaps between them — so an article
// with several uploaded images shows them woven through the text instead
// of all bunched at the top.
function renderContentWithImages(text, images) {
  const paragraphs = (text || '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  if (!images || images.length === 0) {
    return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
  }

  const gap = Math.max(1, Math.ceil(paragraphs.length / (images.length + 1)));
  let html = '';
  let imgIdx = 0;
  paragraphs.forEach((p, i) => {
    html += `<p>${p.replace(/\n/g, '<br>')}</p>\n`;
    if ((i + 1) % gap === 0 && imgIdx < images.length) {
      html += `<img src="${images[imgIdx].image}" alt="" class="article-inline-image" loading="lazy">\n`;
      imgIdx++;
    }
  });
  while (imgIdx < images.length) {
    html += `<img src="${images[imgIdx].image}" alt="" class="article-inline-image" loading="lazy">\n`;
    imgIdx++;
  }
  return html;
}
app.locals.renderContentWithImages = renderContentWithImages;

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
    ORDER BY a.pinned DESC, a.position ASC, a.created_at DESC
    LIMIT 15
  `).all();

  const heroMain = top[0] || null;
  const heroSide = top.slice(1, 3);
  const rest = top.slice(3);

  let igVideos = [];
  try {
    igVideos = await getInstagramVideos(6);
  } catch (e) {
    console.error('[instagram] homepage fetch error:', e.message);
  }

  const banners = {
    top: getBanner('top'),
    infeed: getBanner('infeed')
  };

  let liveVideo = null;
  try {
    liveVideo = await getLiveVideo();
  } catch (e) {
    console.error('[youtube] live check error:', e.message);
  }

  let featuredVideo = null;
  const featuredVideoId = getSetting('featured_youtube_video_id');
  if (featuredVideoId && !liveVideo) {
    try {
      featuredVideo = await getVideoInfo(featuredVideoId);
    } catch (e) {
      console.error('[youtube] featured video fetch error:', e.message);
    }
  }

  res.render('index', { heroMain, heroSide, rest, igVideos, banners, liveVideo, featuredVideo });
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

app.get('/videos', async (req, res) => {
  let videos = [];
  try {
    videos = await getYoutubeVideos(24);
  } catch (e) {
    console.error('[youtube] /videos fetch error:', e.message);
  }
  res.render('videos', { videos });
});

app.get('/rates', (req, res) => {
  const gold = getSetting('rate_gold');
  const silver = getSetting('rate_silver');
  const updatedAt = getSetting('rate_updated_at');
  const goldNum = gold ? parseFloat(gold) : null;
  const silverNum = silver ? parseFloat(silver) : null;
  const today = new Date().toISOString().slice(0, 10);

  const historyRows = db.prepare(`
    SELECT * FROM rate_history WHERE date != ? ORDER BY date DESC LIMIT 20
  `).all(today);

  const history = historyRows.map(row => ({
    date: new Date(row.date).toLocaleDateString('ta-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    gold: row.gold,
    silver: row.silver,
    goldDiff: (goldNum !== null && row.gold !== null) ? Math.round((goldNum - row.gold) * 100) / 100 : null,
    silverDiff: (silverNum !== null && row.silver !== null) ? Math.round((silverNum - row.silver) * 100) / 100 : null
  }));

  res.render('rates', {
    gold,
    silver,
    goldPavun: gold ? (parseFloat(gold) * 8).toLocaleString('en-IN') : null,
    updated: updatedAt
      ? new Date(updatedAt).toLocaleDateString('ta-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null,
    history
  });
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

app.get('/news/:slug', async (req, res) => {
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

  const comments = db.prepare(`
    SELECT * FROM comments WHERE article_id = ? AND approved = 1 ORDER BY created_at ASC
  `).all(article.id);

  const galleryImages = db.prepare('SELECT * FROM article_images WHERE article_id = ? ORDER BY sort_order').all(article.id);

  let relatedVideo = null;
  if (article.youtube_video_id) {
    try {
      relatedVideo = await getVideoInfo(article.youtube_video_id);
    } catch (e) {
      console.error('[youtube] related video fetch error:', e.message);
    }
  }

  const ogDescription = (article.summary && article.summary.trim())
    || (article.content || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const ogImage = article.image ? (res.locals.SITE_URL + article.image) : undefined;

  res.render('article', {
    article,
    related,
    comments,
    galleryImages,
    relatedVideo,
    commented: req.query.commented || null,
    banner: getBanner('article'),
    ogTitle: article.title,
    ogDescription,
    ogImage,
    ogType: 'article'
  });
});

// A comment is auto-published unless it contains one of the admin's
// banned words (simple case-insensitive substring match) — those get
// held back (approved = 0) for manual review on the Comments admin page.
function containsBannedWord(text) {
  const list = getSetting('banned_words', '');
  if (!list) return false;
  const words = list.split(/[\n,]/).map(w => w.trim().toLowerCase()).filter(Boolean);
  if (!words.length) return false;
  const lower = (text || '').toLowerCase();
  return words.some(w => lower.includes(w));
}

app.post('/news/:slug/comment', (req, res) => {
  const article = db.prepare('SELECT id FROM articles WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!article) return res.status(404).render('404');

  const { name, comment } = req.body;
  let status = null;
  if (name && name.trim() && comment && comment.trim()) {
    const cleanName = name.trim().slice(0, 80);
    const cleanComment = comment.trim().slice(0, 1000);
    const blocked = containsBannedWord(cleanName) || containsBannedWord(cleanComment);
    db.prepare('INSERT INTO comments (article_id, name, comment, approved) VALUES (?, ?, ?, ?)')
      .run(article.id, cleanName, cleanComment, blocked ? 0 : 1);
    status = blocked ? 'blocked' : 'posted';
  }

  res.redirect(`/news/${req.params.slug}?commented=${status || 'skip'}#comments`);
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
  res.render('admin/article-form', { article: null, categories, galleryImages: [], error: null });
});

const articleUpload = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery_images', maxCount: 10 }]);

app.post('/admin/articles/new', requireAdmin, articleUpload, async (req, res) => {
  const { title, summary, content, category_id, published, pinned, youtube_video_url } = req.body;
  if (!title || !content) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    return res.render('admin/article-form', { article: req.body, categories, galleryImages: [], error: 'தலைப்பு மற்றும் உள்ளடக்கம் அவசியம்' });
  }
  const slug = makeUniqueSlug(title);
  const imageFile = req.files && req.files.image && req.files.image[0];
  const image = imageFile ? `/uploads/${imageFile.filename}` : null;
  const position = nextTopPosition();
  const youtubeVideoId = youtube_video_url ? extractYoutubeId(youtube_video_url.trim()) : null;
  const result = db.prepare(`
    INSERT INTO articles (title, slug, summary, content, image, category_id, published, position, pinned, youtube_video_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, slug, summary || '', content, image, category_id || null, published ? 1 : 0, position, pinned ? 1 : 0, youtubeVideoId);

  const galleryFiles = (req.files && req.files.gallery_images) || [];
  if (galleryFiles.length) {
    const insertImg = db.prepare('INSERT INTO article_images (article_id, image, sort_order) VALUES (?, ?, ?)');
    galleryFiles.forEach((f, i) => insertImg.run(result.lastInsertRowid, `/uploads/${f.filename}`, i));
  }

  // Watermark after the DB rows are saved — a slow/failed watermark should
  // never block the article from being published.
  const allNewFiles = [imageFile, ...galleryFiles].filter(Boolean);
  await Promise.all(allNewFiles.map(f => watermarkImage(path.join(UPLOADS_DIR, f.filename))));

  res.redirect('/admin');
});

app.get('/admin/articles/:id/edit', requireAdmin, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.redirect('/admin');
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  const galleryImages = db.prepare('SELECT * FROM article_images WHERE article_id = ? ORDER BY sort_order').all(article.id);
  res.render('admin/article-form', { article, categories, galleryImages, error: null });
});

app.post('/admin/articles/:id/edit', requireAdmin, articleUpload, async (req, res) => {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.redirect('/admin');

  const { title, summary, content, category_id, published, pinned, youtube_video_url } = req.body;
  if (!title || !content) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    const galleryImages = db.prepare('SELECT * FROM article_images WHERE article_id = ? ORDER BY sort_order').all(existing.id);
    return res.render('admin/article-form', { article: { ...existing, ...req.body }, categories, galleryImages, error: 'தலைப்பு மற்றும் உள்ளடக்கம் அவசியம்' });
  }

  let slug = existing.slug;
  if (title !== existing.title) slug = makeUniqueSlug(title, existing.id);

  let image = existing.image;
  const imageFile = req.files && req.files.image && req.files.image[0];
  if (imageFile) {
    image = `/uploads/${imageFile.filename}`;
    // remove old file if present
    if (existing.image) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(existing.image));
      fs.unlink(oldPath, () => {});
    }
  }

  const youtubeVideoId = youtube_video_url && youtube_video_url.trim() ? extractYoutubeId(youtube_video_url.trim()) : null;

  db.prepare(`
    UPDATE articles SET title=?, slug=?, summary=?, content=?, image=?, category_id=?, published=?, pinned=?, youtube_video_id=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, slug, summary || '', content, image, category_id || null, published ? 1 : 0, pinned ? 1 : 0, youtubeVideoId, existing.id);

  // Newly uploaded gallery images are appended after any existing ones.
  const galleryFiles = (req.files && req.files.gallery_images) || [];
  if (galleryFiles.length) {
    const maxRow = db.prepare('SELECT MAX(sort_order) AS m FROM article_images WHERE article_id = ?').get(existing.id);
    let nextOrder = (maxRow.m === null ? -1 : maxRow.m) + 1;
    const insertImg = db.prepare('INSERT INTO article_images (article_id, image, sort_order) VALUES (?, ?, ?)');
    galleryFiles.forEach(f => { insertImg.run(existing.id, `/uploads/${f.filename}`, nextOrder); nextOrder++; });
  }

  const allNewFiles = [imageFile, ...galleryFiles].filter(Boolean);
  await Promise.all(allNewFiles.map(f => watermarkImage(path.join(UPLOADS_DIR, f.filename))));

  res.redirect('/admin');
});

app.post('/admin/articles/:articleId/images/:imageId/delete', requireAdmin, (req, res) => {
  const img = db.prepare('SELECT * FROM article_images WHERE id = ? AND article_id = ?').get(req.params.imageId, req.params.articleId);
  if (img) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(img.image));
    fs.unlink(oldPath, () => {});
    db.prepare('DELETE FROM article_images WHERE id = ?').run(img.id);
  }
  res.redirect(`/admin/articles/${req.params.articleId}/edit`);
});

app.post('/admin/articles/:id/delete', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);

  if (existing) {
    if (existing.image) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(existing.image));
      fs.unlink(oldPath, () => {});
    }
    const galleryImages = db.prepare('SELECT * FROM article_images WHERE article_id = ?').all(existing.id);
    galleryImages.forEach(img => {
      const p = path.join(UPLOADS_DIR, path.basename(img.image));
      fs.unlink(p, () => {});
    });
    db.prepare('DELETE FROM article_images WHERE article_id = ?').run(existing.id);
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
    const maxRow = db.prepare('SELECT MAX(sort_order) AS m FROM categories').get();
    const nextOrder = (maxRow.m === null ? 0 : maxRow.m) + 1;
    try {
      db.prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)').run(name.trim(), slug, nextOrder);
    } catch (e) { /* duplicate ignored */ }
  }
  res.redirect('/admin/categories');
});

app.post('/admin/categories/:id/move', requireAdmin, (req, res) => {
  const { direction } = req.body;
  const ordered = db.prepare('SELECT id, sort_order FROM categories ORDER BY sort_order, name').all();
  const idx = ordered.findIndex(c => String(c.id) === String(req.params.id));
  if (idx === -1) return res.redirect('/admin/categories');

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ordered.length) return res.redirect('/admin/categories');

  const a = ordered[idx];
  const b = ordered[swapIdx];
  const update = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  const swap = db.transaction(() => {
    update.run(b.sort_order, a.id);
    update.run(a.sort_order, b.id);
  });
  swap();

  res.redirect('/admin/categories');
});

function makeCategorySlug(name) {
  let base = slugifyText(name) || 'category';
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
function socialSettingsView() {
  const tokenSavedAt = getSetting('ig_token_updated_at');
  return {
    instagram_url: getSetting('social_instagram_url', ''),
    facebook_url: getSetting('social_facebook_url', ''),
    youtube_url: getSetting('social_youtube_url', ''),
    ig_user_present: !!getSetting('ig_access_token'),
    ig_token_saved_at: tokenSavedAt ? new Date(parseInt(tokenSavedAt, 10)).toLocaleDateString('ta-IN') : null,
    youtube_api_key: getSetting('youtube_api_key', ''),
    youtube_channel_id: getSetting('youtube_channel_id', ''),
    yt_configured: !!(getSetting('youtube_api_key') && getSetting('youtube_channel_id')),
    featured_youtube_video_id: getSetting('featured_youtube_video_id', '')
  };
}

app.get('/admin/social', requireAdmin, (req, res) => {
  res.render('admin/social', { ...socialSettingsView(), saved: null });
});

app.post('/admin/social', requireAdmin, (req, res) => {
  const { instagram_url, facebook_url, youtube_url, ig_access_token, youtube_api_key, youtube_channel_id, featured_youtube_video } = req.body;
  setSetting('social_instagram_url', (instagram_url || '').trim());
  setSetting('social_facebook_url', (facebook_url || '').trim());
  setSetting('social_youtube_url', (youtube_url || '').trim());
  if (ig_access_token && ig_access_token.trim()) {
    setSetting('ig_access_token', ig_access_token.trim());
    setSetting('ig_token_updated_at', String(Date.now()));
  }
  if (youtube_api_key && youtube_api_key.trim()) {
    setSetting('youtube_api_key', youtube_api_key.trim());
  }
  if (youtube_channel_id && youtube_channel_id.trim()) {
    setSetting('youtube_channel_id', youtube_channel_id.trim());
  }
  if (featured_youtube_video !== undefined) {
    const id = extractYoutubeId(featured_youtube_video.trim());
    setSetting('featured_youtube_video_id', id || '');
  }

  res.render('admin/social', { ...socialSettingsView(), saved: 'சேமிக்கப்பட்டது' });
});

// ---- Homepage order (manual placement) ----
app.get('/admin/homepage-order', requireAdmin, (req, res) => {
  const articles = db.prepare(`
    SELECT a.*, c.name AS category_name
    FROM articles a LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.published = 1
    ORDER BY a.pinned DESC, a.position ASC, a.created_at DESC
  `).all();
  res.render('admin/homepage-order', { articles });
});

app.post('/admin/homepage-order/move', requireAdmin, (req, res) => {
  const { id, direction } = req.body;
  const ordered = db.prepare(`
    SELECT id, position, pinned FROM articles WHERE published = 1
    ORDER BY pinned DESC, position ASC, created_at DESC
  `).all();

  const idx = ordered.findIndex(a => String(a.id) === String(id));
  if (idx === -1) return res.redirect('/admin/homepage-order');

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  // Pinned and unpinned articles are separate tiers — never swap across
  // that boundary, so pinned items stay a fixed block at the top.
  if (swapIdx < 0 || swapIdx >= ordered.length || ordered[swapIdx].pinned !== ordered[idx].pinned) {
    return res.redirect('/admin/homepage-order');
  }

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

// ---- Gold/Silver rate belt ----
app.get('/admin/rates', requireAdmin, (req, res) => {
  const updatedAt = getSetting('rate_updated_at');
  res.render('admin/rates', {
    rate_gold: getSetting('rate_gold', ''),
    rate_silver: getSetting('rate_silver', ''),
    rate_updated_at: updatedAt ? new Date(updatedAt).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
    saved: null
  });
});

app.post('/admin/rates', requireAdmin, (req, res) => {
  const { rate_gold, rate_silver } = req.body;
  setSetting('rate_gold', (rate_gold || '').trim());
  setSetting('rate_silver', (rate_silver || '').trim());
  setSetting('rate_updated_at', new Date().toISOString());

  // Record today's rate into history (upsert — multiple saves on the same
  // day just update that day's row rather than creating duplicates).
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO rate_history (date, gold, silver) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET gold = excluded.gold, silver = excluded.silver
  `).run(today, parseFloat(rate_gold) || null, parseFloat(rate_silver) || null);

  const updatedAt = getSetting('rate_updated_at');
  res.render('admin/rates', {
    rate_gold: getSetting('rate_gold', ''),
    rate_silver: getSetting('rate_silver', ''),
    rate_updated_at: updatedAt ? new Date(updatedAt).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
    saved: 'சேமிக்கப்பட்டது'
  });
});

// ---- Comments moderation ----
app.get('/admin/comments', requireAdmin, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, a.title AS article_title, a.slug AS article_slug
    FROM comments c LEFT JOIN articles a ON c.article_id = a.id
    ORDER BY c.approved ASC, c.created_at DESC
  `).all();
  res.render('admin/comments', { comments, bannedWords: getSetting('banned_words', ''), saved: null });
});

app.post('/admin/comments/banned-words', requireAdmin, (req, res) => {
  setSetting('banned_words', (req.body.banned_words || '').trim());
  const comments = db.prepare(`
    SELECT c.*, a.title AS article_title, a.slug AS article_slug
    FROM comments c LEFT JOIN articles a ON c.article_id = a.id
    ORDER BY c.approved ASC, c.created_at DESC
  `).all();
  res.render('admin/comments', { comments, bannedWords: getSetting('banned_words', ''), saved: 'சேமிக்கப்பட்டது' });
});

app.post('/admin/comments/:id/approve', requireAdmin, (req, res) => {
  db.prepare('UPDATE comments SET approved = 1 WHERE id = ?').run(req.params.id);
  res.redirect('/admin/comments');
});

app.post('/admin/comments/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.redirect('/admin/comments');
});

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

// Central error handler — anything that throws in a route (including
// Multer upload errors) lands here instead of showing Express's bare
// "Internal Server Error" page.
app.use((err, req, res, next) => {
  console.error('[error]', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send(
        'படம் அளவு 8MB-க்கு மேல் இருக்கிறது. சின்ன அளவு படத்தை (8MB-க்கு குறைவாக) மீண்டும் upload செய்யவும். ' +
        '<a href="javascript:history.back()">பின் செல்ல</a>'
      );
    }
    return res.status(400).send(
      'படம் upload செய்வதில் சிக்கல்: ' + err.message + ' ' +
      '<a href="javascript:history.back()">பின் செல்ல</a>'
    );
  }

  res.status(500).send(
    'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும். ' +
    '<a href="javascript:history.back()">பின் செல்ல</a>'
  );
});

app.listen(PORT, () => {
  console.log(`Vizhuthugal Media running on port ${PORT}`);
});
