const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { compose } = require('../scripts/compose-checkout-release.cjs');
test('checkout composition preserves unrelated assets and never writes through baseline symlinks', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'checkout-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const baseline = path.join(root, 'baseline'), built = path.join(root, 'built'), output = path.join(root, 'output');
  for (const dir of [baseline, built]) {
    fs.mkdirSync(path.join(dir, 'vagas/assets'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'vagas-v2'), { recursive: true });
    fs.symlinkSync('../vagas/assets', path.join(dir, 'vagas-v2/assets'));
    fs.writeFileSync(path.join(dir, '_worker.js'), dir);
    fs.writeFileSync(path.join(dir, 'vagas/assets/test.txt'), dir);
  }
  fs.writeFileSync(path.join(baseline, 'index.html'), 'preserve homepage');
  fs.writeFileSync(path.join(built, 'index.html'), 'unrelated source page must not replace production');
  fs.writeFileSync(path.join(built, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude: ['/*.js'] }));
  const proof = compose(baseline, built, output);
  assert.equal(proof.protectedFiles, 1);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), 'preserve homepage');
  assert.equal(fs.readFileSync(path.join(baseline, 'vagas/assets/test.txt'), 'utf8'), baseline);
  assert.equal(fs.readFileSync(path.join(output, 'vagas-v2/assets/test.txt'), 'utf8'), built);
});
