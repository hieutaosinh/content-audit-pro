import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePage } from '../scripts/content-audit/lib/score-rules.mjs';

function basePage(overrides = {}) {
  return {
    url: 'https://example.com/bai-viet',
    status: 200,
    ok: true,
    canonical: 'https://example.com/bai-viet',
    title: 'Đây là tiêu đề SEO đủ dài cho bài viết',
    meta_description: 'Đây là phần mô tả meta đủ dài để vượt ngưỡng tối thiểu trong cấu hình kiểm tra hiện tại.',
    h1: ['Đây là tiêu đề SEO đủ dài cho bài viết'],
    h2: ['Phần một', 'Phần hai'],
    h3: [],
    word_count: 900,
    internal_links: ['https://example.com/a', 'https://example.com/b', 'https://example.com/c', 'https://example.com/d'],
    external_links: [],
    images_total: 1,
    images_missing_alt: 0,
    published_at: '2025-01-01T00:00:00Z',
    modified_at: new Date().toISOString(),
    category: 'SEO',
    tags: ['audit'],
    error: null,
    ...overrides
  };
}

test('scorePage flags pages with no internal links', () => {
  const result = scorePage(basePage({ internal_links: [] }));

  assert.ok(result.server_flags.includes('no_internal_links_detected'));
  assert.ok(result.notes_vi.some((note) => note.includes('internal link')));
  assert.ok(result.score_sections.internalLinks < 10);
});

test('scorePage flags long pages with low internal link density', () => {
  const result = scorePage(basePage({ word_count: 1600, internal_links: ['https://example.com/a', 'https://example.com/b'] }));

  assert.ok(result.server_flags.includes('low_internal_links'));
  assert.ok(result.server_flags.includes('low_internal_link_density'));
  assert.ok(result.score_sections.internalLinks <= 5);
});

test('scorePage flags external links without internal links', () => {
  const result = scorePage(basePage({ internal_links: [], external_links: ['https://external.test/a'] }));

  assert.ok(result.server_flags.includes('no_internal_links_detected'));
  assert.ok(result.server_flags.includes('external_without_internal_links'));
});

test('scorePage keeps strong link profile clean', () => {
  const result = scorePage(basePage());

  assert.equal(result.server_flags.includes('no_internal_links_detected'), false);
  assert.equal(result.server_flags.includes('low_internal_links'), false);
  assert.equal(result.server_flags.includes('low_internal_link_density'), false);
  assert.equal(result.score_sections.internalLinks, 10);
});
