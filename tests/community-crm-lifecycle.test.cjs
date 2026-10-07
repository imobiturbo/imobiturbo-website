const test = require('node:test');
const assert = require('node:assert/strict');
const { load, env, orderFixture, ORDER_ID } = require('./checkout-community-routes.test.cjs');
const ORG = '18b103e6-a006-45ac-84d5-62312f45ba77';
const LEAD = 'a1111111-1111-4111-8111-111111111111', CONTACT = 'b1111111-1111-4111-8111-111111111111';
function fixture(t, options = {}) {
  const state = { posts: 0, writes: [], order: orderFixture(), paid: options.paid || false,
    lead: { id: LEAD, contact_id: CONTACT, organization_id: ORG, pipeline_id: 'new-pipeline', stage_id: 'human-stage', status: 'open',
      tags: ['human-label'], source_metadata: { human: 'preserved' }, updated_at: '2026-10-06T00:00:00Z' },
    contact: { id: CONTACT, organization_id: ORG, email: 'checkout@example.invalid', phone_number: '+5511987654320', tags: ['old-contact-label'], updated_at: '2026-10-06T00:00:00Z' } };
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    const u = new URL(url), method = init.method || 'GET';
    if (u.hostname === 'os.imobiturbo.com.br') {
      state.posts++;
      if (options.outage) return Response.json({ error: 'unavailable' }, { status: 503 });
      const payload = JSON.parse(init.body); assert.match(payload.external_id, /^community-contact:[a-f0-9]{64}$/);
      assert.equal(payload.cpfCnpj, undefined); assert.equal(payload.creditCard, undefined);
      return Response.json({ data: { lead_id: LEAD, contact_id: CONTACT } });
    }
    assert.equal(u.origin, 'https://central.example.invalid');
    const table = u.pathname.split('/').pop();
    if (method === 'PATCH') {
      state.writes.push({ table, body: JSON.parse(init.body) });
      const row = table === 'crm_leads' ? state.lead : state.contact;
      if (options.race && !state.raced && table === 'crm_leads') {
        state.raced = true; row.tags.push('concurrent-human'); row.stage_id = 'moved-by-other-terminal'; row.updated_at = '2026-10-06T00:01:00Z';
        return Response.json([]);
      }
      Object.assign(row, JSON.parse(init.body), { updated_at: new Date().toISOString() });
      return Response.json([row]);
    }
    if (table === 'crm_leads') {
      if (u.searchParams.has('id')) return Response.json([state.lead]);
      return Response.json(state.lead.source_metadata.community_checkout_v1 ? [state.lead] : []);
    }
    if (table === 'contacts') return Response.json([state.contact]);
    if (table === 'cobranca_assinaturas') return Response.json(state.paid ? [{ id: 'c1111111-1111-4111-8111-111111111111' }] : []);
    if (table === 'cobranca_competencias') return Response.json([{ id: 'd1111111-1111-4111-8111-111111111111' }]);
    if (table === 'cobranca_pagamentos') return Response.json(state.paid ? [{ status: 'CONFIRMED', provider_payment_id: 'pay_actual_binding' }] : []);
    throw new Error(`Unexpected request ${method} ${table}`);
  });
  return state;
}
test('order creates and records CRM link without browser; retries reuse lead and preserve funnel', async t => {
  const state = fixture(t); const { syncCommunityCrm } = await load('_community-crm.js');
  const config = (await load('_community-orders.js')).communityConfig(env);
  const a = await syncCommunityCrm(config, state.order); const b = await syncCommunityCrm(config, state.order);
  assert.equal(a.lead_id, LEAD); assert.equal(b.lead_id, LEAD); assert.equal(state.posts, 1);
  assert.equal(state.lead.stage_id, 'human-stage'); assert.equal(state.lead.source_metadata.human, 'preserved');
  assert.deepEqual(state.lead.tags.sort(), ['checkout:comunidade','checkout:pendente','human-label'].sort());
  assert.ok(state.contact.tags.includes('old-contact-label'));
  assert.equal(state.writes.some(w => /^cobranca_/.test(w.table)), false);
});
test('CRM outage fails sync, never charges or grants; persisted order can repair later', async t => {
  const state = fixture(t, { outage: true }); const { syncCommunityCrm } = await load('_community-crm.js');
  await assert.rejects(syncCommunityCrm((await load('_community-orders.js')).communityConfig(env), state.order));
  assert.equal(state.writes.length, 0); assert.equal(state.order.status, 'created');
});
test('CAS retry preserves concurrent stage/tag edit from other terminal', async t => {
  const state = fixture(t, { race: true }); const { syncCommunityCrm } = await load('_community-crm.js');
  await syncCommunityCrm((await load('_community-orders.js')).communityConfig(env), state.order);
  assert.ok(state.lead.tags.includes('concurrent-human')); assert.equal(state.lead.stage_id, 'moved-by-other-terminal');
});
test('paid receipt tags buyer; late pending cannot demote paid lead; old unpaid becomes abandoned', async t => {
  const state = fixture(t, { paid: true }); const { syncCommunityCrm } = await load('_community-crm.js');
  const config = (await load('_community-orders.js')).communityConfig(env);
  await syncCommunityCrm(config, state.order);
  assert.ok(state.lead.tags.includes('checkout:pago')); assert.ok(!state.lead.tags.includes('checkout:pendente'));
  state.paid = false; await syncCommunityCrm(config, state.order);
  assert.ok(state.lead.tags.includes('checkout:pago'));
  state.lead.source_metadata = { human: 'preserved' }; state.lead.tags = []; state.contact.tags = [];
  state.order.created_at = '2026-10-01T00:00:00Z'; await syncCommunityCrm(config, state.order);
  assert.ok(state.lead.tags.includes('checkout:abandonado'));
});
test('different contact owner is rejected rather than updating a foreign CRM identity', async t => {
  const state = fixture(t); state.contact.email = 'someone-else@example.invalid';
  const { syncCommunityCrm } = await load('_community-crm.js');
  await assert.rejects(syncCommunityCrm((await load('_community-orders.js')).communityConfig(env), state.order));
  assert.equal(state.writes.length, 0);
});
test('internal reconciler rejects unauthenticated caller before any storage', async t => {
  const route = await load('community-crm.js');
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not access storage'); });
  const res = await route.onRequestPost({ request: new Request('https://site.test/api/checkout/community-crm', { method: 'POST' }), env: { COMMUNITY_INTERNAL_TOKEN: 'private-test' } });
  assert.equal(res.status, 401);
});
test('batch advances failed contact-only carts with an independent cyclic cursor', async t => {
  const { reconcileCommunityCrm } = await load('_community-crm.js');
  const rows = [1,2,3].map(n=>({ id: `${n}1111111-1111-4111-8111-111111111111`, contact_id: CONTACT, created_at: `2026-10-0${n}T00:00:00Z` }));
  const observed = [];
  t.mock.method(globalThis, 'fetch', async (url, init={}) => {
    const u = new URL(url), table = u.pathname.split('/').pop();
    if (table === 'cobranca_pedidos') return Response.json([]);
    if (table === 'contacts') return Response.json([]); // First two are invalid; must not starve the third.
    if (table === 'crm_leads') { observed.push(u.searchParams.get('or')); return Response.json(u.searchParams.has('or') ? [rows[2]] : rows); }
    throw Error('Unexpected table');
  });
  const first = await reconcileCommunityCrm(env);
  assert.equal(first.pending, 2); assert.equal(first.next_cursor.leads.id, rows[1].id);
  const next = await reconcileCommunityCrm(env, first.next_cursor);
  assert.equal(next.pending, 1); assert.equal(next.next_cursor.leads, null);
  assert.match(observed[1], new RegExp(rows[1].id));
});
test('batch budget yields a receipt/cursor before attempting another slow order', async t => {
  const { reconcileCommunityCrm } = await load('_community-crm.js');
  const order = orderFixture(); let time = 0, reads = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    const table = new URL(url).pathname.split('/').pop();
    if (table === 'cobranca_pedidos') return Response.json([order, { ...order, id: CONTACT }, { ...order, id: LEAD }]);
    if (table === 'cobranca_assinaturas') { reads++; time = 31000; throw Error('slow/downstream'); }
    if (table === 'crm_leads') return Response.json([]);
    throw Error('Unexpected table');
  });
  const result = await reconcileCommunityCrm(env, null, ()=>time);
  assert.equal(reads, 1); assert.equal(result.pending, 1); assert.equal(result.next_cursor.orders.id, order.id);
});
