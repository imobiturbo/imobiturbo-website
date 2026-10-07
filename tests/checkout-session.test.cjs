const test = require('node:test');
const assert = require('node:assert/strict');
const { create, TTL, createUpsellBuyerProfile, UPSELL_BUYER_KEY, UPSELL_BUYER_TTL } = require('../vagas/checkout-session.js');
const storage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; };
const start = Date.parse('2026-09-26T18:00:00Z');
const record = { paymentId: 'pay_synthetic', gateway: 'asaas', plan: 'mensal', productId: 'comunidade-imobiturbo', eventId: 'synthetic', amount: 147, expiresAt: new Date(start + TTL).toISOString(), pix: { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: 'data:image/png;base64,dGVzdA==' } };
function harness(extra = {}) {
  const state = { clock: start, paid: [], expired: [], pending: [], errors: [], calls: [], response: { ...record, success: true, paid: false, status: 'PENDING' } };
  const options = { key: 'test', productId: record.productId, plans: ['mensal'], storage: storage(), now: () => state.clock,
    fetch: async (url, options) => { state.calls.push({ url, options }); return Response.json(state.response); },
    onPaid: r => state.paid.push(r), onExpired: r => state.expired.push(r), onPending: r => state.pending.push(r), onError: r => state.errors.push(r), ...extra };
  return { state, options, session: create(options) };
}
test('reopening in the same browser resumes the same payment and original deadline', async () => {
  const { session, state, options } = harness();
  session.save(record); state.clock += 12 * 60000;
  const reopened = create(options); await reopened.check();
  assert.equal(reopened.read().paymentId, record.paymentId);
  assert.equal(reopened.read().expiresAt, record.expiresAt);
  assert.equal(reopened.read().pix.copyPaste, record.pix.copyPaste);
  assert.ok(state.calls.every(call => !call.options.method || call.options.method === 'GET'));
});
test('polling never renews the original 30-minute deadline', async () => {
  const { session, state } = harness(); session.save(record);
  state.response.expiresAt = new Date(start + TTL * 2).toISOString();
  state.response.pix = { ...record.pix, expiresAt: state.response.expiresAt };
  await session.check(); assert.equal(session.read().expiresAt, record.expiresAt);
});
test('authoritative deadline shortens a tampered local deadline', async () => {
  const { session, state } = harness(); session.save({ ...record, expiresAt: new Date(start + TTL * 2).toISOString() });
  state.clock = start + TTL + 1; await session.check(); assert.equal(state.expired.length, 1); assert.equal(session.read(), null);
});
test('unpaid expiry clears the record only after provider verification', async () => {
  const { session, state } = harness(); session.save(record); state.clock = start + TTL;
  await session.check(); assert.equal(session.read(), null); assert.equal(state.expired.length, 1); assert.equal(state.calls.length, 1);
});
test('payment approved while away wins over expiry', async () => {
  const { session, state } = harness(); session.save(record); state.clock = start + TTL * 4;
  state.response.paid = true; state.response.status = 'RECEIVED'; await session.check();
  assert.equal(state.paid.length, 1); assert.equal(state.expired.length, 0);
});
test('status outage retains an expired record rather than allowing duplicate charge', async () => {
  const { session, state } = harness({ fetch: async () => { throw new TypeError('offline'); } });
  session.save(record); state.clock = start + TTL * 2; await session.check();
  assert.equal(session.read().paymentId, record.paymentId); assert.equal(state.errors.length, 1); assert.equal(state.expired.length, 0);
});
test('missing QR recovers through GET for the existing charge', async () => {
  const { session, state } = harness(); session.save({ ...record, pix: {} });
  await session.check(); assert.ok(state.calls[0].url.includes('includePix=1')); assert.equal(session.read().pix.copyPaste, record.pix.copyPaste);
});
test('corrupt storage is cleaned and blocked storage keeps an in-memory session', () => {
  const store = storage(); store.setItem('test', '{broken');
  const { session } = harness({ storage: store }); assert.equal(session.read(), null); assert.equal(store.getItem('test'), null);
  const blocked = harness({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } } }).session;
  blocked.save(record); assert.equal(blocked.read().paymentId, record.paymentId);
});
test('persisted whitelist excludes identity and card data', () => {
  const { session, options } = harness(); session.save({ ...record, cpfCnpj: 'synthetic', creditCard: { number: 'synthetic', ccv: 'synthetic' }, name: 'Synthetic Buyer' });
  const saved = JSON.parse(options.storage.getItem('test')); assert.equal(saved.cpfCnpj, undefined); assert.equal(saved.creditCard, undefined); assert.equal(saved.name, undefined);
});
test('upsell buyer profile is a short-lived session-only whitelist without card credentials', () => {
  const store = storage(); let clock = start;
  const profile = createUpsellBuyerProfile({ storage: store, now: () => clock });
  assert.equal(profile.save({
    name: 'Compradora Sintética', email: 'buyer@example.invalid', phone: '(21) 98765-4322',
    cpfCnpj: '529.982.247-25', cardHolderName: 'Titular Sintético',
    creditCard: { number: '4111111111111111', expiryMonth: '12', expiryYear: '30', ccv: '123' },
    number: '4111111111111111', cvv: '123',
  }), true);
  const saved = JSON.parse(store.getItem(UPSELL_BUYER_KEY));
  assert.deepEqual(Object.keys(saved).sort(), ['version', 'expiresAt', 'name', 'email', 'phone', 'cpfCnpj', 'cardHolderName'].sort());
  assert.equal(saved.cpfCnpj, '52998224725');
  assert.equal(saved.cardHolderName, 'Titular Sintético');
  assert.equal(profile.read().email, 'buyer@example.invalid');
  assert.equal(JSON.stringify(saved).includes('4111111111111111'), false);
  assert.equal(JSON.stringify(saved).includes('123'), false);
  clock += UPSELL_BUYER_TTL;
  assert.equal(profile.read(), null);
  assert.equal(store.getItem(UPSELL_BUYER_KEY), null);
});
test('blocked or invalid session storage does not block checkout or return a partial buyer profile', () => {
  const blocked = createUpsellBuyerProfile({ storage: {
    getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); },
  } });
  assert.equal(blocked.save({ name: 'Buyer', email: 'buyer@example.invalid', phone: '21987654322', cpfCnpj: '123' }), false);
  assert.equal(blocked.read(), null);
});
test('consulting installment metadata survives same-browser recovery without persisting card data', () => {
  const { session, options } = harness({ productId: 'consultoria-individual-natan', plans: ['consultoria'] });
  session.save({
    paymentId: 'pay_consulting', gateway: 'asaas', plan: 'consultoria', productId: 'consultoria-individual-natan',
    eventId: 'abc123def45', orderId: 'consultoria-abc123def45', amount: 588, chargeAmount: 49,
    installmentCount: 12, installmentValue: 49, offerCode: 'consultoria-12x49',
    expiresAt: new Date(start + TTL).toISOString(), method: 'CREDIT_CARD', creditCard: { number: 'synthetic', ccv: 'synthetic' },
  });
  const saved = JSON.parse(options.storage.getItem('test'));
  assert.equal(saved.installmentCount, 12); assert.equal(saved.installmentValue, 49);
  assert.equal(saved.offerCode, 'consultoria-12x49'); assert.equal(saved.orderId, 'consultoria-abc123def45');
  assert.equal(saved.creditCard, undefined);
});
for (let count = 2; count <= 11; count++) {
  test(`consulting ${count}x metadata survives same-browser recovery`, () => {
    const { session } = harness({ productId: 'consultoria-individual-natan', plans: ['consultoria'] });
    const totalCents = count <= 3 ? 49700 : 58800;
    const firstInstallment = Math.floor(totalCents / count) / 100;
    session.save({
      paymentId: `pay_consulting_${count}x`, gateway: 'asaas', plan: 'consultoria', productId: 'consultoria-individual-natan',
      eventId: `order-${count}`, orderId: `consultoria-order-${count}`, amount: totalCents / 100, chargeAmount: firstInstallment,
      installmentCount: count, installmentValue: firstInstallment, offerCode: `consultoria-${count}x`,
      expiresAt: new Date(start + TTL).toISOString(), method: 'CREDIT_CARD',
    });
    assert.equal(session.read().installmentCount, count);
    assert.equal(session.read().installmentValue, firstInstallment);
    assert.equal(session.read().offerCode, `consultoria-${count}x`);
  });
}
test('wrong product or plan cannot redirect to approved', async () => {
  const { session, state } = harness(); session.save(record); state.response.paid = true;
  state.response.productId = 'consultoria-individual-natan'; await session.check();
  assert.equal(state.paid.length, 0); assert.equal(state.errors.length, 1);
});
test('simultaneous status checks share one request and ignore stale results', async () => {
  let finish; let calls = 0;
  const { session, state } = harness({ fetch: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  session.save(record); const first = session.check(); const second = session.check(); assert.equal(calls, 1);
  session.clear(); finish(Response.json({ ...record, success: true, paid: true })); await Promise.all([first, second]);
  assert.equal(state.paid.length, 0); assert.equal(session.read(), null);
});
test('subscription ID transitions to actual payment without resetting the window', async () => {
  const { session } = harness(); session.save({ ...record, paymentId: 'sub_synthetic', method: 'CREDIT_CARD' });
  await session.check(); assert.equal(session.read().paymentId, record.paymentId); assert.equal(session.read().expiresAt, record.expiresAt);
});
test('Pix Automatic consent survives reload with its mode and original QR', async () => {
  const { session, options, state } = harness();
  const automatic = { ...record, paymentId: 'auto_33333333-3333-4333-8333-333333333333',
    method: 'PIX', managedCommunity: true, pixAutomatic: true, checkoutMode: 'transparent' };
  session.save(automatic);
  state.response = { ...automatic, success: true, status: 'PENDING' };
  const reopened = create(options);
  await reopened.check();
  assert.equal(reopened.read().pixAutomatic, true);
  assert.equal(reopened.read().checkoutMode, 'transparent');
  assert.equal(reopened.read().pix.copyPaste, record.pix.copyPaste);
  assert.ok(state.calls[0].url.includes('paymentId=auto_'));
  session.save({ ...record, method: 'PIX' });
  assert.equal(session.read().pixAutomatic, false, 'historical monthly Pix remains a one-off payment');
});

const { createCommunityIntent, COMMUNITY_INTENT_KEY } = require('../vagas/checkout-session.js');
const financialKey = '22222222-2222-4222-8222-222222222222';
const secondKey = '66666666-6666-4666-8666-666666666666';
const intentPayload = { plan: 'anual', paymentMethod: 'CREDIT_CARD', installments: 12, name: 'Auditoria Imobiturbo',
  email: 'auditoria@example.invalid', phone: '11963824751', eventId: 'original-attribution', cpfCnpj: '52998224725',
  creditCard: { number: '4111111111111111', ccv: '123' }, tracking: { visitorId: 'synthetic' } };
function intentHarness(response = { success: true, orderStatus: 'uncertain', paid: false }) {
  const saved = storage(), calls = [];
  const options = { storage: saved, uuid: () => financialKey, fetch: async url => { calls.push(url); return Response.json(response); } };
  return { saved, calls, options, intent: createCommunityIntent(options), response };
}
test('automatic consent and monthly one-off Pix are distinct financial intentions', async () => {
  const h = intentHarness({ success: true, orderStatus: 'failed', retryCreationAllowed: true });
  const monthly = { ...intentPayload, plan: 'mensal', paymentMethod: 'PIX', installments: 1 };
  await h.intent.begin(monthly);
  const fingerprint = h.intent.read().fingerprint;
  const automatic = await createCommunityIntent({ ...h.options, uuid: () => secondKey }).begin({ ...monthly, pixAutomatic: true });
  assert.equal(automatic.payload.idempotencyKey, secondKey);
  assert.notEqual(h.intent.read().fingerprint, fingerprint);
  assert.equal(h.intent.read().pixAutomatic, true);
});
test('financial intention is durably persisted before POST, without CPF/card/buyer/tracking values', async () => {
  const h = intentHarness(); const attempt = await h.intent.begin(intentPayload);
  assert.equal(attempt.payload.idempotencyKey, financialKey);
  assert.notEqual(attempt.payload.idempotencyKey, attempt.payload.eventId);
  const persisted = JSON.parse(h.saved.getItem(COMMUNITY_INTENT_KEY));
  assert.equal(persisted.state, 'submitting'); assert.equal(h.calls.length, 0);
  for (const secret of [intentPayload.email, intentPayload.name, intentPayload.phone, intentPayload.cpfCnpj, intentPayload.creditCard.number, 'visitorId']) {
    assert.ok(!h.saved.getItem(COMMUNITY_INTENT_KEY).includes(secret));
  }
});
test('lost response and reload retain the same immutable intention and original attribution, without TTL', async () => {
  const h = intentHarness(); await h.intent.begin(intentPayload); h.intent.uncertain();
  const reopened = createCommunityIntent(h.options);
  const recovered = await reopened.begin({ ...intentPayload, plan: 'mensal', eventId: 'different-attribution' });
  assert.ok(!recovered.payload); assert.equal(recovered.result.eventId, intentPayload.eventId);
  assert.equal(reopened.read().idempotencyKey, financialKey);
  assert.equal(reopened.read().plan, 'anual'); assert.equal(reopened.read().expiresAt, undefined);
  assert.equal(new URL(h.calls[0], 'https://example.invalid').searchParams.get('idempotencyKey'), financialKey);
});
test('MISSING retries the same key; it cannot rotate an uncertain in-flight intention after buyer/offer changes', async () => {
  const h = intentHarness({ success: true, status: 'MISSING', retryCreationAllowed: true });
  await h.intent.begin(intentPayload); h.intent.uncertain();
  const retry = await createCommunityIntent(h.options).begin({ ...intentPayload, cpfCnpj: '11111111111' });
  assert.equal(retry.payload.idempotencyKey, financialKey);
  const changed = await createCommunityIntent({ ...h.options, uuid: () => secondKey }).begin({ ...intentPayload, plan: 'mensal' });
  assert.ok(!changed.payload); assert.equal(h.intent.read().idempotencyKey, financialKey);
});
test('authoritative failed/no-effect result permits correction; successful creation never permits another POST', async () => {
  const h = intentHarness({ success: true, orderStatus: 'failed', retryCreationAllowed: true });
  await h.intent.begin(intentPayload);
  const corrected = await createCommunityIntent(h.options).begin({ ...intentPayload, creditCard: { number: '4222222222222222' } });
  assert.equal(corrected.payload.idempotencyKey, financialKey);
  Object.assign(h.response, { orderStatus: 'created', retryCreationAllowed: false, paymentId: 'pay_synthetic' });
  const replay = await h.intent.begin(intentPayload); assert.ok(!replay.payload); assert.equal(replay.result.paymentId, 'pay_synthetic');
});
test('blocked/corrupt persistent storage cannot silently replace the financial key', async () => {
  const broken = createCommunityIntent({ storage: { getItem: () => null, setItem: () => { throw new Error('blocked storage'); } }, uuid: () => financialKey });
  await assert.rejects(broken.begin(intentPayload));
  const h = intentHarness(); h.saved.setItem(COMMUNITY_INTENT_KEY, '{broken');
  await assert.rejects(h.intent.begin(intentPayload));
  assert.equal(h.saved.getItem(COMMUNITY_INTENT_KEY), '{broken');
});
test('managed payment deadline does not unlock a new charge during authoritative pending status', async () => {
  const { session, state } = harness(); session.save({ ...record, managedCommunity: true, checkoutOrderId: financialKey });
  state.clock += TTL * 50; state.response.managedCommunity = true;
  await session.check(); assert.equal(session.read().paymentId, record.paymentId); assert.equal(state.expired.length, 0);
});
