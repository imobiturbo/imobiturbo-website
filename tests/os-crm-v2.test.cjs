const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const offer = require('../os-crm/v2/offer.js');
const { render } = require('../os-crm/v2/render.cjs');
const root = path.join(__dirname, '..');

test('OS offer preserves the published monthly, annual cash and installment totals', () => {
  assert.deepEqual(Object.values(offer.plans).map(p => [p.monthly, p.installment, p.annual]), [[97,67,670],[247,177,1770],[397,297,2970]]);
  assert.equal(offer.existingAccessURL(), 'https://os.imobiturbo.com.br/login');
  for (const [key,p] of Object.entries(offer.plans)) {
    const annual = offer.price(key, 'annual');
    assert.ok(annual.detail.includes(offer.money(p.annual)));
    assert.ok(annual.detail.includes(offer.money(p.installment * 12)));
    assert.ok(offer.price(key, 'monthly').headline.includes(offer.money(p.monthly)));
    const message = new URL(offer.activationURL(key, 'annual'));
    assert.equal(message.hostname, 'wa.me');
    assert.ok(message.searchParams.get('text').includes(p.name));
    assert.ok(message.searchParams.get('text').includes(annual.headline));
  }
});
test('invalid checkout query cannot select another product or unsafe property', () => {
  assert.deepEqual(offer.selection('?plan=scale&cycle=monthly'), {plan:'scale',cycle:'monthly'});
  assert.deepEqual(offer.selection('?plano=start&cycle=annual'), {plan:'start',cycle:'annual'});
  for (const plan of ['gold','__proto__','constructor','toString','<script>']) {
    assert.deepEqual(offer.selection(`?plan=${encodeURIComponent(plan)}&cycle=invalid`), {plan:'growth',cycle:'annual'});
  }
});
test('adapted landing and subscription contain no competitor scripts, pixels or payment collection', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'os-crm-v2-'));
  t.after(() => fs.rmSync(output, {recursive:true,force:true}));
  render(output);
  const landing = fs.readFileSync(path.join(output,'index.html'),'utf8');
  const checkout = fs.readFileSync(path.join(output,'assinatura/index.html'),'utf8');
  const script = fs.readFileSync(path.join(root,'os-crm/v2/lp.js'),'utf8');
  for (const source of [landing,checkout,script]) {
    assert.doesNotMatch(source, /appcashflow|mentoriaprocesso|cashflow|Heitor|googletagmanager|google-analytics|connect\.facebook|fbq\s*\(|gtag\s*\(|dataLayer|supabase/i);
    assert.doesNotMatch(source, /<script[^>]+src=["']https?:/i);
    assert.doesNotMatch(source, /type=["'](?:password|email)["']|numero-do-cartao|cvv-do-cartao/i);
  }
  assert.match(checkout, /A seleção do plano não realiza cobrança/);
  assert.match(checkout, /Solicitar minha ativação/);
  assert.match(landing, /Relatos de clientes do ecossistema Imobiturbo/);
  for (const section of ['produto','demo','resultados','diferenciais','integracoes','crm','inbox','ia','followup','operacao','criador','planos','faq']) {
    assert.ok(landing.includes(`id="${section}"`), section);
  }
  for (const source of [landing,checkout]) for (const match of source.matchAll(/(?:src|href|poster)="(\/os-crm\/v2\/[^"?#]+)"/g)) {
    if (match[1].endsWith('/')) continue;
    assert.ok(fs.existsSync(path.join(root,match[1])), `Missing local asset ${match[1]}`);
  }
  assert.match(fs.readFileSync(path.join(root,'build-pages.js'),'utf8'), /'\/os-crm\/v2\/\*'/);
});
