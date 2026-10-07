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
  for (const dir of [baseline, built]) fs.mkdirSync(path.join(dir, 'skills-ia-obrigado'), { recursive: true });
  fs.writeFileSync(path.join(baseline, 'skills-ia-obrigado/index.html'), 'obsolete upsell without durable key');
  fs.writeFileSync(path.join(built, 'skills-ia-obrigado/index.html'), 'current hosted upsell with durable key');
  fs.writeFileSync(path.join(built, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude: ['/*.js'] }));
  const proof = compose(baseline, built, output);
  assert.equal(proof.protectedFiles, 1);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), 'preserve homepage');
  assert.equal(fs.readFileSync(path.join(baseline, 'vagas/assets/test.txt'), 'utf8'), baseline);
  assert.equal(fs.readFileSync(path.join(output, 'vagas-v2/assets/test.txt'), 'utf8'), built);
  assert.equal(fs.readFileSync(path.join(output, 'skills-ia-obrigado/index.html'), 'utf8'), 'current hosted upsell with durable key');
});

test('Skills-only release retains the deployed worker and other pages, and rejects incompatible shared dependencies', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const baseline = path.join(root, 'baseline'), built = path.join(root, 'built');
  for (const dir of [baseline, built]) {
    fs.mkdirSync(path.join(dir, 'skills-ia-obrigado'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'vagas'), { recursive: true });
    fs.writeFileSync(path.join(dir, '_worker.js'), dir);
    fs.writeFileSync(path.join(dir, '_routes.json'), JSON.stringify({ version: 1 }));
    for (const file of ['checkout-session.js', 'vagas.css']) fs.writeFileSync(path.join(dir, 'vagas', file), 'same shared dependency');
    fs.writeFileSync(path.join(dir, 'skills-ia-obrigado/index.html'), dir);
  }
  fs.writeFileSync(path.join(baseline, 'index.html'), 'production homepage');
  compose(baseline, built, path.join(root, 'release'), { skillsUpsellOnly: true });
  assert.equal(fs.readFileSync(path.join(root, 'release/_worker.js'), 'utf8'), baseline);
  assert.equal(fs.readFileSync(path.join(root, 'release/index.html'), 'utf8'), 'production homepage');
  assert.equal(fs.readFileSync(path.join(root, 'release/skills-ia-obrigado/index.html'), 'utf8'), built);
  fs.writeFileSync(path.join(built, 'vagas/checkout-session.js'), 'incompatible dependency');
  assert.throws(() => compose(baseline, built, path.join(root, 'rejected'), { skillsUpsellOnly: true }), /shared dependency differs/);
});

test('a two-offer release preserves production Skills, Community, worker and unrelated assets', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'offers-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const baseline = path.join(root, 'baseline'), built = path.join(root, 'built');
  const routes = ['bf-imobiliaria26', 'maquina-de-prospeccao', 'bf-imobiliaria26-obrigado', 'maquina-de-prospeccao-obrigado'];
  for (const dir of [baseline, built]) {
    fs.mkdirSync(path.join(dir, 'vagas'), { recursive: true });
    fs.writeFileSync(path.join(dir, '_worker.js'), dir);
    fs.writeFileSync(path.join(dir, '_routes.json'), JSON.stringify({ version: 1 }));
    for (const file of ['checkout-session.js', 'vagas.css']) fs.writeFileSync(path.join(dir, 'vagas', file), 'shared checkout');
    for (const route of ['skills-ia-obrigado', ...routes]) {
      fs.mkdirSync(path.join(dir, route), { recursive: true });
      fs.writeFileSync(path.join(dir, route, 'index.html'), dir);
    }
  }
  const output = path.join(root, 'release');
  compose(baseline, built, output, { lowTicketOffersOnly: true });
  for (const route of routes) assert.equal(fs.readFileSync(path.join(output, route, 'index.html'), 'utf8'), built);
  assert.equal(fs.readFileSync(path.join(output, '_worker.js'), 'utf8'), baseline);
  assert.equal(fs.readFileSync(path.join(output, 'skills-ia-obrigado/index.html'), 'utf8'), baseline);
  fs.unlinkSync(path.join(built, routes[2], 'index.html'));
  assert.throws(() => compose(baseline, built, path.join(root, 'missing'), { lowTicketOffersOnly: true }), /Missing offer route/);
  assert.throws(() => compose(baseline, built, path.join(root, 'mixed'), { lowTicketOffersOnly: true, skillsUpsellOnly: true }), /Select one release scope/);
});
