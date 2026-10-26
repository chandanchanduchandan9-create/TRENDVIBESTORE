import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../../public/uploads');

/**
 * Saves a base64 encoded image or Data URI to public/uploads directory.
 * If already a URL or relative path, returns it as-is.
 * @param {string} dataUriOrBase64 
 * @param {string} customPrefix 
 * @returns {string} Relative public URL (e.g. /uploads/prod_12345.jpg)
 */
export function saveBase64Image(dataUriOrBase64, customPrefix = 'product') {
  if (!dataUriOrBase64 || typeof dataUriOrBase64 !== 'string') return null;

  const trimmed = dataUriOrBase64.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const matches = trimmed.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
  let ext = 'jpg';
  let buffer;

  if (matches && matches.length === 3) {
    const mime = matches[1].toLowerCase();
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('svg')) ext = 'svg+xml';
    else ext = 'jpg';
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    try {
      buffer = Buffer.from(trimmed, 'base64');
    } catch (_) {
      return null;
    }
  }

  const cleanPrefix = customPrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 16);
  const filename = `${cleanPrefix}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}
