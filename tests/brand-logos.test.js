const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

test('Brand assets contain theme-white and theme-dark with distinct files and correct contrast', () => {
  const root = path.resolve(__dirname, '..');
  const whiteDir = path.join(root, 'assets', 'brand', 'theme-white');
  const darkDir = path.join(root, 'assets', 'brand', 'theme-dark');

  assert.ok(fs.existsSync(whiteDir), 'theme-white folder must exist');
  assert.ok(fs.existsSync(darkDir), 'theme-dark folder must exist');

  const subproducts = ['ads', 'club', 'news', 'os', 'radar', 'sites', 'clone'];

  const whiteHashes = new Set();
  const darkHashes = new Set();

  subproducts.forEach(sub => {
    const whiteFile = path.join(whiteDir, `imobiturbo-${sub}.webp`);
    const darkFile = path.join(darkDir, `imobiturbo-${sub}.webp`);

    assert.ok(fs.existsSync(whiteFile), `theme-white/imobiturbo-${sub}.webp must exist`);
    assert.ok(fs.existsSync(darkFile), `theme-dark/imobiturbo-${sub}.webp must exist`);

    const whiteSize = fs.statSync(whiteFile).size;
    const darkSize = fs.statSync(darkFile).size;

    assert.ok(whiteSize > 10000, `white size for ${sub} is too small: ${whiteSize}`);
    assert.ok(darkSize > 10000, `dark size for ${sub} is too small: ${darkSize}`);

    // No duplicate hashes between different subproducts (prevents ads == sites bug)
    const whiteHash = execSync(`sha256sum "${whiteFile}"`).toString().split(' ')[0];
    const darkHash = execSync(`sha256sum "${darkFile}"`).toString().split(' ')[0];

    assert.ok(!whiteHashes.has(whiteHash), `Duplicate hash found in theme-white for ${sub}`);
    assert.ok(!darkHashes.has(darkHash), `Duplicate hash found in theme-dark for ${sub}`);

    whiteHashes.add(whiteHash);
    darkHashes.add(darkHash);
  });
});
