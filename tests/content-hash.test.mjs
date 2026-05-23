import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentHash, normalizeForHash, normalizeHashText } from '../scripts/content-audit/lib/content-hash.mjs';

test('normalizeHashText collapses whitespace without changing meaningful text', () => {
  assert.equal(normalizeHashText('  Xin   chào\n Việt Nam  '), 'Xin chào Việt Nam');
});

test('normalizeForHash sorts object keys recursively', () => {
  assert.deepEqual(
    normalizeForHash({ z: 'last', a: { y: 'yes', b: 'bee' } }),
    { a: { b: 'bee', y: 'yes' }, z: 'last' }
  );
});

test('buildContentHash is deterministic for equivalent normalized input', () => {
  const first = buildContentHash({ title: ' Bài viết  ', headings: ['H1'], nested: { b: '2', a: '1' } });
  const second = buildContentHash({ nested: { a: '1', b: '2' }, headings: ['H1'], title: 'Bài viết' });

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test('buildContentHash changes when meaningful content changes', () => {
  const first = buildContentHash({ title: 'Bài viết A', body_text: 'Nội dung cũ' });
  const second = buildContentHash({ title: 'Bài viết A', body_text: 'Nội dung mới' });

  assert.notEqual(first, second);
});
