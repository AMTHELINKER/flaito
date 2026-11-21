// Génère les icônes PWA (PNG) sans dépendance native : rastérisation simple
// d'un « L » à empattements brun encre sur fond parchemin, filet or patiné.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const PARCHMENT = [0xf3, 0xe9, 0xd7];
const INK = [0x3e, 0x2a, 0x1e];
const GOLD = [0xb8, 0x89, 0x3b];

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const SS = 4;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const p = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          r += p[0] * p[3];
          g += p[1] * p[3];
          b += p[2] * p[3];
          a += p[3];
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const n = SS * SS;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / n) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
// Glyphe dans un repère 0..1, mis à l'échelle par `s` autour du centre.
function glyph(x, y, s) {
  const u = (x - 0.5) / s + 0.5,
    v = (y - 0.5) / s + 0.5;
  const stem = inRect(u, v, 0.36, 0.22, 0.47, 0.74);
  const topSerif = inRect(u, v, 0.29, 0.2, 0.54, 0.25);
  const foot = inRect(u, v, 0.29, 0.69, 0.71, 0.75);
  const footSerif = inRect(u, v, 0.66, 0.6, 0.71, 0.75);
  if (stem || topSerif || foot || footSerif) return INK;
  if (inRect(u, v, 0.29, 0.8, 0.71, 0.815)) return GOLD;
  return null;
}
function icon(size, { maskable = false, rounded = true } = {}) {
  return png(size, (x, y) => {
    if (!maskable && rounded) {
      const r = 0.22,
        cx = Math.min(Math.max(x, r), 1 - r),
        cy = Math.min(Math.max(y, r), 1 - r);
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return [0, 0, 0, 0];
    }
    const g = glyph(x, y, maskable ? 0.72 : 0.95);
    return [...(g ?? PARCHMENT), 1];
  });
}
writeFileSync('public/pwa-192x192.png', icon(192));
writeFileSync('public/pwa-512x512.png', icon(512));
writeFileSync('public/maskable-512x512.png', icon(512, { maskable: true }));
writeFileSync('public/apple-touch-icon.png', icon(180, { rounded: false }));
console.log('Icônes générées.');
