const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');

test('real demo is available on demand without autoplay or eager media preload', () => {
  const videos = [...html.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/g)];
  assert.ok(videos.length > 0, 'a real demo must remain available');
  for (const [, attrs, body] of videos) {
    assert.match(attrs, /\bcontrols\b/);
    assert.match(attrs, /\bplaysinline\b/);
    assert.match(attrs, /\bpreload="none"/);
    assert.match(attrs, /\baria-label="[^"]+"/);
    assert.doesNotMatch(attrs, /\b(?:autoplay|loop)\b/);
    const sources = [...body.matchAll(/<source\b[^>]*(?:\bsrc|\bdata-src)="([^"]+)"/g)];
    assert.ok(sources.length > 0, 'demo must have playable media');
    for (const [, src] of sources) {
      assert.ok(fs.existsSync(path.join(root, 'vagas', src)), `Demo media ${src} must exist`);
    }
  }
  assert.doesNotMatch(html, /<link\b[^>]*rel="(?:preload|prefetch)"[^>]*as="video"/);
});

test('compact landing no longer requests the retired VSL or pause artwork', () => {
  assert.doesNotMatch(html, /vsl\.imobiturbo\.com\.br|imobiturbo-vagas-(?:horizontal|vertical)-reels-sound-v5\.mp4|vsl-thumbsniper/);
  assert.doesNotMatch(html, /if\s*\(entry\.isIntersecting\)\s*\{[^}]*\.play\(/, 'entering the viewport must not start demo playback');
});
