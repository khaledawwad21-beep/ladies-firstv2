'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { publicProductImageUrls, isPublicIpv4 } = require('../src/protected-product-images');

test('public catalog replaces product image links, preserving admin source arrays', () => {
  const product = { id: 17, imageUrl: 'https://example.org/main.jpg', mainImages: ['/api/images/a'], subImages: ['https://example.org/side.jpg'], images: ['/api/images/a', 'https://example.org/side.jpg'] };
  const rewritten = publicProductImageUrls(product);
  assert.equal(rewritten.imageUrl, '/api/product-images/17/hero/0');
  assert.deepEqual(rewritten.mainImages, ['/api/product-images/17/main/0']);
  assert.deepEqual(rewritten.subImages, ['/api/product-images/17/sub/0']);
  assert.deepEqual(rewritten.images, ['/api/product-images/17/all/0', '/api/product-images/17/all/1']);
  assert.equal(product.mainImages[0], '/api/images/a');
});

test('image fetch blocks private, metadata and reserved IPv4 destinations', () => {
  for (const ip of ['127.0.0.1', '10.3.4.5', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.100.100.100', '0.0.0.0', '203.0.113.9']) assert.equal(isPublicIpv4(ip), false, ip);
  assert.equal(isPublicIpv4('8.8.8.8'), true);
});
