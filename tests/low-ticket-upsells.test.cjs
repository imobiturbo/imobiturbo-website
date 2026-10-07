const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { offers, renderLowTicketUpsell, buildLowTicketUpsells } = require('../scripts/build-low-ticket-upsells.cjs');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'skills-ia-obrigado/index.html'), 'utf8');

test('as duas ofertas preservam o checkout corrigido e a entrega independente da Comunidade', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'novas-ofertas-upsell-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  buildLowTicketUpsells(root, output);
  for (const offer of offers) {
    const html = fs.readFileSync(path.join(output, offer.publicPath, 'index.html'), 'utf8');
    assert.match(html, /checkoutSession\.intent\.begin\(payload\)/);
    assert.match(html, /checkoutMode: 'hosted'/);
    assert.match(html, /window\.openSkillsCommunityCheckout\(\{ name: fullname, email, phone \}, currentSelectedPlan\)/);
    assert.match(html, /href="https:\/\/club.imobiturbo.com.br\/login"/);
    assert.match(html, /assinatura da Comunidade é opcional/);
    assert.match(html, /apenas da confirmação da compra dele/);
    assert.match(html, /Após a confirmação do pagamento/);
    assert.match(html, /id="vslFacade"/);
    assert.equal((html.match(/id="chkBuyerCpf"/g) || []).length, 1);
    assert.doesNotMatch(html, /id="chkCard(?:Number|Holder|Expiry|Cvv)"/);
    assert.doesNotMatch(html, /Obrigado por escolher as 54 Skills|Acessar minhas Skills|compra das Skills/);
    assert.ok(html.includes(`/${offer.publicPath}/`));
    assert.doesNotMatch(html, /(?:href|src)="\.\.\//);
    assert.equal(fs.readFileSync(path.join(output, offer.route, 'index.html'), 'utf8'), html);
  }
});

test('o mesmo formulário, planos, VSL e controlador das Skills chegam aos dois kits', () => {
  const html = renderLowTicketUpsell(source, offers[0]);
  for (const id of ['checkoutModalOverlay', 'planRowAnual', 'planRowTrimestral', 'planRowMensal', 'vslFacade']) {
    assert.equal(html.includes(`id="${id}"`), source.includes(`id="${id}"`));
  }
  const scripts = text => [...text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.deepEqual(scripts(html).filter(s => !s.includes('schema.org')), scripts(source).filter(s => !s.includes('schema.org')).map(s => s.replace(/(["'(=])(?:\.\/)?assets\//g, '$1/vagas/assets/')));
});

test('mudança incompatível na entrega ou no checkout impede publicar um upsell incompleto', () => {
  assert.throws(() => renderLowTicketUpsell(source.replace('Acessar minhas Skills', ''), offers[0]), /fonte do upsell mudou/);
  assert.throws(() => renderLowTicketUpsell(source.replace('checkoutSession.intent.begin(payload)', ''), offers[1]), /missing page marker/);
});
