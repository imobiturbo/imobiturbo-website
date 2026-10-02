const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = file => import(pathToFileURL(path.resolve(__dirname, '../functions/api', file)));
const leadId = '550e8400-e29b-41d4-a716-446655440000';
const env = {
  ZEPTOMAIL_API_KEY: 'mock-zepto', ZEPTOMAIL_FROM_EMAIL: 'support@example.invalid',
  META_ACCESS_TOKEN: 'mock-meta', HUB_TRACKING_COLLECT_URL: 'https://hub.mock/api/collect', HUB_TRACKING_OPERATION_ID: 'operation_mock',
  ASAAS_API_KEY: 'mock-key', ASAAS_WEBHOOK_TOKEN: 'mock-webhook', OFICINA_ASAAS_WEBHOOK_TOKEN: 'mock-office-webhook-token-32-chars-long', OFICINA_SETUP_TOKEN: 'mock-office-setup-token-32-chars-long',
  OFICINA_CHECKOUT_URL: 'https://www.asaas.com/c/mock-oficina', OFICINA_PAYMENT_LINK_ID: 'link_mock',
  SUPABASE_URL: 'https://crm.mock', SUPABASE_SERVICE_ROLE_KEY: 'mock-service',
  OFICINA_CRM_ORGANIZATION_ID: 'org_mock', OFICINA_CRM_SOURCE_ID: 'source_mock',
  OFICINA_CRM_FORM_URL: 'https://os.mock/api/v1/public/form-sources/token_mock', OFICINA_CRM_FORM_TOKEN: 'mock-source-secret',
};
const lead = { name: 'Participante Fictício', email: 'example@example.invalid', phone: '11999999999', profile: 'corretor', consent: true,
  tracking: { utm_source: 'meta', ignored: 'should-not-propagate' } };
const payment = { id: 'pay_mock', customer: 'cus_mock', externalReference: 'oficina-imobiturbo-202610', paymentLink: 'link_mock', value: 47, billingType: 'PIX', status: 'CONFIRMED' };
const fixedLink = { id: 'link_mock', url: env.OFICINA_CHECKOUT_URL, name: 'Oficina Imobiturbo - 9 e 10 outubro 2026', externalReference: 'oficina-imobiturbo-202610', value: 47, billingType: 'UNDEFINED', chargeType: 'DETACHED', maxInstallmentCount: 1, notificationEnabled: true, active: true, callback: { successUrl: 'https://www.imobiturbo.com.br/oficina/obrigado/' } };
const source = { id: 'source_mock', organization_id: 'org_mock', path_token: 'token_mock', is_active: true, status: 'active', kind: 'lead_capture', default_pipeline_id: 'pipeline_mock', config: { require_auth: true, oficina_no_notifications_confirmed: true } };

const stages = ['inscricao', 'pago', 'acompanhamento', 'reembolso'].map(slug => ({ id: 'stage_' + slug, slug, organization_id: 'org_mock', pipeline_id: 'pipeline_mock' }));

function routes(t, opts = {}) {
  const calls = [];
  let metadata = opts.metadata ?? { form_source_id: 'source_mock', unrelated: 'keep' };
  let fields = opts.fields || {};
  let conflicts = opts.conflicts || 0;
  let stageId = opts.stageId || 'stage_inscricao';
  const pipelineId = opts.pipelineId || 'pipeline_mock';
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(String(input));
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url: url.href, method: options.method || 'GET', body, options });
    if (url.origin === 'https://api.zeptomail.com') {
      if (opts.welcomeDelay) await opts.welcomeDelay();
      if (opts.welcomeTimeout) throw new Error('synthetic timeout');
      if (opts.welcomeRejected) return Response.json({ data: { error_code: 'TM_3004' } }, { status: 400 });
      return Response.json({ data: [{ code: 'EM_104' }], request_id: 'mock-mail-receipt' });
    }
    if (url.origin === 'https://hub.mock') return opts.hubError ? new Response('', { status: 503 }) : Response.json({ ok: true });
    if (url.origin === 'https://graph.facebook.com') return opts.metaError ? Response.json({ error: {} }, { status: 500 }) : Response.json({ events_received: 1 });
    if (url.pathname === '/rest/v1/contacts') return Response.json([{ name: 'Original CRM', email: 'original@example.invalid', phone_number: '+5511999999999' }]);
    if (url.origin === 'https://api.asaas.com' && url.pathname.startsWith('/v3/paymentLinks/')) return Response.json(fixedLink);
    if (url.origin === 'https://api.asaas.com' && url.pathname === '/v3/paymentLinks') return Response.json({ data: [fixedLink], hasMore: false });
    if (url.origin === 'https://api.asaas.com' && url.pathname.startsWith('/v3/payments/')) {
      assert.equal(options.headers.access_token, env.ASAAS_API_KEY);
      return opts.providerError ? new Response('', { status: 503 }) : Response.json(opts.payment || payment);
    }
    if (url.origin === 'https://api.asaas.com' && url.pathname.startsWith('/v3/customers/')) {
      return Response.json({ id: 'cus_mock', name: 'Comprador Fictício', email: 'buyer@example.invalid', mobilePhone: '11999999999', ...opts.customer });
    }
    if (url.pathname === '/rest/v1/crm_stages') {
      assert.equal(url.searchParams.get('organization_id'), 'eq.org_mock');
      assert.equal(url.searchParams.get('pipeline_id'), 'eq.pipeline_mock');
      return Response.json(opts.stages || stages);
    }
    if (url.pathname === '/rest/v1/webhook_sources') {
      assert.equal(url.searchParams.get('organization_id'), 'eq.org_mock');
      assert.equal(options.headers.Authorization, 'Bearer mock-service');
      return Response.json(opts.source === null ? [] : [opts.source || source]);
    }
    if (url.href === env.OFICINA_CRM_FORM_URL) {
      if (opts.onCapture) await opts.onCapture(body);
      assert.equal(options.headers.Authorization, 'Bearer mock-source-secret');
      return opts.captureError ? new Response('', { status: 500 }) : Response.json({ data: { lead_id: leadId } });
    }
    if (url.pathname === '/rest/v1/crm_leads') {
      if (url.searchParams.has('contact.email_normalized')) {
        assert.equal(url.searchParams.get('organization_id'), 'eq.org_mock');
        assert.equal(url.searchParams.get('source_metadata->>form_source_id'), 'eq.source_mock');
        assert.equal(url.searchParams.get('contact.organization_id'), 'eq.org_mock');
        assert.equal(url.searchParams.get('limit'), '2');
        return Response.json(opts.officeEmailMatches || []);
      }
      assert.equal(url.searchParams.get('organization_id'), 'eq.org_mock');
      assert.equal(url.searchParams.get('source_metadata->>form_source_id'), 'eq.source_mock');
      if (options.method === 'PATCH') {
        assert.equal(url.searchParams.get('source_metadata'), null);
        assert.ok(url.searchParams.get('custom_fields')?.startsWith('eq.'));
        if (url.searchParams.get('custom_fields') !== 'eq.' + JSON.stringify(fields)) return Response.json([]);
        if (opts.failWelcomeSentPersistence && body.custom_fields?._oficina_payments?.pay_mock?.welcomeDelivery?.status === 'sent') return Response.json([]);
        assert.deepEqual(Object.keys(body).sort(), body.stage_id ? ['custom_fields', 'stage_id'] : ['custom_fields']);
        if (body.stage_id) {
          assert.equal(url.searchParams.get('pipeline_id'), 'eq.pipeline_mock');
          if (opts.concurrentStage) { stageId = opts.concurrentStage; opts.concurrentStage = null; }
          if (url.searchParams.get('stage_id') !== 'eq.' + stageId) return Response.json([]);
        }
        if (conflicts-- > 0) return Response.json([]);
        if (body.custom_fields) fields = body.custom_fields;
        if (body.stage_id) stageId = body.stage_id;
        return Response.json([{ id: leadId }]);
      }
      return Response.json(opts.missingLead ? [] : [{ id: leadId, contact_id: 'contact_mock', source_metadata: metadata, custom_fields: fields, stage_id: stageId, pipeline_id: pipelineId }]);
    }
    throw new Error('Unexpected external side effect: ' + url.href);
  });
  return { calls, stageId: () => stageId, moveStage: value => { stageId = value; }, metadata: () => metadata, fields: () => fields, overwriteSource: snapshot => { metadata = structuredClone(snapshot); } };
}
function webhookRequest(payload = { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_mock' } }, token = env.OFICINA_ASAAS_WEBHOOK_TOKEN) {
  return new Request('https://website.mock/api/checkout/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'asaas-access-token': token }, body: JSON.stringify(payload) });
}
async function webhook(environment = env, request = webhookRequest()) {
  return (await load('oficina/webhook.js')).onRequestPost({ request, env: environment });
}
async function leadRequest(input = lead, environment = env) {
  return (await load('oficina/lead.js')).onRequestPost({ request: new Request('https://website.mock/api/oficina/lead', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }), env: environment });
}

test('config confirms authorized dates/price and exposes only the hosted link', async () => {
  const fn = (await load('oficina/config.js')).onRequestGet;
  assert.deepEqual(await (await fn({ env })).json(), { checkoutUrl: env.OFICINA_CHECKOUT_URL, price: 47, datesConfirmed: true });
  for (const url of ['http://www.asaas.com/c/x', 'https://evil.invalid/c/x', 'https://user:pass@www.asaas.com/c/x']) {
    assert.equal((await fn({ env: { ...env, OFICINA_CHECKOUT_URL: url } })).status, 503);
  }
});

test('valid lead uses real authenticated form contract and stable dedup key, not legacy proxy', async t => {
  const mock = routes(t);
  assert.equal((await leadRequest()).status, 200);
  assert.equal((await leadRequest({ ...lead, profile: 'gestor' })).status, 200);
  const forms = mock.calls.filter(c => c.url === env.OFICINA_CRM_FORM_URL);
  assert.equal(forms[0].body.external_id, forms[1].body.external_id);
  assert.equal(forms[0].body.phone, '+5511999999999');
  assert.equal(forms[0].body.oficina_profile, 'corretor');
  assert.equal(forms[0].body.oficina_consent, true);
  assert.equal(forms[0].body.utm_source, 'meta');
  assert.equal(forms[0].body.ignored, undefined);
  assert.ok(mock.calls.every(c => c.url.startsWith('https://crm.mock/') || c.url === env.OFICINA_CRM_FORM_URL || (c.url.startsWith('https://api.asaas.com/v3/paymentLinks') && c.method === 'GET')));
});

test('lead validates consent identity profile tracking and JSON before any external call', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('must not fetch'); });
  for (const patch of [{ consent: false }, { consent: 'true' }, { profile: 'admin' }, { name: '' }, { email: 'bad' }, { phone: '123' }, { tracking: [] }, { tracking: { utm_source: {} } }]) {
    assert.equal((await leadRequest({ ...lead, ...patch })).status, 422);
  }
  const fn = (await load('oficina/lead.js')).onRequestPost;
  assert.equal((await fn({ request: new Request('https://website.mock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), env })).status, 400);
});

test('CRM missing credentials fails closed without literal fallback', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('must not fetch'); });
  assert.equal((await leadRequest(lead, { ...env, SUPABASE_SERVICE_ROLE_KEY: '' })).status, 503);
});

test('dedicated source gate blocks ingestion without outgoing automation audit', async t => {
  const mock = routes(t, { source: { ...source, config: { require_auth: true } } });
  assert.equal((await leadRequest()).status, 503);
  assert.equal(mock.calls.length, 1);
});

test('form upstream failure is not acknowledged as a captured lead', async t => {
  routes(t, { captureError: true });
  assert.equal((await leadRequest()).status, 503);
});

test('verified PIX office payment records paid only in source-scoped CRM, duplicate has no patch', async t => {
  const mock = routes(t);
  const first = await webhook();
  assert.equal(first.status, 200);
  assert.equal((await first.json()).state, 'pago');
  const patchesAfterFirst = mock.calls.filter(c => c.method === 'PATCH').length;
  assert.equal((await (await webhook()).json()).duplicate, true);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, patchesAfterFirst);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 1);
  assert.equal(mock.metadata().unrelated, 'keep');
  assert.equal(mock.fields()._oficina_payments.pay_mock.state, 'pago');
  const captured = mock.calls.find(c => c.url === env.OFICINA_CRM_FORM_URL).body;
  assert.equal(captured.external_id, 'oficina:payment:pay_mock');
  assert.equal(captured.oficina_consent, undefined);
  assert.equal(captured.oficina_profile, undefined);
});

for (const [providerStatus, expected] of [['PENDING', 'pendente'], ['OVERDUE', 'pendente'], ['REFUNDED', 'cancelado'], ['CHARGEBACK_REQUESTED', 'cancelado'], ['RECEIVED', 'pago']]) {
  test('provider status wins over notification: ' + providerStatus, async t => {
    routes(t, { payment: { ...payment, status: providerStatus, billingType: 'CREDIT_CARD' } });
    const response = await webhook();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).state, expected);
  });
}

test('payment progression is pending to paid to canceled; late pending cannot regress', async t => {
  const mock = routes(t, { fields: { _oficina_payments: { pay_mock: { state: 'pendente' }, pay_other: { state: 'pago' } } } });
  const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
  const config = await sourceConfig(env);
  assert.equal((await recordPayment(env, leadId, payment, 'pago', config)).state, 'pago');
  assert.deepEqual(await recordPayment(env, leadId, payment, 'pendente', config), { duplicate: true, state: 'pago' });
  assert.equal((await recordPayment(env, leadId, payment, 'cancelado', config)).state, 'cancelado');
  assert.deepEqual(await recordPayment(env, leadId, payment, 'pago', config), { duplicate: true, state: 'cancelado' });
  assert.equal(mock.fields()._oficina_payments.pay_other.state, 'pago');
});

test('CAS retries conflicts and keeps writes scoped to the dedicated CRM lead', async t => {
  const mock = routes(t, { conflicts: 1 });
  assert.equal((await webhook()).status, 200);
  assert.ok(mock.calls.filter(c => c.method === 'PATCH').length >= 5);
});

test('persistent CAS conflicts return retryable failure', async t => {
  routes(t, { conflicts: 4 });
  assert.equal((await webhook()).status, 503);
});

for (const patch of [{ value: 997 }, { billingType: 'CRYPTO' }, { externalReference: 'oficina-imobiturbo-202610:bad' }, { externalReference: '{}' }, { paymentLink: 'wrong' }, { installment: 'ins_mock' }, { subscription: 'sub_mock' }, { status: 'UNKNOWN' }]) {
  test('office validation rejects mismatch before any community side effects: ' + JSON.stringify(patch), async t => {
    const mock = routes(t, { payment: { ...payment, ...patch } });
    assert.equal((await webhook()).status, 422);
    assert.equal(mock.calls.length, 1);
  });
}

test('missing webhook token and invalid token never acknowledge office payment', async t => {
  const mock = routes(t);
  assert.equal((await webhook({ ...env, OFICINA_ASAAS_WEBHOOK_TOKEN: '' })).status, 503);
  assert.equal((await webhook(env, webhookRequest(undefined, 'bad-token'))).status, 401);
  assert.equal(mock.calls.filter(c => c.method === 'POST').length, 0);
});

test('provider outage or divergent ID cannot persist office payment', async t => {
  routes(t, { providerError: true });
  assert.equal((await webhook()).status, 503);
});

test('customer identity failure returns retryable failure, not provisioned membership', async t => {
  routes(t, { customer: { id: 'cus_wrong' } });
  assert.equal((await webhook()).status, 503);
});

test('generic status blocks office payments before notifications and purchase dispatch', async t => {
  const mock = routes(t);
  const response = await (await load('checkout/status.js')).onRequestGet({
    request: new Request('https://website.mock/api/checkout/status?gateway=asaas&paymentId=pay_mock'), env,
  });
  assert.equal(response.status, 409);
  assert.equal(mock.calls.length, 1);
});

test('BOLETO paid at exactly47 is accepted without community provisioning', async t => {
  routes(t, { payment: { ...payment, billingType: 'BOLETO' } });
  assert.equal((await (await webhook()).json()).state, 'pago');
});

test('office webhook resolves configured fixed resource read-only when env link ID is absent', async t => {
  const mock = routes(t);
  const response = await webhook({ ...env, OFICINA_PAYMENT_LINK_ID: '' });
  assert.equal(response.status, 200);
  assert.ok(mock.calls.some(c => c.url.includes('/paymentLinks?')));
  assert.equal(mock.calls.filter(c => c.method === 'POST' && c.url.includes('asaas.com')).length, 0);
});

test('GET config discovers existing link without env URL and never creates resources', async t => {
  const mock = routes(t);
  const response = await (await load('oficina/config.js')).onRequestGet({ env: { ...env, OFICINA_CHECKOUT_URL: '', OFICINA_PAYMENT_LINK_ID: '' } });
  assert.deepEqual(await response.json(), { checkoutUrl: env.OFICINA_CHECKOUT_URL, price: 47, datesConfirmed: true });
  assert.ok(mock.calls.every(c => c.method === 'GET'));
});

test('POST checkout paginates existing resources and reuses the matching link', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(url.searchParams.get('limit'), '100');
    assert.equal(url.searchParams.get('externalReference'), payment.externalReference);
    return Response.json(url.searchParams.get('offset') === '0' ? { data: [{ id: 'other', name: 'other' }], hasMore: true } : { data: [fixedLink], hasMore: false });
  });
  const response = await (await load('oficina/checkout.js')).onRequestPost({ env: { ...env, OFICINA_PAYMENT_LINK_ID: '' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).paymentLinkId, 'link_mock');
  assert.deepEqual(calls.map(u => u.searchParams.get('offset')), ['0', '100']);
});

test('POST checkout creates only fixed paymentLink and reads it back, no customer or charge', async t => {
  const calls = [];
  let created = false;
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(String(input)); calls.push({ url, options });
    assert.ok(url.pathname.startsWith('/v3/paymentLinks'));
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.value, 47);
      assert.equal(body.billingType, 'UNDEFINED');
      assert.equal(body.chargeType, 'DETACHED');
      assert.equal(body.maxInstallmentCount, 1);
      assert.equal(body.notificationEnabled, true);
      assert.equal(body.externalReference, payment.externalReference);
      assert.equal(body.callback, undefined);
      assert.equal(body.customer, undefined);
      created = true;
      return Response.json({ id: 'link_mock' });
    }
    if (url.pathname.endsWith('/link_mock')) { assert.ok(created); return Response.json(fixedLink); }
    return Response.json({ data: [], hasMore: false });
  });
  const fn = (await load('oficina/checkout.js')).onRequestPost;
  const environment = { ...env, OFICINA_PAYMENT_LINK_ID: '' };
  const [a, b] = await Promise.all([fn({ env: environment }), fn({ env: environment })]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(calls.filter(c => c.options.method === 'POST').length, 1);
});

test('GET config with no matching link never POSTs and returns503', async t => {
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    assert.notEqual(options.method, 'POST');
    return Response.json({ data: [], hasMore: false });
  });
  assert.equal((await (await load('oficina/config.js')).onRequestGet({ env: { ...env, OFICINA_CHECKOUT_URL: '', OFICINA_PAYMENT_LINK_ID: '' } })).status, 503);
});

test('invalid or duplicate existing links block creation rather than creating another resource', async t => {
  let duplicated = false;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    assert.notEqual(options.method, 'POST');
    return Response.json({ data: duplicated ? [fixedLink, { ...fixedLink, id: 'link_other' }] : [{ ...fixedLink, value: 997 }], hasMore: false });
  });
  const fn = (await load('oficina/checkout.js')).onRequestPost;
  const environment = { ...env, OFICINA_PAYMENT_LINK_ID: '' };
  assert.equal((await fn({ env: environment })).status, 503);
  duplicated = true;
  assert.equal((await fn({ env: environment })).status, 503);
});

test('provider list failure never triggers resource creation', async t => {
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    assert.notEqual(options.method, 'POST'); return new Response('', { status: 503 });
  });
  assert.equal((await (await load('oficina/checkout.js')).onRequestPost({ env: { ASAAS_API_KEY: 'mock-key' } })).status, 503);
});

test('paid office emits stable Hub/Meta Purchase, CRM original attribution and private rooms, dedup once', async t => {
  const mock = routes(t, { metadata: { form_source_id: 'source_mock', utm_source: 'instagram', utm_campaign: 'original-campaign', fbc: 'original-fbc' }, fields: { visitor_id: 'original-visitor', keep: 'untouched' } });
  assert.equal((await webhook()).status, 200);
  assert.equal((await webhook()).status, 200);
  const hub = mock.calls.filter(c => c.url.startsWith('https://hub.mock/'));
  const meta = mock.calls.filter(c => c.url.startsWith('https://graph.facebook.com/'));
  assert.equal(hub.length, 1); assert.equal(meta.length, 1);
  assert.equal(hub[0].body.eventId, 'oficina-purchase-pay_mock');
  assert.equal(hub[0].body.offerId, 'f8a7e873-472d-5b58-baf4-97dc620c8cb4');
  assert.equal(hub[0].body.valueCents, 4700);
  assert.equal(hub[0].body.netValue, undefined);
  assert.equal(hub[0].body.fees, undefined);
  assert.equal(hub[0].body.currency, 'BRL');
  assert.equal(hub[0].body.productId, payment.externalReference);
  assert.equal(hub[0].body.url, 'https://www.imobiturbo.com.br/oficina/');
  assert.equal(hub[0].body.landing, hub[0].body.url);
  assert.equal(hub[0].body.utm_campaign, 'original-campaign');
  assert.equal(hub[0].body.email, 'original@example.invalid');
  assert.equal(hub[0].body.visitorId, 'original-visitor');
  assert.equal(meta[0].body.access_token, 'mock-meta');
  const event = meta[0].body.data[0];
  assert.equal(event.event_id, hub[0].body.eventId);
  assert.equal(event.event_source_url, hub[0].body.url);
  assert.equal(event.event_name, 'Purchase');
  assert.equal(event.custom_data.value, 47);
  assert.equal(event.custom_data.currency, 'BRL');
  assert.deepEqual(event.custom_data.content_ids, [payment.externalReference]);
  assert.match(event.user_data.em[0], /^[a-f0-9]{64}$/);
  assert.match(event.user_data.ph[0], /^[a-f0-9]{64}$/);
  assert.equal(event.user_data.fbc, 'original-fbc');
  assert.equal(event.user_data.client_ip_address, undefined);
  assert.equal(mock.fields().oficina_room_e1, 'https://meet.google.com/tvd-sxie-voj');
  assert.equal(mock.fields().oficina_room_e2, 'https://meet.google.com/oxg-oqro-upx');
  assert.equal(mock.fields().keep, 'untouched');
});

test('Meta unavailable preserves Hub acknowledgment and returns503 for tracking retry', async t => {
  const mock = routes(t, { metaError: true });
  assert.equal((await webhook()).status, 503);
  assert.equal((await webhook()).status, 503);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://hub.mock/')).length, 1);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://graph.facebook.com/')).length, 2);
  assert.equal(mock.fields()._oficina_payments.pay_mock.hubPurchaseSent, true);
  assert.equal(mock.fields()._oficina_payments.pay_mock.metaPurchaseSent, false);
});

test('pending/canceled office never emits Purchase or exposes room fields', async t => {
  const mock = routes(t, { payment: { ...payment, status: 'PENDING' } });
  assert.equal((await webhook()).status, 200);
  assert.equal(mock.calls.filter(c => c.url.includes('hub.mock') || c.url.includes('graph.facebook.com')).length, 0);
  assert.equal(mock.fields().oficina_room_e1, undefined);
});

test('missing Meta env secret fails closed without credential fallback or invented delivery', async t => {
  const mock = routes(t);
  assert.equal((await webhook({ ...env, META_ACCESS_TOKEN: '' })).status, 503);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://graph.facebook.com/')).length, 0);
});

test('missing env link ID replay resolves provider identity and sends Purchase only once', async t => {
  const mock = routes(t);
  const environment = { ...env, OFICINA_PAYMENT_LINK_ID: '' };
  assert.equal((await webhook(environment)).status, 200);
  assert.equal((await webhook(environment)).status, 200);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://hub.mock/')).length, 1);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://graph.facebook.com/')).length, 1);
  assert.equal(mock.calls.filter(c => c.method === 'POST' && c.url.includes('asaas.com')).length, 0);
});

test('office provider link cannot become community if payment reference is malformed and env ID missing', async t => {
  const mock = routes(t, { payment: { ...payment, externalReference: '{}' } });
  assert.equal((await webhook({ ...env, OFICINA_PAYMENT_LINK_ID: '' })).status, 422);
  assert.equal(mock.calls.filter(c => c.method === 'POST').length, 0);
});

test('provider payment ID mismatch fails before capturing lead or dispatching Purchase', async t => {
  const mock = routes(t, { payment: { ...payment, id: 'pay_other' } });
  assert.equal((await webhook()).status, 422);
  assert.equal(mock.calls.length, 1);
});

test('forged received notification cannot upgrade a provider-refunded payment', async t => {
  const mock = routes(t, { payment: { ...payment, status: 'REFUNDED' } });
  const response = await webhook(env, webhookRequest({ event: 'PAYMENT_RECEIVED', payment: { ...payment, status: 'CONFIRMED' } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).state, 'cancelado');
  assert.equal(mock.calls.filter(c => c.url.includes('hub.mock') || c.url.includes('graph.facebook.com')).length, 0);
});

test('generic legacy webhook acknowledges office delegation without new auth env or CRM side effects', async t => {
  const mock = routes(t);
  const response = await (await load('checkout/webhook.js')).onRequestPost({ request: webhookRequest(undefined, ''), env: { ...env, ASAAS_WEBHOOK_TOKEN: '', OFICINA_ASAAS_WEBHOOK_TOKEN: '' } });
  assert.deepEqual(await response.json(), { ok: true, status: 'delegated_oficina' });
  assert.equal(mock.calls.length, 1);
});

test('dedicated authenticated webhook ignores verified non-office products with200', async t => {
  const mock = routes(t, { payment: { ...payment, externalReference: 'legacy-community', paymentLink: null } });
  assert.deepEqual(await (await webhook()).json(), { ok: true, status: 'ignored_product' });
  assert.equal(mock.calls.length, 1);
});

test('dedicated webhook authentication rejects before processor access', async t => {
  const mock = routes(t);
  assert.equal((await webhook(env, webhookRequest(undefined, 'invalid'))).status, 401);
  assert.equal(mock.calls.length, 0);
});

test('admin setup rejects unauthorized caller before all resource mutations', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('must not call provider'); });
  const response = await (await load('oficina/setup.js')).onRequestPost({ request: new Request('https://website.mock/api/oficina/setup', { method: 'POST' }), env });
  assert.equal(response.status, 401);
});

test('admin setup creates only dedicated webhook, reads back and never exposes token; replay reuses it', async t => {
  const { OFICINA_WEBHOOK_NAME, OFICINA_WEBHOOK_URL, OFICINA_WEBHOOK_EVENTS } = await load('oficina/_setup.js');
  const hook = { id: 'hook_office', name: OFICINA_WEBHOOK_NAME, url: OFICINA_WEBHOOK_URL, enabled: true, interrupted: false, apiVersion: 3, sendType: 'SEQUENTIALLY', authToken: env.OFICINA_ASAAS_WEBHOOK_TOKEN, events: OFICINA_WEBHOOK_EVENTS };
  const calls = [];
  let exists = false;
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(String(input)); calls.push({ url, options });
    if (url.pathname === '/v3/paymentLinks/link_mock') return Response.json(fixedLink);
    if (url.pathname === '/v3/webhooks/hook_office') return Response.json(hook);
    if (url.pathname === '/v3/webhooks' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.name, OFICINA_WEBHOOK_NAME); assert.equal(body.url, OFICINA_WEBHOOK_URL);
      assert.equal(body.email, 'natanpimentel@imobiturbo.com.br');
      assert.equal(body.authToken, env.OFICINA_ASAAS_WEBHOOK_TOKEN);
      assert.deepEqual(body.events, OFICINA_WEBHOOK_EVENTS);
      assert.equal(body.enabled, true); assert.equal(body.interrupted, false);
      exists = true; return Response.json({ id: hook.id });
    }
    if (url.pathname === '/v3/webhooks') return Response.json({ data: exists ? [hook] : [{ id: 'legacy', name: 'legacy', url: 'https://website.mock/api/checkout/webhook' }], hasMore: false });
    throw new Error('Unexpected call ' + url);
  });
  const fn = (await load('oficina/setup.js')).onRequestPost;
  for (let i = 0; i < 2; i++) {
    const response = await fn({ request: new Request('https://website.mock/api/oficina/setup', { method: 'POST', headers: { Authorization: 'Bearer ' + env.OFICINA_SETUP_TOKEN } }), env });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.webhookId, hook.id); assert.equal(body.authConfigured, true);
    assert.equal(JSON.stringify(body).includes(env.OFICINA_ASAAS_WEBHOOK_TOKEN), false);
    assert.equal(body.authToken, undefined);
  }
  assert.equal(calls.filter(c => c.options.method === 'POST').length, 1);
  assert.ok(calls.every(c => !['PUT', 'PATCH', 'DELETE'].includes(c.options.method)));
});

test('payment state is visible in custom_fields and preserves profile and sibling fields under CAS', async t => {
  const mock = routes(t, { fields: { oficina_profile: 'gestor', custom_sibling: 'preserve' } });
  const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
  const config = await sourceConfig(env);
  for (const state of ['pendente', 'pago', 'cancelado']) {
    await recordPayment(env, leadId, payment, state, config);
    assert.equal(mock.fields().oficina_payment_status, state);
    assert.equal(mock.fields().oficina_profile, 'gestor');
    assert.equal(mock.fields().custom_sibling, 'preserve');
    assert.equal(mock.fields()._oficina_payments.pay_mock.state, state);
  }
});

test('paid buyer receives transactional rooms, dates, material and replay only at verified email, no community offer', async t => {
  const mock = routes(t);
  assert.equal((await webhook()).status, 200);
  const mails = mock.calls.filter(c => c.url === 'https://api.zeptomail.com/v1.1/email');
  assert.equal(mails.length, 1);
  assert.equal(mails[0].options.headers.Authorization, 'Zoho-enczapikey mock-zepto');
  assert.equal(mails[0].body.from.address, env.ZEPTOMAIL_FROM_EMAIL);
  assert.equal(mails[0].body.to[0].email_address.address, 'buyer@example.invalid');
  assert.notEqual(mails[0].body.to[0].email_address.address, 'original@example.invalid');
  assert.equal(mails[0].body.client_reference, 'oficina-welcome-pay_mock');
  assert.match(mails[0].body.textbody, /9 de outubro de 2026/);
  assert.match(mails[0].body.textbody, /10 de outubro de 2026/);
  assert.match(mails[0].body.textbody, /19h30–21h30/);
  assert.match(mails[0].body.textbody, /24 de outubro de 2026/);
  assert.ok(mails[0].body.textbody.includes('https://meet.google.com/tvd-sxie-voj'));
  assert.ok(mails[0].body.textbody.includes('https://meet.google.com/oxg-oqro-upx'));
  for (const file of ['carteira-cadencia.csv', 'agenda-sete-dias.csv', 'mensagens-pratica.md']) {
    assert.ok(mails[0].body.textbody.includes('https://www.imobiturbo.com.br/oficina/material/' + file));
  }
  assert.ok(mails[0].body.textbody.includes('suporte@imobiturbo.com.br'));
  assert.equal(mails[0].body.reply_to[0].address, 'suporte@imobiturbo.com.br');
  assert.equal(mails[0].body.textbody.includes('997'), false);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeMailSent, true);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeDelivery.requestId, 'mock-mail-receipt');
});

test('already prefixed ZeptoMail env key is not double-prefixed', async t => {
  const mock = routes(t);
  assert.equal((await webhook({ ...env, ZEPTOMAIL_API_KEY: 'Zoho-enczapikey mock-prefixed' })).status, 200);
  assert.equal(mock.calls.find(c => c.url.startsWith('https://api.zeptomail.com/')).options.headers.Authorization, 'Zoho-enczapikey mock-prefixed');
});

test('missing ZeptoMail secret/from never uses a fallback and leaves webhook retryable', async t => {
  const mock = routes(t);
  assert.equal((await webhook({ ...env, ZEPTOMAIL_API_KEY: '' })).status, 503);
  assert.equal((await webhook({ ...env, ZEPTOMAIL_FROM_EMAIL: '' })).status, 503);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 0);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeMailSent, undefined);
});

test('concurrent welcome attempts acquire one CAS lease and send one email', async t => {
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const mock = routes(t, { fields: { _oficina_payments: { pay_mock: { state: 'pago' } } }, welcomeDelay: () => waiting });
  const { dispatchOficinaWelcome } = await load('oficina/_welcome.js');
  const { sourceConfig } = await load('oficina/_crm.js');
  const config = await sourceConfig(env);
  const input = { env, payment, leadId, config, customer: { email: 'buyer@example.invalid' }, trustedPaymentLinkId: 'link_mock' };
  const a = dispatchOficinaWelcome(input);
  const b = dispatchOficinaWelcome(input);
  // Both claims race with the same initial snapshot; CAS chooses one winner.
  await new Promise(resolve => setImmediate(resolve));
  release();
  const results = await Promise.all([a, b]);
  assert.equal(results.filter(r => r.accepted).length, 1);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 1);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeMailSent, true);
});

test('structured provider rejection returns503 then retries without marking sent before acceptance', async t => {
  const opts = { welcomeRejected: true };
  const mock = routes(t, opts);
  assert.equal((await webhook()).status, 503);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeMailSent, false);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeDelivery.status, 'retry');
  opts.welcomeRejected = false;
  assert.equal((await webhook()).status, 200);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 2);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeMailSent, true);
});

test('accepted email then persistent receipt CAS failure does not resend on duplicate or expired lease', async t => {
  const opts = { failWelcomeSentPersistence: true };
  const mock = routes(t, opts);
  assert.equal((await webhook()).status, 503);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeMailSent, undefined);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeDelivery.status, 'sending');
  opts.failWelcomeSentPersistence = false;
  assert.equal((await webhook()).status, 503);
  mock.fields()._oficina_payments.pay_mock.welcomeDelivery.leaseUntil = Date.now() - 1;
  assert.equal((await webhook()).status, 503);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeDelivery.status, 'uncertain');
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 1);
});

test('provider timeout is held as uncertain instead of resending indefinite copies', async t => {
  const mock = routes(t, { welcomeTimeout: true });
  assert.equal((await webhook()).status, 503);
  assert.equal((await webhook()).status, 503);
  assert.equal(mock.fields()._oficina_payments.pay_mock.welcomeDelivery.status, 'uncertain');
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 1);
});

test('absent provider phone uses exactly one office-scoped verified email contact before capture', async t => {
  const mock = routes(t, { customer: { mobilePhone: '', phone: '' }, officeEmailMatches: [{ id: leadId, contact: { id: 'contact_mock', email_normalized: 'buyer@example.invalid', phone_number: '+5511999999999' } }] });
  assert.equal((await webhook()).status, 200);
  const captured = mock.calls.find(c => c.url === env.OFICINA_CRM_FORM_URL);
  assert.equal(captured.body.phone, '+5511999999999');
  const lookup = mock.calls.find(c => c.url.includes('contact.email_normalized'));
  assert.equal(new URL(lookup.url).searchParams.get('contact.email_normalized'), 'eq.buyer@example.invalid');
});

for (const rows of [[], [{ contact: { email_normalized: 'buyer@example.invalid', phone_number: '+5511999999999' } }, { contact: { email_normalized: 'buyer@example.invalid', phone_number: '+5511888888888' } }]]) {
  test('absent phone does not use an absent/ambiguous email identity (' + rows.length + ')', async t => {
    const mock = routes(t, { customer: { mobilePhone: '', phone: '' }, officeEmailMatches: rows });
    assert.equal((await webhook()).status, 503);
    assert.equal(mock.calls.filter(c => c.url === env.OFICINA_CRM_FORM_URL).length, 0);
    assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 0);
  });
}

test('pending and refunded payments send no welcome', async t => {
  const mock = routes(t, { payment: { ...payment, status: 'REFUNDED' } });
  assert.equal((await webhook()).status, 200);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 0);
});

test('delayed OS form writer overwriting whole source_metadata cannot erase payment/outbox flags or event time', async t => {
  let releaseWriter, writerStarted;
  const release = new Promise(resolve => { releaseWriter = resolve; });
  const started = new Promise(resolve => { writerStarted = resolve; });
  let mock;
  const staleSource = { form_source_id: 'source_mock', utm_source: 'original' };
  mock = routes(t, { metadata: staleSource, onCapture: async body => {
    if (body.external_id === 'oficina:lead:delayed-replay') {
      writerStarted();
      await release;
      // This is the existing OS source writer, which never touches custom_fields.
      mock.overwriteSource(staleSource);
    }
  } });
  const { captureLead, sourceConfig } = await load('oficina/_crm.js');
  const config = await sourceConfig(env);
  const delayedCapture = captureLead(env, { name: lead.name, email: lead.email, phone: '+5511999999999' }, 'oficina:lead:delayed-replay', config);
  await started;
  assert.equal((await webhook()).status, 200);
  const first = structuredClone(mock.fields()._oficina_payments.pay_mock);
  assert.equal(first.hubPurchaseSent, true);
  assert.equal(first.metaPurchaseSent, true);
  assert.equal(first.welcomeMailSent, true);
  releaseWriter();
  await delayedCapture;
  assert.deepEqual(mock.metadata(), staleSource);
  assert.equal(mock.metadata().oficina_payments, undefined);
  assert.deepEqual(mock.fields()._oficina_payments.pay_mock, first);
  assert.equal((await webhook()).status, 200);
  assert.equal(mock.fields()._oficina_payments.pay_mock.purchaseEventTime, first.purchaseEventTime);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://api.zeptomail.com/')).length, 1);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://hub.mock/')).length, 1);
  assert.equal(mock.calls.filter(c => c.url.startsWith('https://graph.facebook.com/')).length, 1);
});

test('frontend cliente_atual and canonical ad attribution are captured without treating profile as a new community buyer', async t => {
  const mock = routes(t);
  const tracking = { utm_id: 'campaign_mock', imt_adset_name: 'office-adset', imt_adset_id: 'adset_mock', imt_ad_id: 'ad_mock', imt_placement: 'Instagram_Reels', fbp: 'fb.1.synthetic', fbc: 'fb.1.synthetic-click' };
  assert.equal((await leadRequest({ ...lead, profile: 'cliente_atual', tracking })).status, 200);
  const captured = mock.calls.find(c => c.url === env.OFICINA_CRM_FORM_URL).body;
  assert.equal(captured.oficina_profile, 'cliente_atual');
  for (const [key, value] of Object.entries(tracking)) assert.equal(captured[key], value);
  assert.equal(mock.calls.filter(c => c.url.includes('provision')).length, 0);
});

test('additional attribution fields remain bounded strings and reject objects/control characters', async t => {
  const mock = routes(t);
  for (const key of ['utm_id', 'imt_adset_name', 'imt_adset_id', 'imt_ad_id', 'imt_placement']) {
    for (const value of [{ arbitrary: true }, 'x'.repeat(501), 'x\ny']) {
      assert.equal((await leadRequest({ ...lead, tracking: { [key]: value } })).status, 422);
    }
  }
  assert.equal(mock.calls.length, 0);
});

test('office Hub Purchase retains original canonical campaign/ad attribution', async t => {
  const original = { utm_id: 'campaign_original', imt_adset_name: 'name_original', imt_adset_id: 'set_original', imt_ad_id: 'ad_original', imt_placement: 'Reels_original' };
  const mock = routes(t, { fields: { ...original, oficina_profile: 'cliente_atual' } });
  assert.equal((await webhook()).status, 200);
  const hub = mock.calls.find(c => c.url.startsWith('https://hub.mock/')).body;
  for (const [key, value] of Object.entries(original)) assert.equal(hub[key], value);
  assert.equal(hub.eventId, 'oficina-purchase-pay_mock');
});

 test('verified provider netValue is preserved in CRM without replacing gross Hub revenue', async t => {
  const mock = routes(t, { payment: { ...payment, netValue: 45.01 } });
  assert.equal((await webhook()).status, 200);
  assert.equal(mock.fields()._oficina_payments.pay_mock.netValue, 45.01);
  assert.equal(mock.calls.find(c => c.url.startsWith('https://hub.mock/')).body.valueCents, 4700);
});

for (const netValue of [-0.01, 47.01]) {
  test(`invalid provider netValue ${netValue} is not stored as financial evidence`, async t => {
    const mock = routes(t, { payment: { ...payment, netValue } });
    assert.equal((await webhook()).status, 200);
    assert.equal(mock.fields()._oficina_payments.pay_mock.netValue, undefined);
    assert.equal(mock.calls.find(c => c.url.startsWith('https://hub.mock/')).body.valueCents, 4700);
  });
}

test('missing provider netValue stays unknown instead of assuming zero fees', async t => {
  const mock = routes(t);
  assert.equal((await webhook()).status, 200);
  assert.equal(mock.fields()._oficina_payments.pay_mock.netValue, undefined);
});


test('verified paid moves registration to paid atomically with journal, pending does not move', async t => {
  const mock = routes(t);
  const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
  const config = await sourceConfig(env);
  await recordPayment(env, leadId, payment, 'pendente', config);
  assert.equal(mock.stageId(), 'stage_inscricao');
  await recordPayment(env, leadId, payment, 'pago', config);
  assert.equal(mock.stageId(), 'stage_pago');
  const patch = mock.calls.find(c => c.body?.stage_id === 'stage_pago');
  assert.equal(patch.body.custom_fields._oficina_payments.pay_mock.state, 'pago');
  assert.equal(new URL(patch.url).searchParams.get('stage_id'), 'eq.stage_inscricao');
});

test('duplicate paid preserves manual followup; refund moves followup and cannot regress on delayed paid', async t => {
  const mock = routes(t);
  const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
  const config = await sourceConfig(env);
  await recordPayment(env, leadId, payment, 'pago', config);
  mock.moveStage('stage_acompanhamento');
  const patches = () => mock.calls.filter(c => c.method === 'PATCH').length;
  const before = patches();
  assert.deepEqual(await recordPayment(env, leadId, payment, 'pago', config), { duplicate: true, state: 'pago' });
  assert.equal(patches(), before);
  assert.equal(mock.stageId(), 'stage_acompanhamento');
  await recordPayment(env, leadId, { ...payment, status: 'REFUNDED' }, 'cancelado', config);
  assert.equal(mock.stageId(), 'stage_reembolso');
  await recordPayment(env, leadId, payment, 'pago', config);
  assert.equal(mock.stageId(), 'stage_reembolso');
  assert.equal(mock.fields()._oficina_payments.pay_mock.state, 'cancelado');
});

test('paid CAS retry preserves concurrent manual move to followup', async t => {
  const mock = routes(t, { concurrentStage: 'stage_acompanhamento' });
  const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
  await recordPayment(env, leadId, payment, 'pago', await sourceConfig(env));
  assert.equal(mock.stageId(), 'stage_acompanhamento');
  assert.equal(mock.fields()._oficina_payments.pay_mock.state, 'pago');
});

for (const opts of [
  { stageId: 'stage_foreign' }, { pipelineId: 'pipeline_foreign' },
  { stages: stages.map(s => s.slug === 'pago' ? { ...s, organization_id: 'org_foreign' } : s) },
  { stages: stages.map(s => s.slug === 'reembolso' ? { ...s, pipeline_id: 'pipeline_foreign' } : s) },
]) {
  test('foreign stage/pipeline/tenant fails closed: ' + JSON.stringify(opts), async t => {
    const mock = routes(t, opts);
    const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
    await assert.rejects(recordPayment(env, leadId, payment, 'pago', await sourceConfig(env)), /oficina_crm_(lead_stage_mismatch|stages_not_ready)/);
    assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 0);
    assert.deepEqual(mock.fields(), {});
  });
}


for (const stageId of ['stage_acompanhamento', 'stage_reembolso']) {
  test('first paid observation does not regress advanced stage ' + stageId, async t => {
    const mock = routes(t, { stageId });
    const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
    await recordPayment(env, leadId, payment, 'pago', await sourceConfig(env));
    assert.equal(mock.stageId(), stageId);
    assert.equal(mock.fields()._oficina_payments.pay_mock.state, 'pago');
    assert.ok(mock.calls.filter(c => c.method === 'PATCH').every(c => !c.body.stage_id));
  });
}

test('refund CAS retries after manual followup move and still reaches refund', async t => {
  const mock = routes(t, { stageId: 'stage_pago', concurrentStage: 'stage_acompanhamento' });
  const { recordPayment, sourceConfig } = await load('oficina/_crm.js');
  await recordPayment(env, leadId, { ...payment, status: 'REFUNDED' }, 'cancelado', await sourceConfig(env));
  assert.equal(mock.stageId(), 'stage_reembolso');
  assert.equal(mock.fields()._oficina_payments.pay_mock.state, 'cancelado');
});

test('authenticated setup diagnoses provider validation while redacting credentials', async t => {
  t.mock.method(global, 'fetch', async () => Response.json({ errors: [{ code: 'invalid_object', description: 'Configuração inválida ' + env.ASAAS_API_KEY }] }, { status: 400 }));
  const response = await (await load('oficina/setup.js')).onRequestPost({ request: new Request('https://website.mock/api/oficina/setup', { method: 'POST', headers: { Authorization: 'Bearer ' + env.OFICINA_SETUP_TOKEN } }), env });
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.provider.method, 'GET');
  assert.equal(result.provider.code, 'invalid_object');
  assert.equal(JSON.stringify(result).includes(env.ASAAS_API_KEY), false);
  assert.match(result.provider.description, /redacted/);
});

test('detached hosted checkout accepts native confirmation and inapplicable installment limit', async () => {
  const { checkoutResult } = await load('oficina/_checkout.js');
  const native = { ...fixedLink, callback: null, maxInstallmentCount: null };
  assert.equal(checkoutResult(native).checkoutUrl, fixedLink.url);
  assert.throws(() => checkoutResult({ ...native, chargeType: 'RECURRENT' }));
  assert.throws(() => checkoutResult({ ...native, maxInstallmentCount: 12 }));
  assert.throws(() => checkoutResult({ ...native, callback: { successUrl: 'https://foreign.example/thanks' } }));
});
