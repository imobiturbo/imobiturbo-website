const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const offer = require('../os-crm/v2/offer.js');
const { render } = require('../os-crm/v2/render.cjs');
const root = path.join(__dirname, '..');

test('OS mantém os preços publicados e informa o parcelamento da Cakto', () => {
  assert.deepEqual(Object.values(offer.plans).map(p => [p.monthly, p.annual]), [[97,670],[247,1770],[397,2970]]);
  assert.equal(offer.existingAccessURL(), 'https://os.imobiturbo.com.br/login');
  for (const [key,p] of Object.entries(offer.plans)) {
    const annual = offer.price(key, 'annual');
    assert.equal(annual.headline, offer.money(p.annual));
    assert.match(annual.detail, /Renovação automática a cada 12 meses/);
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
    assert.doesNotMatch(source, /appcashflow|mentoriaprocesso|cashflow|Heitor|googletagmanager|google-analytics|fbq\s*\(|gtag\s*\(|dataLayer|supabase/i);
    for (const match of source.matchAll(/<script[^>]+src=["'](https?:[^"']+)/gi)) {
      assert.equal(new URL(match[1]).origin, 'https://track.nmidigital.tech');
    }
    assert.doesNotMatch(source, /type=["'](?:password|email)["']|numero-do-cartao|cvv-do-cartao/i);
  }
  assert.match(checkout, /Abrindo seu checkout seguro na Cakto/);
  assert.match(checkout, /Continuar para a Cakto/);
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
test('LP e assinatura instalam o Tracker Imobiturbo com CSP que permite o coletor', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'os-crm-tracker-'));
  t.after(() => fs.rmSync(output, {recursive:true,force:true}));
  render(output);
  for (const file of ['index.html', 'assinatura/index.html']) {
    const html = fs.readFileSync(path.join(output, file), 'utf8');
    assert.match(html, /id="hub-tracker"[^>]+src="https:\/\/track\.nmidigital\.tech\/t\.js\?operation=00000000-0000-0000-0000-000000000001/);
    assert.match(html, /data-product-id="imobiturbo-os"/);
    assert.match(html, /data-offer-id="d3710c8d-8191-4b07-90bb-4a84b79d2daf"/, 'OS deve usar sua própria oferta financeira');
    assert.match(html, /script-src 'self' https:\/\/track\.nmidigital\.tech/);
    assert.match(html, /connect-src 'self' https:\/\/track\.nmidigital\.tech/);
    assert.match(html, /src="\/os-crm\/v2\/tracking\.js"/);
  }
  const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8').split('/os-crm/v2/*')[1];
  assert.match(headers, /script-src 'self' https:\/\/track\.nmidigital\.tech/);
  assert.match(headers, /connect-src 'self' https:\/\/track\.nmidigital\.tech/);
});
test('trocar plano ou ciclo preserva atribuição e auditoria sem copiar dados arbitrários', () => {
  const search = '?utm_source=meta&utm_id=campaign&imt_adset_name=Corretores&imt_adset_id=adset&imt_ad_id=ad&imt_placement=Reels&fbclid=click&imt_audit=1&rt_vid=visitor&email=private@example.com&redirect=https://invalid.example';
  const target = new URL(offer.checkoutURL('scale', 'monthly', search), 'https://www.imobiturbo.com.br');
  assert.deepEqual(offer.checkoutSelection(target.href), {plan:'scale',cycle:'monthly'});
  assert.equal(target.origin, 'https://pay.cakto.com.br');
  for (const key of ['utm_source','utm_id','imt_adset_name','imt_adset_id','imt_ad_id','imt_placement','fbclid','imt_audit','rt_vid']) {
    assert.equal(target.searchParams.get(key), new URLSearchParams(search).get(key));
  }
  assert.equal(target.searchParams.has('email'), false);
  assert.equal(target.searchParams.has('redirect'), false);
});

test('seis seleções abrem seis ofertas distintas e URLs desconhecidas não representam o OS', () => {
  const targets = new Set();
  for (const plan of Object.keys(offer.plans)) for (const cycle of ['monthly','annual']) {
    const url = offer.checkoutURL(plan,cycle,'?utm_source=audit&imt_audit=1');
    targets.add(new URL(url).pathname);
    assert.deepEqual(offer.checkoutSelection(url), {plan,cycle});
  }
  assert.equal(targets.size,6);
  for (const url of ['https://evil.example/384adhh','https://pay.cakto.com.br/unknown','https://pay.cakto.com.br/384adhh/other']) assert.equal(offer.checkoutSelection(url),null);
  assert.deepEqual(offer.checkoutSelection(offer.checkoutURL('__proto__','invalid')), {plan:'growth',cycle:'annual'});
});
test('links antigos de assinatura encaminham a oferta e a atribuição sem cobrança', () => {
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(root,'os-crm/v2/assinatura/checkout.js'),'utf8');
  for (const plan of Object.keys(offer.plans)) for (const cycle of ['monthly','annual']) {
    const link = {}; let destination;
    const search = `?plan=${plan}&cycle=${cycle}&utm_source=audit&imt_audit=1`;
    vm.runInNewContext(source,{window:{OSOffer:{...offer,checkoutURL:(p,c)=>offer.checkoutURL(p,c,search)}},location:{search,replace:url=>{destination=url;}},document:{querySelector:()=>link}});
    assert.deepEqual(offer.checkoutSelection(destination), {plan,cycle});
    assert.equal(new URL(destination).searchParams.get('imt_audit'),'1');
    assert.equal(link.href,destination);
  }
});
