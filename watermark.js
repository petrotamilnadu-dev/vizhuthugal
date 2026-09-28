const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const WATERMARK_TEXT = 'vizhuthugal.live';

function buildWatermarkSvg(width, height) {
  const fontSize = Math.max(12, Math.round(width * 0.022));
  const bandHeight = Math.round(fontSize * 1.9);
  const approxCharWidth = fontSize * 0.56;
  const gap = fontSize * 3;
  const singleWidth = WATERMARK_TEXT.length * approxCharWidth + gap;
  const repeats = Math.max(1, Math.ceil(width / singleWidth) + 1);

  let textEls = '';
  for (let i = 0; i < repeats; i++) {
    const x = i * singleWidth + 8;
    textEls += `<text x="${x}" y="${height - bandHeight / 2}" class="wm" dominant-baseline="middle">${WATERMARK_TEXT}</text>`;
  }

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .wm { fill: #ffffff; fill-opacity: 0.65; font-size: ${fontSize}px; font-family: Arial, Helvetica, sans-serif; font-weight: 700; letter-spacing: 1px; }
      </style>
      <rect x="0" y="${height - bandHeight}" width="${width}" height="${bandHeight}" fill="#000000" fill-opacity="0.3"/>
      ${textEls}
    </svg>`;
}

/**
 * Overlays a small "vizhuthugal.live" watermark band across the bottom of
 * an image, in place (overwrites the given file). Silently leaves the
 * original file untouched if anything goes wrong (corrupt image, unusual
 * format, etc.) — a missing watermark is never worth blocking an upload.
 */
async function watermarkImage(filePath) {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) return;

    const svg = buildWatermarkSvg(metadata.width, metadata.height);
    const watermarked = await sharp(filePath)
      .rotate() // apply EXIF orientation before compositing so the band lands correctly
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .toBuffer();

    await sharp(watermarked).toFile(filePath + '.tmp');
    require('fs').renameSync(filePath + '.tmp', filePath);
  } catch (e) {
    console.error('[watermark] failed for', filePath, '-', e.message);
  }
}

/**
 * WhatsApp/Facebook/Twitter link-preview crawlers only reliably read
 * JPEG and PNG for og:image — AVIF and WebP (both allowed for regular
 * uploads) are read inconsistently by them, which is why a shared news
 * link sometimes shows a thumbnail and sometimes shows up as a plain
 * text link with no preview at all, depending on which format the
 * featured image happened to be uploaded in.
 *
 * This creates a `<file>.share.jpg` twin next to any non-jpg/png image,
 * so link-sharing always has a safe JPEG to point og:image at while the
 * site itself keeps using the original (smaller) AVIF/WebP file.
 * Returns the twin's absolute path, or null if none was needed/possible.
 */
async function ensureShareableJpeg(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') return null;

  const outPath = filePath + '.share.jpg';
  try {
    if (fs.existsSync(outPath)) return outPath;
    await sharp(filePath)
      .rotate()
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85 })
      .toFile(outPath);
    return outPath;
  } catch (e) {
    console.error('[watermark] share-jpeg failed for', filePath, '-', e.message);
    return null;
  }
}

/**
 * Given the DB-stored image path (e.g. "/uploads/123.avif") and the
 * absolute uploads directory, returns the best URL path to use for
 * social-share previews — the JPEG twin if this format needs one
 * (generating it on the fly for older articles that predate this
 * feature), otherwise the original path as-is.
 */
async function shareableImagePath(dbImagePath, uploadsDir) {
  if (!dbImagePath) return dbImagePath;
  const ext = path.extname(dbImagePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') return dbImagePath;

  const absPath = path.join(uploadsDir, path.basename(dbImagePath));
  const twin = await ensureShareableJpeg(absPath);
  return twin ? dbImagePath + '.share.jpg' : dbImagePath;
}

module.exports = { watermarkImage, ensureShareableJpeg, shareableImagePath };
