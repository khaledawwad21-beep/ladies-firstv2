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
  const sourceCentre = await sharp(original).extract({ left: 350, top: 280, width: 100, height: 40 }).raw().toBuffer();
  const outputCentre = await sharp(output).extract({ left: 350, top: 280, width: 100, height: 40 }).raw().toBuffer();
  assert.notDeepEqual(sourceCentre, outputCentre);
});

test('invalid images are rejected', async () => {
  await assert.rejects(watermarkProductImage(Buffer.from('invalid image')));
});
