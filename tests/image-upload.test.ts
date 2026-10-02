import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IMAGE_TYPES, MAX_IMAGE_SIZE, isAllowedImagePath, validateImageFile } from '../src/lib/image-upload.ts';

test('accepts supported images through the maximum upload size', () => {
  for (const type of Object.keys(IMAGE_TYPES)) {
    assert.equal(validateImageFile({ type, size: 1 }), null);
    assert.equal(validateImageFile({ type, size: MAX_IMAGE_SIZE }), null);
  }
});

test('rejects empty, oversized, and unsupported files', () => {
  assert.match(validateImageFile({ type: 'image/jpeg', size: 0 })!, /empty/);
  assert.match(validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_SIZE + 1 })!, /10 MB/);
  for (const type of ['image/svg+xml', 'text/html', 'application/pdf', '', 'toString']) {
    assert.notEqual(validateImageFile({ type, size: 100 }), null);
  }
});

test('only authorizes image paths in the authenticated user folder', () => {
  const file = '12345678-1234-4321-abcd-123456789abc';
  for (const extension of Object.values(IMAGE_TYPES)) {
    assert.equal(isAllowedImagePath(`recipe-images/alice/${file}.${extension}`, 'alice'), true);
  }
  for (const path of [
    `recipe-images/bob/${file}.jpg`,
    `recipe-images/alice-other/${file}.jpg`,
    `recipe-images/alice/../bob/${file}.jpg`,
    `recipe-images/alice/%2e%2e/${file}.jpg`,
    `recipe-images/alice/${file}.svg`,
    `recipe-images/alice/${file}.jpg/extra`,
    `recipe-images/alice/${file}.jpg?overwrite=true`,
    'recipe-images/alice/photo.jpg',
    `other/alice/${file}.jpg`,
  ]) {
    assert.equal(isAllowedImagePath(path, 'alice'), false, path);
  }
});
