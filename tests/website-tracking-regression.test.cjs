const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const load = file => import(pathToFileURL(path.join(root, file)));

test('Asaas preserves the complete checkout eid or rejects before changing its identity', async () => {
  const { buildAsaasExternalReference } = await load('functions/api/checkout/index.js');
  const eid = 'checkout-' + 'a'.repeat(65);
  const reference = buildAsaasExternalReference({ plan: 'anual', eventId: eid, checkoutExpiresAt: Date.now() });
  assert.ok(reference.length <= 100);
  assert.equal(JSON.parse(reference).eid, eid);
  assert.throws(() => buildAsaasExternalReference({ plan: 'anual', eventId: 'x'.repeat(150) }), /eventId exceeds/);
});

test('gateway context joins order/eid to original session without putting buyer PII in public URL', async t => {
  const { dispatchCheckoutContextToHub } = await load('functions/api/checkout/_tracking.js');
  let sent;
  t.mock.method(globalThis, 'fetch', async (_, options) => { sent = JSON.parse(options.body); return Response.json({ ok: true }); });
  const accepted = await dispatchCheckoutContextToHub({ env: {}, paymentId: 'pay_test', eventId: 'eid_test',
    checkoutId: 'checkout_test', productId: 'comunidade-imobiturbo', amount: 147,
    tracking: { visitorId: 'visitor_test', sessionId: 'session_test', utm_campaign: 'Campanha|123|',
      fbc: 'fb.1.123.real-click', fbp: 'fb.1.123.real-browser', email: 'private@example.invalid', cpf: 'private' } });
  assert.equal(accepted, true);
  assert.equal(sent.orderId, 'pay_test');
  assert.equal(sent.eid, 'eid_test');
  assert.equal(sent.purchaseEventId, 'eid_test');
  assert.equal(sent.sessionId, 'session_test');
  assert.equal(sent.visitorId, 'visitor_test');
  assert.equal(sent.utm_campaign, 'Campanha|123|');
  assert.equal(sent.utms.utm_campaign, 'Campanha|123|');
  assert.equal(sent.email, undefined);
  assert.equal(sent.cpf, undefined);
  assert.equal(new URL(sent.url).search, '');
});

test('valid contact emits Lead once per checkout; invalid and blank contacts emit nothing', () => {
  const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');
  const functionSource = html.slice(html.indexOf('    function fireLeadTrackingEvent()'), html.indexOf('    function openCheckoutModal'));
  const events = [];
  const store = new Map();
  const context = { inputName: { value: '' }, inputEmail: { value: '' }, inputPhone: { value: '' },
    currentPlan: 'mensal', trackedLeadContact: '', getCheckoutId: () => 'checkout_test',
    isValidFullName: value => value.split(' ').filter(Boolean).length >= 2,
    sessionStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) },
    getUtms: () => ({}), trackHubConversion: (...args) => events.push(args),
    navigator: { sendBeacon() {} }, Blob };
  vm.createContext(context);
  vm.runInContext(functionSource, context);
  context.fireLeadTrackingEvent();
  assert.equal(events.length, 0);
  context.inputName.value = 'Synthetic Buyer'; context.inputEmail.value = 'invalid'; context.inputPhone.value = '11987654321';
  context.fireLeadTrackingEvent(); assert.equal(events.length, 0);
  context.inputEmail.value = 'synthetic@example.invalid';
  context.fireLeadTrackingEvent(); context.fireLeadTrackingEvent();
  context.inputName.value = 'Synthetic Updated'; context.fireLeadTrackingEvent();
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'lead');
});

test('observing an already paid community order does not resend Meta Purchase', async t => {
  const { onRequestGet } = await load('functions/api/checkout/status.js');
  const meta = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    const address = new URL(url);
    if (address.hostname === 'graph.facebook.com') { meta.push(url); return Response.json({ events_received: 1 }); }
    if (address.hostname === 'track.nmidigital.tech') return Response.json({ ok: true });
    if (address.pathname === '/v3/payments/pay_test') return Response.json({ id: 'pay_test', status: 'RECEIVED', value: 147,
      externalReference: JSON.stringify({ plan: 'mensal', eid: 'eid_test' }), customer: {} });
    throw new Error('Unexpected request: ' + address.pathname);
  });
  for (let i = 0; i < 2; i++) {
    const response = await onRequestGet({ request: new Request('https://www.imobiturbo.com.br/api/checkout/status?gateway=asaas&paymentId=pay_test'),
      env: { ASAAS_API_KEY: 'synthetic', META_ACCESS_TOKEN: 'synthetic' } });
    const data = await response.json();
    assert.equal(data.paid, true);
    assert.equal(data.eventId, 'eid_test');
  }
  assert.equal(meta.length, 0);
});

test('LP passes Purchase eid in the actual SDK eventId argument rather than an ignored property', () => {
  const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');
  const start = html.indexOf('    function trackHubConversion(');
  const source = html.slice(start, html.indexOf("    trackHubEvent('LandingView'", start));
  const queued = [];
  const context = { queueHubTrackerEvent: (...args) => queued.push(args), document: { body: { dataset: { lpVersion: 'test' } } } };
  vm.createContext(context); vm.runInContext(source, context);
  context.trackHubConversion('purchase', { eventId: 'original_gateway_eid', orderId: 'pay_test' });
  assert.equal(queued[0][0], 'track');
  assert.equal(queued[0][1], 'Purchase');
  assert.equal(queued[0][3], 'original_gateway_eid');
});

test('opening the initial form is not IC; payment stage IDs deduplicate independently of Purchase eid', () => {
  const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');
  const stageSource = html.slice(html.indexOf('    function trackCheckoutStage('), html.indexOf('    function fireLeadTrackingEvent('));
  const opened = html.slice(html.indexOf('    function openCheckoutModal('), html.indexOf('    function closeCheckoutModal('));
  assert.doesNotMatch(opened, /trackHubConversion\('initiateCheckout'/);
  assert.match(opened, /currentCheckoutStep === 4/);
  const events = [], capturedLeads = [], store = new Map();
  const context = { trackedCheckoutStages: new Set(), getCheckoutId: () => 'checkout_test', getUtms: () => ({ sessionId: 'session_test' }),
    leadCapture: { submit: lead => capturedLeads.push(lead) },
    inputName: { value: ' Cliente Teste ' }, inputEmail: { value: ' cliente@example.invalid ' }, inputPhone: { value: ' 21999990000 ' },
    currentPlan: 'mensal', trackHubConversion: (...args) => events.push(args),
    sessionStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) } };
  vm.createContext(context); vm.runInContext(stageSource, context);
  context.trackCheckoutStage('CREDIT_CARD'); context.trackCheckoutStage('CREDIT_CARD');
  context.trackCheckoutStage('PIX', { paymentId: 'pay_test', eventId: 'checkout_test', amount: 147 });
  context.trackCheckoutStage('PIX', { paymentId: 'pay_test', eventId: 'checkout_test', amount: 147 });
  assert.equal(events.length, 2);
  assert.equal(events[1][1].orderId, 'pay_test');
  assert.equal(events[1][1].eid, 'checkout_test');
  assert.notEqual(events[1][1].eventId, 'checkout_test');
  assert.equal(events[1][1].sessionId, 'session_test');
  assert.equal(capturedLeads[0].checkout_stage, 'CREDIT_CARD');
  assert.equal(capturedLeads[2].checkout_stage, 'PIX');
  assert.equal(capturedLeads[0].name, 'Cliente Teste');
  assert.equal(capturedLeads[0].checkout_id, 'checkout_test');
  assert.equal(capturedLeads[0].sessionId, 'session_test');
});
