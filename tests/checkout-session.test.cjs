const test = require('node:test');
const assert = require('node:assert/strict');
const { create, TTL } = require('../vagas/checkout-session.js');
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
