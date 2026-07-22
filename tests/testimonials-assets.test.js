const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const gallery = path.join(root, 'depoimentos', 'index.html');

test('a galeria de depoimentos usa apenas imagens hospedadas no domínio Imobiturbo', () => {
  const source = fs.readFileSync(gallery, 'utf8');
  const paths = [...source.matchAll(/'\/assets\/testimonials\/gallery\/([^']+\.webp)'/g)].map((match) => match[1]);

  assert.equal(source.includes('i.postimg.cc'), false);
  assert.equal(paths.length, 43);

  for (const asset of paths) {
    assert.equal(fs.existsSync(path.join(root, 'assets', 'testimonials', 'gallery', asset)), true, asset);
  }
});
