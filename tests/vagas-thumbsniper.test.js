const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vagas/vagas.css'), 'utf8');

test('vagas uses a lightweight responsive ThumbSniper while the real VSL stays stopped', () => {
  const mainVideo = html.match(/<video id="vslVideo"([^>]*)>/);
  const retentionVideo = html.match(/<video id="vslRetentionVideo"([^>]*)>/);

  assert.ok(mainVideo, 'Main VSL video must exist');
  assert.match(mainVideo[1], /preload="none"/);
  assert.doesNotMatch(mainVideo[1], /\bautoplay\b/);
  assert.doesNotMatch(mainVideo[1], /\bloop\b/);
  assert.doesNotMatch(mainVideo[1], /\bmuted\b/);
  assert.match(mainVideo[1], /data-desktop-src="https:\/\/vsl\.imobiturbo\.com\.br\/imobiturbo-vagas-horizontal-reels-sound-v5\.mp4"/);
  assert.match(mainVideo[1], /data-mobile-src="https:\/\/vsl\.imobiturbo\.com\.br\/imobiturbo-vagas-vertical-reels-sound-v5\.mp4"/);

  assert.ok(retentionVideo, 'ThumbSniper retention video must exist');
  assert.match(retentionVideo[1], /\bautoplay\b/);
  assert.match(retentionVideo[1], /\bloop\b/);
  assert.match(retentionVideo[1], /\bmuted\b/);
  assert.match(retentionVideo[1], /data-desktop-src="\.\/assets\/vsl-thumbsniper-desktop-ai-v2\.webm"/);
  assert.match(retentionVideo[1], /data-mobile-src="\.\/assets\/vsl-thumbsniper-mobile-ai-v2\.webm"/);
  assert.match(retentionVideo[1], /data-desktop-poster="\.\/assets\/vsl-thumbsniper-desktop-ai-v2\.webp"/);
  assert.match(retentionVideo[1], /data-mobile-poster="\.\/assets\/vsl-thumbsniper-mobile-ai-v2\.webp"/);
});

test('ThumbSniper reappears on pause/end and disappears on playback', () => {
  assert.match(html, /function setVslRetentionVisible\(visible\)/);
  assert.match(html, /video\.addEventListener\('play',[\s\S]*?setVslRetentionVisible\(false\)/);
  assert.match(html, /video\.addEventListener\('pause',[\s\S]*?setVslRetentionVisible\(true\)/);
  assert.match(html, /video\.addEventListener\('ended',[\s\S]*?setVslRetentionVisible\(true\)/);
  assert.match(css, /\.vsl-retention-video\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.hero-vsl\s*\{\s*aspect-ratio:\s*9 \/ 16;/);
});

test('ThumbSniper media stays small enough for fast page delivery', () => {
  const assets = [
    'vsl-thumbsniper-desktop-ai-v2.webm',
    'vsl-thumbsniper-mobile-ai-v2.webm',
    'vsl-thumbsniper-desktop-ai-v2.webp',
    'vsl-thumbsniper-mobile-ai-v2.webp'
  ];

  for (const asset of assets) {
    const assetPath = path.join(root, 'vagas/assets', asset);
    assert.ok(fs.existsSync(assetPath), `${asset} must exist`);
    assert.ok(fs.statSync(assetPath).size < 64 * 1024, `${asset} must stay under 64 KiB`);
  }
});
