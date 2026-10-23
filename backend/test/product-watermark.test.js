'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { watermarkProductImage } = require('../src/product-watermark');

test('product watermark is embedded in image pixels without changing size', async () => {
  const original = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#eeeeee' } })
    .png().toBuffer();
  const output = await watermarkProductImage(original);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 800);
  assert.equal(metadata.height, 600);
  const outputCentre = await sharp(output).extract({ left: 350, top: 280, width: 100, height: 40 }).raw().toBuffer();
  const watermarkRegion = await sharp(output).extract({ left: 515, top: 455, width: 205, height: 55 }).raw().toBuffer();
  let darkPixels = 0;
  for (let i = 0; i < watermarkRegion.length; i += 3) {
    if (watermarkRegion[i] < 160 && watermarkRegion[i + 1] < 160 && watermarkRegion[i + 2] < 160) darkPixels++;
  }
  assert.ok(darkPixels > 30, 'lower-right vector letters must render without installed fonts');
  assert.ok([...outputCentre].every(value => value > 200), 'centre of product must remain unobstructed');
});

test('invalid images are rejected', async () => {
  await assert.rejects(watermarkProductImage(Buffer.from('invalid image')));
});
