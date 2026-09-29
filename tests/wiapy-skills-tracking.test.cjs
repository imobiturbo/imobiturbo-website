const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('assets/tracking/wiapy-skills.js', 'utf8');
function fixture(status = 200) {
  const events = [], pixel = [], cookies = [], storage = new Map(), calls = [];
  const response = new Response(JSON.stringify({ body: { id: 'order-fixture', status: 'pending' } }), { status });
  const context = { URL, URLSearchParams, crypto: require('node:crypto').webcrypto,
    location: new URL('https://pay.wiapy.com/f5uAVWx6kAkY?rt_vid=visitor-fixture&rt_fbp=fb.1.1790000000000.1234567890&rt_checkout_event_id=checkout-fixture'),
    localStorage: { setItem: (k,v) => storage.set(k,v) },
    document: { createElement: () => ({ dataset: {} }), head: { appendChild() {} }, set cookie(v) { cookies.push(v); } },
    setInterval(fn) { this.timer = fn; return 1; }, clearInterval() {},
    fetch: async (...args) => { calls.push(args); return response; },
    fbq: (...args) => pixel.push(args),
    HubTracker: { config: () => ({ enabled: true }), track: (...args) => events.push(args) }
  };
  context.setInterval = fn => { context.timer = fn; return 1; };
  context.window = context;
  vm.runInNewContext(source, context); context.timer();
  return { context, events, pixel, cookies, storage, calls, response };
}
test('preserva visitante e cookie da LP e reutiliza ID do início do checkout', () => {
  const f = fixture();
  assert.equal(f.storage.get('_rt_vid'), 'visitor-fixture');
  assert.ok(f.cookies.some(v => v.startsWith('_fbp=fb.1.1790000000000.1234567890;')));
  assert.equal(f.pixel.find(v => v[2] === 'InitiateCheckout')[4].eventID, 'checkout-fixture');
});
test('observa pagamento pendente sem mudar a requisição nem inventar Purchase', async () => {
  const f = fixture();
  const init = { method: 'POST', body: JSON.stringify({ name: 'Cliente Exemplo', email: 'fixture@example.test', phone: '+5511999999999' }) };
  const result = await f.context.fetch('https://api.wiapy.com/checkout/payment', init);
  assert.equal(result, f.response); assert.equal(f.calls[0][1], init);
  assert.equal(f.events.length, 1); assert.equal(f.events[0][0], 'AddPaymentInfo');
  assert.equal(f.events[0][1].email, 'fixture@example.test');
  assert.equal(f.events[0][2], 'payment-info-order-fixture');
  assert.equal(f.pixel.find(v => v[2] === 'AddPaymentInfo')[4].eventID, f.events[0][2]);
  assert.ok(!f.pixel.some(v => v[2] === 'Purchase'));
});
test('resposta recusada não gera evento de dados de pagamento', async () => {
  const f = fixture(422);
  await f.context.fetch('https://api.wiapy.com/checkout/payment', { method: 'POST', body: '{}' });
  assert.equal(f.events.length, 0);
});
