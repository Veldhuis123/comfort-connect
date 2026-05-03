// Optionele WebP-conversie voor alle uploads.
// Werkt alleen als `sharp` is geïnstalleerd: `cd backend && bun add sharp`.
// Anders no-op zodat uploads gewoon blijven werken.
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let sharp = null;
try {
  sharp = require('sharp');
} catch {
  logger.warn('UPLOAD', 'sharp niet geïnstalleerd — WebP conversie uitgeschakeld');
}

const SKIP_EXTS = new Set(['.webp', '.svg', '.gif']);

/**
 * Converteer een geüpload bestand naar WebP en verwijder het origineel.
 * Retourneert het nieuwe pad (of het originele pad als conversie niet kon).
 */
async function convertToWebp(filePath, { quality = 82, maxWidth = 2400 } = {}) {
  if (!sharp || !filePath) return filePath;

  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTS.has(ext)) return filePath;

  try {
    const newPath = filePath.replace(/\.[^.]+$/, '.webp');
    await sharp(filePath)
      .rotate() // EXIF orientation
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toFile(newPath);

    // Origineel opruimen
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }

    return newPath;
  } catch (err) {
    logger.error('UPLOAD', 'WebP conversie mislukt', { file: filePath, error: err.message });
    return filePath;
  }
}

/**
 * Batch helper voor multer file arrays — muteert file.path / file.filename / file.mimetype.
 */
async function convertFilesToWebp(files, opts) {
  if (!sharp || !Array.isArray(files)) return files;
  await Promise.all(files.map(async (file) => {
    const newPath = await convertToWebp(file.path, opts);
    if (newPath !== file.path) {
      file.path = newPath;
      file.filename = path.basename(newPath);
      file.mimetype = 'image/webp';
      try { file.size = fs.statSync(newPath).size; } catch { /* ignore */ }
    }
  }));
  return files;
}

module.exports = { convertToWebp, convertFilesToWebp, isEnabled: () => !!sharp };
