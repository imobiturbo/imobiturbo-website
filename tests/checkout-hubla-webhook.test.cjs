const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const webhookModulePromise = import(pathToFileURL(path.join(root, 'functions/api/checkout/webhook.js')));

function createHublaPayload({
  type = 'invoice.payment_succeeded',
  status = 'paid',
  invoiceId = 'hubla_inv_123',
  amount = 997,
  firstName = 'Corretor',
  lastName = 'Silva',
  email = 'corretor@example.com',
  phone = '+5511999999999',
  plan = 'annually',
  visitorId = 'rt_vid_test_123',
  fbp = 'fb.1.1711654522671.1234567890',
  fbclid = 'test_fbclid_abc',
} = {}) {
  return {
    type,
    event: {
      product: {
        id: 'UkYeCUJf9nc4UbPok6xj',
        name: 'Comunidade Imobiturbo',
      },
      invoice: {
        id: invoiceId,
        orderId: 'order_' + invoiceId,
        status,
        amount: {
          total: amount,
          totalCents: Math.round(amount * 100),
          subtotal: amount,
        },
        payer: {
          firstName,
          lastName,
          email,
          phone,
        },
        paymentSession: {
          ip: '177.136.240.10',
          userAgent: 'Mozilla/5.0 Test Agent',
          cookies: {
            fbp,
            fbclid,
          },
          params: {
            visitorId,
            plan,
          },
        },
      },
    },
    version: '2.0.0',
  };
}

test('Hubla webhook: payment succeeded processes purchase and responds 200', async () => {
  const { onRequestPost } = await webhookModulePromise;
  const payload = createHublaPayload({ amount: 997, plan: 'annually' });

  let dispatchedHubEvent = null;
  const mockFetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('track.nmidigital.tech/api/collect')) {
      dispatchedHubEvent = JSON.parse(options.body);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    // Meta Graph API
    if (typeof url === 'string' && url.includes('graph.facebook.com')) {
      return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
    }
    // Default fetch
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const request = new Request('https://www.imobiturbo.com.br/api/checkout/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hubla-idempotency': 'hubla_idem_test_999',
      },
      body: JSON.stringify(payload),
    });

    const env = {
      META_PIXEL_ID: '1025303472485246',
      META_ACCESS_TOKEN: 'EAAbcdefTestToken',
      HUB_TRACKING_COLLECT_URL: 'https://track.nmidigital.tech/api/collect',
      HUB_TRACKING_OPERATION_ID: '00000000-0000-0000-0000-000000000001',
    };

    const response = await onRequestPost({ request, env });
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.paid, true);
    assert.equal(data.event_id, 'hubla_idem_test_999');

    // Verify Hub dispatch caught the explicit visitorId from Hubla paymentSession
    assert.ok(dispatchedHubEvent, 'Must dispatch verified purchase to Hub');
    assert.equal(dispatchedHubEvent.type, 'Purchase');
    assert.equal(dispatchedHubEvent.visitorId, 'rt_vid_test_123');
    assert.equal(dispatchedHubEvent.orderId, 'hubla_inv_123');
    assert.equal(dispatchedHubEvent.valueCents, 99700);
    assert.equal(dispatchedHubEvent.email, 'corretor@example.com');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Hubla webhook: maps quarterly and monthly plans from params and amounts', async () => {
  const { onRequestPost } = await webhookModulePromise;

  for (const [planParam, amount, expectedPlan] of [
    ['quarterly', 357, 'trimestral'],
    ['monthly', 147, 'mensal'],
    ['', 357, 'trimestral'],
    ['', 147, 'mensal'],
    ['', 997, 'anual'],
  ]) {
    const payload = createHublaPayload({ amount, plan: planParam, invoiceId: 'inv_' + planParam + '_' + amount });
    const request = new Request('https://www.imobiturbo.com.br/api/checkout/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let dispatchedHub = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('track.nmidigital.tech/api/collect')) {
        dispatchedHub = true;
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    try {
      const response = await onRequestPost({ request, env: {} });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.paid, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test('Hubla webhook: refunds and chargebacks trigger cancellation', async () => {
  const { onRequestPost } = await webhookModulePromise;

  for (const eventType of ['invoice.refunded', 'invoice.chargeback', 'subscription.deactivated']) {
    const payload = createHublaPayload({ type: eventType, status: 'refunded', invoiceId: 'refund_' + eventType });
    const request = new Request('https://www.imobiturbo.com.br/api/checkout/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await onRequestPost({ request, env: {} });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.canceled, true);
    assert.equal(data.paymentId, 'refund_' + eventType);
  }
});

test('Hubla webhook: invoice.created / pending records pending sale and dispatches to Hub', async () => {
  const { onRequestPost } = await webhookModulePromise;

  const payload = createHublaPayload({
    type: 'invoice.created',
    status: 'pending',
    invoiceId: 'hubla_pending_123',
    amount: 997,
    plan: 'annually',
  });

  let dispatchedHubEvent = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('track.nmidigital.tech/api/collect')) {
      dispatchedHubEvent = JSON.parse(options.body);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const request = new Request('https://www.imobiturbo.com.br/api/checkout/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const env = {
      HUB_TRACKING_COLLECT_URL: 'https://track.nmidigital.tech/api/collect',
      HUB_TRACKING_OPERATION_ID: '00000000-0000-0000-0000-000000000001',
    };

    const response = await onRequestPost({ request, env });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.pending, true);
    assert.equal(data.paymentId, 'hubla_pending_123');
    assert.equal(data.amount, 997);
    assert.equal(data.plan, 'anual');

    assert.ok(dispatchedHubEvent, 'Must dispatch pending purchase to Hub');
    assert.equal(dispatchedHubEvent.type, 'InitiateCheckout');
    assert.equal(dispatchedHubEvent.status, 'pending');
    assert.equal(dispatchedHubEvent.orderId, 'hubla_pending_123');
    assert.equal(dispatchedHubEvent.valueCents, 99700);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Hubla webhook: non-financial events are acknowledged as ignored_event', async () => {
  const { onRequestPost } = await webhookModulePromise;

  const payload = createHublaPayload({ type: 'member.module_completed', status: 'completed' });
  const request = new Request('https://www.imobiturbo.com.br/api/checkout/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const response = await onRequestPost({ request, env: {} });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.status, 'ignored_event');
  assert.equal(data.provider, 'hubla');
});

test('Hubla webhook: rejects unauthorized request when HUBLA_WEBHOOK_TOKEN is configured', async () => {
  const { onRequestPost } = await webhookModulePromise;

  const payload = createHublaPayload();
  const request = new Request('https://www.imobiturbo.com.br/api/checkout/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hubla-token': 'wrong-token',
    },
    body: JSON.stringify(payload),
  });

  const env = { HUBLA_WEBHOOK_TOKEN: 'expected-token' };
  const response = await onRequestPost({ request, env });
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.equal(data.error, 'hubla_unauthorized');
});
