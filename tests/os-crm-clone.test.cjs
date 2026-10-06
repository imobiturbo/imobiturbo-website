const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const clone = path.join(root, 'os-crm/clone');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
  );
}

test('the clone cannot load the original analytics or backend integrations', () => {
  for (const file of files(clone).filter(file => /\.(html|js|css|json)$/.test(file))) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /connect\.facebook\.net|facebook\.com\/tr|\bfbq\b|googletagmanager\.com|google-analytics\.com|\bgtag\s*\(|GTM-[A-Z0-9]+|cloudflareinsights\.com|supabase\.co|\/t\/p\.js|\/t\/t\b/i, path.relative(root, file));
  }
  const html = fs.readFileSync(path.join(clone, 'assinatura/index.html'), 'utf8');
  assert.doesNotMatch(html, /registerSW|index-Bxpl-j43|charts-GEWefq8B|serviceWorker|rel="manifest"/);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /form-action 'none'/);
});

test('all HTML asset references resolve inside the clone', () => {
  for (const file of files(clone).filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:src|href|poster)="(\/os-crm\/clone\/[^"?#]+)"/g)) {
      const target = path.join(root, match[1]);
      assert.ok(fs.existsSync(target), `${path.relative(root, file)}: ${match[1]}`);
    }
    assert.doesNotMatch(html, /\/os-crm\/clone\/os-crm\/clone\//);
  }
});

test('client-rendered screenshots and integration logos are packaged locally', () => {
  const chunks = files(path.join(clone, '_next')).filter(file => file.endsWith('.js'));
  for (const file of chunks) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/["'`](\/os-crm\/clone\/[^"'`\s]+\.(?:jpg|jpeg|png|webp|svg|mp4))/g)) {
      if (match[1].includes('${')) continue;
      assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
    }
  }
  for (const logo of 'hotmart kiwify kirvano cakto wiapy ggcheckout kavoo lastlink payt ticto hubla vega-checkout greenn zouti'.split(' ')) {
    assert.ok(fs.existsSync(path.join(clone, 'integrations', `${logo}.png`)), logo);
  }
});

test('all four sales-page plans lead to the isolated checkout', () => {
  const html = fs.readFileSync(path.join(clone, 'index.html'), 'utf8');
  for (const plan of ['gold', 'diamond', 'ruby', 'master']) {
    assert.ok(html.includes(`/os-crm/clone/assinatura/?plano=${plan}`), plan);
  }
  assert.doesNotMatch(html, /https:\/\/cashflow\.mentoriaprocesso\.com\/assinatura/);
});
