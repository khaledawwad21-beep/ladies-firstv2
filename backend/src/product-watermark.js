'use strict';

const sharp = require('sharp');

// This is intentionally burned into pixels, rather than a CSS overlay.
async function watermarkProductImage(input) {
  const metadata = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (width < 1 || height < 1) throw new Error('Invalid product image');

  const labelWidth = Math.max(62, Math.round(width * 0.19));
  const fontSize = Math.max(10, Math.round(labelWidth * 0.135));
  const labelHeight = Math.round(fontSize * 2.2);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth}" height="${labelHeight}" viewBox="0 0 ${labelWidth} ${labelHeight}">
    <rect x="1" y="1" width="${labelWidth - 2}" height="${labelHeight - 2}" rx="${Math.max(4, Math.round(labelHeight * .24))}" fill="#f7eef2" fill-opacity=".55" stroke="#482b4d" stroke-opacity=".25"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#492f52" fill-opacity=".7">Ladies First</text>
  </svg>`);

  return sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .composite([{ input: svg, gravity: 'centre' }])
    .webp({ quality: 88, effort: 3 })
    .toBuffer();
}

module.exports = { watermarkProductImage };
