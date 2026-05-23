import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPageFromHtml } from '../scripts/content-audit/lib/extract-page.mjs';

const html = `<!doctype html>
<html lang="vi">
  <head>
    <title> Bài kiểm tra SEO </title>
    <meta name="description" content=" Mô tả ngắn cho bài kiểm tra. ">
    <link rel="canonical" href="/bai-kiem-tra/">
    <meta property="article:published_time" content="2025-01-02T00:00:00Z">
    <meta property="article:modified_time" content="2025-02-03T00:00:00Z">
    <meta property="article:tag" content="SEO">
    <meta property="article:tag" content="Content Audit">
  </head>
  <body>
    <h1>Tiêu đề chính</h1>
    <h2>Phần một</h2>
    <h3>Ý nhỏ</h3>
    <p>Đây là nội dung kiểm tra cho công cụ audit.</p>
    <a href="/noi-bo#section">Liên kết nội bộ</a>
    <a href="https://www.example.com/cung-host">Cùng host có www</a>
    <a href="https://external.test/post?x=1#frag">Liên kết ngoài</a>
    <a href="mailto:test@example.com">Email</a>
    <a href="#local">Fragment</a>
    <img src="/image-a.jpg" alt="Ảnh A">
    <img src="/image-b.jpg" alt="">
    <script>document.body.innerHTML = 'ignore';</script>
  </body>
</html>`;

test('extractPageFromHtml extracts core SEO fields', () => {
  const page = extractPageFromHtml('https://example.com/bai-kiem-tra', html, 200);

  assert.equal(page.ok, true);
  assert.equal(page.status, 200);
  assert.equal(page.canonical, 'https://example.com/bai-kiem-tra/');
  assert.equal(page.title, 'Bài kiểm tra SEO');
  assert.equal(page.meta_description, 'Mô tả ngắn cho bài kiểm tra.');
  assert.deepEqual(page.h1, ['Tiêu đề chính']);
  assert.deepEqual(page.h2, ['Phần một']);
  assert.deepEqual(page.h3, ['Ý nhỏ']);
  assert.equal(page.published_at, '2025-01-02T00:00:00Z');
  assert.equal(page.modified_at, '2025-02-03T00:00:00Z');
  assert.deepEqual(page.tags, ['SEO', 'Content Audit']);
  assert.match(page.content_hash, /^[a-f0-9]{64}$/);
});

test('extractPageFromHtml extracts deterministic internal and external links', () => {
  const page = extractPageFromHtml('https://example.com/bai-kiem-tra', html, 200);

  assert.deepEqual(page.internal_links, [
    'https://example.com/cung-host',
    'https://example.com/noi-bo'
  ]);
  assert.deepEqual(page.external_links, ['https://external.test/post?x=1']);
});

test('extractPageFromHtml extracts image alt coverage', () => {
  const page = extractPageFromHtml('https://example.com/bai-kiem-tra', html, 200);

  assert.equal(page.images_total, 2);
  assert.equal(page.images_missing_alt, 1);
  assert.deepEqual(page.images, [
    { src: 'https://example.com/image-a.jpg', alt: 'Ảnh A', missing_alt: false },
    { src: 'https://example.com/image-b.jpg', alt: '', missing_alt: true }
  ]);
});
