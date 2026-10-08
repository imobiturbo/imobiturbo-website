import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyLPAssets } from '../scripts/verify-lp-assets.mjs';

test('release verification catches a missing lazy image loader and its logo', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-assets-'));
  try {
    fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets'));
    fs.writeFileSync(path.join(root, 'skills/index.html'), '<script src="./performance.js?v=release" defer></script><img data-lazy-src="/assets/logo.webp?v=release"><link rel="stylesheet" href="./style.css"><script src="https://example.com/tracker.js"></script>');
    fs.writeFileSync(path.join(root, 'skills/style.css'), '@font-face{src:url("/assets/font.woff2")}');
    fs.writeFileSync(path.join(root, 'assets/font.woff2'), 'font');
    fs.writeFileSync(path.join(root, 'skills/offer.json'), '{}');
    const incomplete = verifyLPAssets(root, ['skills/index.html']);
    assert.equal(incomplete.passes, false);
    assert.deepEqual(incomplete.missing.map(m => m.file), ['skills/performance.js', 'assets/logo.webp']);
    fs.writeFileSync(path.join(root, 'skills/performance.js'), '/* actual image loading dependency */');
    fs.writeFileSync(path.join(root, 'assets/logo.webp'), 'image');
    assert.equal(verifyLPAssets(root, ['skills/index.html']).passes, true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
