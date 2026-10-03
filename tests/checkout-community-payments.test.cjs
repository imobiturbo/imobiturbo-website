const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, load, orderFixture, paymentFixture, env, ORDER_ID,
  recurringOrderFixture, installmentOrderFixture, historicalRefundFixture } = require('./checkout-community-routes.test.cjs');
test('calendar periods clamp month ends and leap years', async () => {
  const { communityCalendarPeriod } = await load('_community-payments.js');
  for (const [date, months, expected] of [['2024-01-31',1,'2024-02-29'],['2024-02-29',12,'2025-02-28'],['2026-11-30',3,'2027-02-28'],['2026-12-31',1,'2027-01-31']]) {
    assert.equal(communityCalendarPeriod(date, months).period_end, `${expected}T00:00:00.000Z`);
  }
  assert.throws(() => communityCalendarPeriod('2026-02-30', 1));
});
test('DATE with no verified zone never invents an instant; settlement is not first confirmation', async () => {
  const { confirmationProof } = await load('_community-payments.js');
  const proof = confirmationProof(paymentFixture(), 'production');
  assert.equal(proof.precision, 'date'); assert.equal(proof.confirmed_date, '2026-10-03');
  assert.equal(proof.provider_time_zone, null); assert.equal(proof.time_zone_evidence_ref, null); assert.equal(proof.confirmed_at, undefined);
  assert.equal(confirmationProof(paymentFixture(undefined, { confirmedDate: null, dateCreated: '2026-10-01', paymentDate: '2026-10-03' }), 'production').precision, 'unresolved');
});
test('date/unresolved proof records paid finance with null timestamps and unresolved Club enrollment', async t => {
  const h = harness(t, { order: orderFixture() });
  assert.equal((await h.webhook()).data.paid, true);
  assert.equal(h.state.records[0].paid_at, null); assert.equal(h.state.records[0].verified_paid_at, null);
  assert.deepEqual(h.state.records[0].club_enrollment_verification, { outcome: 'unresolved' });
  h.state.payments.get('pay_synthetic').confirmedDate = null;
  assert.equal((await h.status()).data.paid, true);
  assert.equal(h.state.records[1].confirmation_proof.precision, 'unresolved');
});
test('CONFIRMED -> RECEIVED retains first confirmation proof and one competence', async t => {
  const h = harness(t, { order: orderFixture() }); await h.webhook();
  const original = h.state.records[0]; h.state.prior = [{ confirmation_proof: original.confirmation_proof }];
  Object.assign(h.state.payments.get('pay_synthetic'), { status: 'RECEIVED', paymentDate: '2026-11-19' });
  await h.webhook({ id: 'evt_received' });
  assert.deepEqual(h.state.records[1].confirmation_proof, original.confirmation_proof);
  assert.equal(h.state.records[1].competence_key, original.competence_key);
  assert.equal(h.state.records[1].period_end, original.period_end);
});
test('installment group is one purchase even when a later parcel is received first', async t => {
  const base = orderFixture();
  const order = orderFixture({ provider_installment_id: 'ins_synthetic', sold_snapshot: { ...base.sold_snapshot,
    offer_key: 'comunidade-anual', duration_months: 12, price_mode: 'installment_card', contract_total_cents: 116400, installment_count: 12 } });
  const h = harness(t, { order });
  h.state.payments.set('pay_second', paymentFixture(order, { id: 'pay_second', installmentNumber: 2, originalDueDate: '2026-11-03' }));
  const { communityConfig } = await load('_community-orders.js'); const { recordCommunityPayment } = await load('_community-payments.js');
  await recordCommunityPayment(communityConfig(env), order, h.state.payments.get('pay_second'));
  await recordCommunityPayment(communityConfig(env), order, h.state.payments.get('pay_synthetic'));
  assert.equal(h.state.records[0].order_id, 'ins_synthetic'); assert.equal(h.state.records[0].competence_key, h.state.records[1].competence_key);
  assert.equal(h.state.records[0].period_start, '2026-10-03T00:00:00.000Z'); assert.equal(h.state.records[0].period_end, '2027-10-03T00:00:00.000Z');
});
test('recurring payment uses originalDueDate and the sold snapshot, not current public catalog', async t => {
  const base = orderFixture(), order = orderFixture({ provider_subscription_id: 'sub_synthetic',
    sold_snapshot: { ...base.sold_snapshot, price_mode: 'recurring_card' } });
  const h = harness(t, { order });
  h.state.subscriptions = [{ customer_id: order.provider_customer_id, email: order.buyer_email, provider_subscription_id: order.provider_subscription_id,
    sold_snapshot: order.sold_snapshot, grace_days: 7, os_organization_id: null, auth_user_id: null, club_organization_id: '2c7053d4-e46e-435f-8d3a-42c65da30130' }];
  await h.webhook(); const p = h.state.records[0];
  assert.equal(p.order_id, `${ORDER_ID}:2026-10-03`); assert.equal(p.competence_key, 'subscription:sub_synthetic:2026-10-03');
  assert.equal(p.period_end, '2026-11-03T00:00:00.000Z');
});
for (const products of [['os'], ['club']]) test(`sold fixture ${products}: only contracted product, no universal both-products grant`, async t => {
  const base = orderFixture(), order = orderFixture({ sold_snapshot: { ...base.sold_snapshot, offer_key: `fixture-${products}`, products } });
  const h = harness(t, { order }); await h.webhook();
  assert.equal(h.state.records[0].club_organization_id === null, products[0] === 'os');
  assert.deepEqual((await h.status()).data.products, products);
});
for (const override of [{ customer: 'cus_other' }, { value: 1 }, { subscription: 'sub_other' }, { externalReference: 'community:99999999-9999-4999-8999-999999999999' }]) {
  test(`provider mismatch ${JSON.stringify(override)} cannot record or notify`, async t => {
    const order = orderFixture(), h = harness(t, { order, payment: paymentFixture(order, override) });
    const result = await h.webhook(); assert.equal(result.response.status, 422); assert.equal(h.state.records.length, 0);
  });
}

test('renewals do not reuse the client attribution eid as the financial event journal identity', async t => {
  const base = orderFixture(), order = orderFixture({ provider_subscription_id: 'sub_synthetic',
    sold_snapshot: { ...base.sold_snapshot, price_mode: 'recurring_card' } });
  const h = harness(t, { order });
  h.state.payments.set('pay_renewal', paymentFixture(order, { id: 'pay_renewal', originalDueDate: '2026-11-03', confirmedDate: '2026-11-03' }));
  const { communityConfig } = await load('_community-orders.js');
  const { communityOrderStatus } = await load('_community-payments.js');
  await communityOrderStatus(communityConfig(env), order, 'client-attribution-eid');
  const events = new Set(h.state.records.map(p => p.event_id));
  assert.ok(events.has('lookup:pay_synthetic:CONFIRMED')); assert.ok(events.has('lookup:pay_renewal:CONFIRMED'));
  assert.ok(!events.has('client-attribution-eid'));
  assert.equal(new Set(h.state.records.map(p => p.competence_key)).size, 2);
});

test('verified refund after paid history is persisted before ACK without rewriting that history', async t => {
  const h = harness(t, { order: orderFixture() });
  await h.webhook();
  h.state.prior = [{ status: 'CONFIRMED' }];
  h.state.payments.get('pay_synthetic').status = 'REFUNDED';
  const result = await h.webhook({ id: 'evt_refund' });
  assert.equal(result.response.status, 200); assert.equal(result.data.paid, false);
  assert.equal(h.state.records.length, 1); assert.equal(h.state.reviews.length, 1);
  assert.equal(h.state.reviews[0].status, 'REFUNDED');
  assert.equal(h.state.reviews[0].source, 'asaas_payment_lookup');
});
test('review storage failure requests redelivery rather than acknowledging a refund', async t => {
  const h = harness(t, { order: orderFixture(), payment: paymentFixture(undefined, { status: 'REFUNDED' }), reviewFailure: true });
  assert.equal((await h.webhook()).response.status, 503);
  assert.equal(h.state.records.length, 0);
});
test('a partial refund retained as RECEIVED still requires manual financial review', async t => {
  const h = harness(t, { order: orderFixture(), payment: paymentFixture(undefined, { status: 'RECEIVED', refunds: [{ status: 'DONE', value: 10 }] }) });
  const result = await h.webhook();
  assert.equal(result.data.paid, false); assert.equal(result.data.fulfillment, 'manual_financial_review');
  assert.deepEqual(h.state.reviews[0].refunds, [{ status: 'DONE', amount_cents: 1000 }]);
  assert.equal(h.state.records.length, 0);
});
test('a fresh pending checkout waits without creating a financial incident', async t => {
  const h = harness(t, { order: orderFixture(), payment: paymentFixture(undefined, { status: 'PENDING' }) });
  assert.equal((await h.status()).data.paid, false); assert.equal(h.state.reviews.length, 0);
});

test('lost October refund is reconciled even when the latest November subscription payment is fresh PENDING', async t => {
  const order = recurringOrderFixture(), h = harness(t, { order, listPageSize: 1 });
  assert.equal((await h.status()).data.paid, true);
  const positive = structuredClone(h.state.records[0]);
  h.state.prior = [{ provider_payment_id: positive.payment_id, status: 'RECEIVED', confirmation_proof: positive.confirmation_proof }];
  const prior = structuredClone(h.state.prior);
  h.state.payments.get('pay_synthetic').status = 'REFUNDED';
  h.state.payments.set('pay_pending', paymentFixture(order, { id: 'pay_pending', originalDueDate: '2026-11-03', status: 'PENDING', confirmedDate: null }));
  // The list can lag the exact provider GET. Its PENDING label must never hide
  // the refunded historical charge or itself become an incident.
  h.state.listRows = [...h.state.payments.values()].map(p => ({ ...p, status: 'PENDING' }));
  const result = await h.status();
  assert.equal(result.response.status, 200); assert.equal(result.data.status, 'PENDING'); assert.equal(result.data.paid, false);
  assert.equal(result.data.paymentId, 'pay_pending'); assert.equal(result.data.fulfillment, 'manual_financial_review');
  assert.equal(h.state.reviews.length, 1); assert.equal(h.state.reviews[0].payment_id, 'pay_synthetic');
  assert.equal(h.state.reviews[0].status, 'REFUNDED'); assert.equal(h.state.reviews[0].provider_subscription_id, 'sub_synthetic');
  assert.deepEqual(h.state.records, [positive]); assert.deepEqual(h.state.prior, prior);
  const pages = h.state.calls.filter(c => c.path === '/v3/subscriptions/sub_synthetic/payments');
  assert.ok(pages.some(c => new URL(c.url).searchParams.get('offset') === '1'));
  assert.ok(h.state.calls.some(c => c.path === '/v3/payments/pay_synthetic' && c.method === 'GET'));
  await h.status(); assert.equal(h.state.reviews.length, 1); assert.deepEqual(h.state.records, [positive]);
});

for (const negative of [
  { status: 'REFUNDED' },
  { status: 'RECEIVED', refunds: [{ status: 'DONE', value: 10 }] },
  { status: 'RECEIVED', chargeback: { status: 'REQUESTED' } },
  { status: 'RECEIVED', deleted: true },
]) test(`late installment chunk ${JSON.stringify(negative)} uses the same review journal and one purchase period`, async t => {
  const order = installmentOrderFixture(), h = harness(t, { order, listPageSize: 2 });
  assert.equal((await h.status()).data.paid, true);
  const positive = structuredClone(h.state.records[0]);
  h.state.prior = [{ provider_payment_id: 'pay_synthetic', status: 'CONFIRMED', confirmation_proof: positive.confirmation_proof },
    { provider_payment_id: 'pay_part_12', status: 'RECEIVED' }];
  const prior = structuredClone(h.state.prior);
  for (let number = 2; number <= 12; number++) {
    const date = new Date(Date.UTC(2026, 9 + number - 1, 3)).toISOString().slice(0, 10);
    h.state.payments.set(`pay_part_${number}`, paymentFixture(order, { id: `pay_part_${number}`, installmentNumber: number,
      originalDueDate: date, status: 'PENDING', confirmedDate: null, ...(number === 12 ? negative : {}) }));
  }
  const event = { event: 'PAYMENT_CREATED', payment: { id: 'pay_part_2', status: 'PENDING' } };
  const result = await h.webhook(event);
  assert.equal(result.response.status, 200); assert.equal(result.data.paid, false);
  assert.equal(result.data.fulfillment, 'manual_financial_review');
  assert.equal(h.state.reviews.length, 1); assert.equal(h.state.reviews[0].payment_id, 'pay_part_12');
  assert.equal(h.state.reviews[0].provider_installment_id, 'ins_synthetic'); assert.equal(h.state.reviews[0].installment_number, 12);
  assert.equal(h.state.reviews[0].source, 'asaas_payment_lookup');
  assert.ok(h.state.records.every(p => p.competence_key === positive.competence_key && p.period_end === positive.period_end));
  assert.equal(positive.period_end, '2027-10-03T00:00:00.000Z'); assert.deepEqual(h.state.prior, prior);
  const pages = h.state.calls.filter(c => c.path === '/v3/installments/ins_synthetic/payments');
  assert.ok(pages.some(c => new URL(c.url).searchParams.get('offset') === '10'));
  assert.ok(h.state.calls.some(c => c.path === '/v3/payments/pay_part_12' && c.method === 'GET'));
  await h.webhook({ ...event, id: 'evt_repeat' }); assert.equal(h.state.reviews.length, 1);
  const lookup = await h.status();
  assert.equal(lookup.data.paid, true); assert.equal(lookup.data.paymentId, 'pay_synthetic');
  assert.equal(lookup.data.fulfillment, 'manual_financial_review'); assert.equal(lookup.data.periodEnd, positive.period_end);
  assert.equal(h.state.reviews.length, 1); assert.deepEqual(h.state.prior, prior);
  assert.ok(h.state.calls.filter(c => c.host === 'api.asaas.com').every(c => c.method === 'GET'));
});

for (const change of [
  { customer: 'cus_other' }, { subscription: 'sub_other' }, { billingType: 'PIX' }, { value: 1 },
  { externalReference: 'community:99999999-9999-4999-8999-999999999999' },
]) test(`historical negative cannot bypass live binding/snapshot guards ${JSON.stringify(change)}`, async t => {
  const h = historicalRefundFixture(t);
  h.state.listRows = [...h.state.payments.values()].map(p => ({ ...p }));
  Object.assign(h.state.payments.get('pay_synthetic'), change);
  const result = await h.webhook({ payment: { id: 'pay_pending' } });
  assert.equal(result.response.status, 422); assert.equal(h.state.reviews.length, 0); assert.equal(h.state.records.length, 0);
});

for (const change of [
  { environment: 'sandbox' }, { provider: 'other' }, { organization_id: '99999999-9999-4999-8999-999999999999' },
]) test(`negative enumeration keeps the configured provider/environment/tenant namespace ${JSON.stringify(change)}`, async t => {
  const h = historicalRefundFixture(t); Object.assign(h.state.order, change);
  assert.equal((await h.webhook({ payment: { id: 'pay_pending' } })).response.status, 422);
  assert.equal(h.state.reviews.length, 0); assert.equal(h.state.records.length, 0);
});

test('negative enumeration cannot replace the frozen subscription snapshot', async t => {
  const h = historicalRefundFixture(t), order = h.state.order;
  h.state.subscriptions = [{ customer_id: order.provider_customer_id, email: order.buyer_email,
    provider_subscription_id: order.provider_subscription_id,
    sold_snapshot: { ...order.sold_snapshot, contract_total_cents: 1 } }];
  assert.equal((await h.webhook({ payment: { id: 'pay_pending' } })).response.status, 422);
  assert.equal(h.state.reviews.length, 0); assert.equal(h.state.records.length, 0);
});

test('a later pending status of a previously paid charge remains a review, unlike a fresh pending renewal', async t => {
  const h = historicalRefundFixture(t);
  h.state.payments.get('pay_synthetic').status = 'PENDING';
  const result = await h.status(); assert.equal(result.response.status, 200); assert.equal(result.data.paid, false);
  assert.equal(h.state.reviews.length, 1); assert.equal(h.state.reviews[0].payment_id, 'pay_synthetic');
  assert.equal(h.state.reviews[0].status, 'PENDING'); assert.equal(h.state.records.length, 0);
});
