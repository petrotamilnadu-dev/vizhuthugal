const sharp = require('sharp');

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

module.exports = { watermarkImage };
