const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const helper = import(pathToFileURL(path.join(root, 'functions/api/checkout/_hotmart.js')));
const paid = (extra = {}) => ({ event: 'PURCHASE_APPROVED', data: {
  product: { id: 8559421 }, buyer: { email: 'checkout@example.invalid' },
  purchase: { transaction: 'HP_TEST_ONLY', approved_date: 1790100000000, price: { value: 147, currency_value: 'BRL' }, offer: { code: '4zruzp5h' } }, ...extra,
} });

test('Hotmart rejects missing configuration, absent and incorrect tokens', async () => {
  const { authenticateHotmart } = await helper;
  const request = token => new Request('https://example.invalid', { headers: token ? { 'x-hotmart-hottok': token } : {} });
  assert.equal(await authenticateHotmart(request('secret'), {}), 503);
  assert.equal(await authenticateHotmart(request(), { HOTMART_HOTTOK: 'secret' }), 401);
  assert.equal(await authenticateHotmart(request('different'), { HOTMART_HOTTOK: 'secret' }), 401);
  assert.equal(await authenticateHotmart(request('secret'), { HOTMART_HOTTOK: 'secret' }), 200);
});

test('the monthly opaque offer maps to monthly access', async () => {
  const { parseHotmartEvent } = await helper;
  const result = parseHotmartEvent(paid());
  assert.equal(result.plan, 'mensal');
  assert.equal(result.action, 'activate');
  assert.equal(result.paymentId, 'HP_TEST_ONLY');
});

test('Mimiu and unknown offers cannot grant annual community access', async () => {
  const { parseHotmartEvent } = await helper;
  assert.equal(parseHotmartEvent(paid({ product: { id: 8547534 } })).action, 'ignore');
  const event = paid(); event.data.purchase.offer.code = 'unknown';
  assert.throws(() => parseHotmartEvent(event), /unknown_offer/);
});

test('an unpaid cancellation and subscription cancellation do not revoke paid access', async () => {
  const { parseHotmartEvent } = await helper;
  for (const event of ['PURCHASE_CANCELED', 'PURCHASE_EXPIRED', 'SUBSCRIPTION_CANCELLATION', 'PURCHASE_COMPLETE', 'PURCHASE_COMPLETED']) {
    assert.equal(parseHotmartEvent({ ...paid(), event }).action, 'ignore');
  }
});

test('refunds require manual review and unverified approval status is ignored', async () => {
  const { parseHotmartEvent } = await helper;
  assert.equal(parseHotmartEvent({ ...paid(), event: 'PURCHASE_REFUNDED' }).action, 'review');
  const event = paid(); event.event = 'PURCHASE_DELAYED'; event.data.purchase.status = 'APPROVED';
  assert.equal(parseHotmartEvent(event).action, 'ignore');
});

test('the webhook refuses an unauthenticated Hotmart purchase before any side effect', async t => {
  const { onRequestPost } = await import(pathToFileURL(path.join(root, 'functions/api/checkout/webhook.js')));
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => { calls++; throw new Error('Unexpected network call'); });
  const response = await onRequestPost({
    request: new Request('https://example.invalid/api/checkout/webhook', { method: 'POST', body: JSON.stringify(paid()) }),
    env: { HOTMART_HOTTOK: 'secret' },
  });
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test('checkout URLs preserve the chosen term and do not accept a tracking override', () => {
  const { buildUrl } = require(path.join(root, 'assets/js/hotmart-checkout.js'));
  const plans = { anual: ['vgygksgc', '12'], trimestral: ['k3sq4mg8', '3'], mensal: ['4zruzp5h', '1'] };
  for (const [plan, [offer, split]] of Object.entries(plans)) {
    const url = new URL(buildUrl(plan, { name: 'Teste & Checkout', email: 'checkout@example.invalid', phone: '+55 (11) 99999-9999' }, { off: 'forged', split: 99, visitorId: 'visitor-test', utm_source: 'meta' }));
    assert.equal(url.hostname, 'pay.hotmart.com');
    assert.equal(url.searchParams.get('off'), offer);
    assert.equal(url.searchParams.get('split'), split);
    assert.equal(url.searchParams.get('name'), 'Teste & Checkout');
    assert.equal(url.searchParams.get('phoneac'), '11');
    assert.equal(url.searchParams.get('phonenumber'), '999999999');
    assert.equal(url.searchParams.get('xcod'), 'visitor-test');
    assert.equal(url.searchParams.get('sck'), 'meta||||');
    assert.equal(url.searchParams.get('hidePix'), '1');
  }
  assert.throws(() => buildUrl('unknown'), /Plano inválido/);
});


test('approval requires the provider timestamp for the paid calendar period', async () => {
  const { parseHotmartEvent } = await helper;
  const event = paid();
  assert.equal(parseHotmartEvent(event).approvedAt, new Date(1790100000000).toISOString());
  delete event.data.purchase.approved_date;
  assert.throws(() => parseHotmartEvent(event), /missing_approval_date/);
});

const authenticatedRequest = () => new Request('https://example.invalid/api/checkout/webhook', {
  method: 'POST', headers: { 'x-hotmart-hottok': 'secret' }, body: JSON.stringify(paid()),
});
const testEnv = { HOTMART_HOTTOK: 'secret', COMMUNITY_ORGANIZATION_ID: '11111111-1111-1111-1111-111111111111', SUPABASE_URL: 'https://database.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key' };

test('failed provisioning requests a retry without sending welcome messages or Purchase', async t => {
  const { onRequestPost } = await import(pathToFileURL(path.join(root, 'functions/api/checkout/webhook.js')));
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(String(url));
    assert.equal(url, testEnv.SUPABASE_URL + '/rest/v1/rpc/provision_community_purchase');
    const body = JSON.parse(options.body);
    assert.equal(body.p_organization_id, testEnv.COMMUNITY_ORGANIZATION_ID);
    assert.equal(body.p_transaction_id, 'HP_TEST_ONLY');
    assert.equal(body.p_approved_at, new Date(1790100000000).toISOString());
    assert.equal(body.p_amount_cents, 14700);
    assert.equal(body.p_name, null);
    assert.equal(body.p_phone, null);
    return Response.json({ message: 'synthetic dependency failure' }, { status: 503 });
  });
  const response = await onRequestPost({ request: authenticatedRequest(), env: testEnv });
  assert.equal(response.status, 503);
  assert.equal(calls.length, 1);
});

test('duplicate delivery acknowledges the purchase without repeated notifications or Meta Purchase', async t => {
  const { onRequestPost } = await import(pathToFileURL(path.join(root, 'functions/api/checkout/webhook.js')));
  const calls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(String(url));
    assert.match(String(url), /rpc\/provision_community_purchase$/);
    return Response.json({ success: true, duplicate: true });
  });
  const response = await onRequestPost({ request: authenticatedRequest(), env: testEnv });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, paid: true, duplicate: true });
  assert.equal(calls.length, 1);
});

test('missing organization fails closed before all side effects', async t => {
  const { onRequestPost } = await import(pathToFileURL(path.join(root, 'functions/api/checkout/webhook.js')));
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => { calls++; throw new Error('Unexpected request'); });
  const response = await onRequestPost({ request: authenticatedRequest(), env: { HOTMART_HOTTOK: 'secret' } });
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
});
