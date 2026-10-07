// Manual integration check on VPS3. Financial API calls are restricted to Sandbox.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const [envFile, fixtureFile, workerFile] = process.argv.slice(2);
assert.equal(os.hostname(), 'vmi3482766');
assert.ok(process.cwd().startsWith('/opt/builds/'));
assert.ok(envFile && fixtureFile, 'Pass private Sandbox env and a private fixture record');
const vars = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split('\n').flatMap(line => {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
  return m ? [[m[1], m[2].replace(/^['"]|['"]$/g, '')]] : [];
}));
assert.equal(vars.ASAAS_SANDBOX_API_URL, 'https://api-sandbox.asaas.com/v3');
assert.ok(vars.ASAAS_SANDBOX_API_KEY?.startsWith('$aact_hmlg_'), 'Production credentials are forbidden');
const nativeFetch = globalThis.fetch;
const base = vars.ASAAS_SANDBOX_API_URL;
async function provider(route, method = 'GET', body) {
  const response = await nativeFetch(base + route, { method, redirect: 'error',
    headers: { access_token: vars.ASAAS_SANDBOX_API_KEY, 'Content-Type': 'application/json',
      'User-Agent': 'Imobiturbo-Sandbox-Webhook-Regression/1.0' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (route === '/pix/automatic/authorizations' && method === 'POST' && response.status === 400 &&
      result.errors?.some(error => error.code === 'invalid_action' &&
        error.description?.startsWith('Você não possui permissão para utilizar este recurso.'))) return { permissionDenied: true };
  assert.ok(response.ok, `Sandbox ${method} ${route}: HTTP ${response.status} ${JSON.stringify(result.errors || [])}`);
  return result;
}
const wallets = await provider('/wallets/');
assert.ok(JSON.stringify(wallets).includes(vars.ASAAS_SANDBOX_WALLET_ID), 'Sandbox wallet must match the configured account');
const fixture = fs.existsSync(fixtureFile) ? JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) : { uid: crypto.randomUUID() };
function save() { fs.writeFileSync(fixtureFile, JSON.stringify(fixture, null, 2), { mode: 0o600 }); }
save();
if (!fixture.customerId) {
  const customer = await provider('/customers', 'POST', { name: 'Teste tecnico webhook Imobiturbo',
    email: 'webhook-sandbox@example.invalid', cpfCnpj: '52998224725', notificationDisabled: true,
    externalReference: `sandbox-webhook:${fixture.uid}` });
  fixture.customerId = customer.id; save();
}
if (!fixture.authorizationId) {
  const auth = await provider('/pix/automatic/authorizations', 'POST', {
    customerId: fixture.customerId, contractId: `SANDBOX-WEBHOOK-${fixture.uid}`,
    startDate: new Date().toISOString().slice(0, 10), frequency: 'MONTHLY', paymentCreationMode: 'SUBSCRIPTION',
    value: 10, retryPolicy: 'NOT_ALLOWED', description: 'Teste Sandbox webhook',
    immediateQrCode: { expirationSeconds: 1800, originalValue: 10, description: 'Teste Sandbox webhook' },
  });
  fixture.authorizationUnavailable = auth.permissionDenied === true;
  fixture.authorizationId = auth.id || crypto.randomUUID(); save();
}
if (!fixture.paymentId) {
  const payment = await provider('/payments', 'POST', { customer: fixture.customerId, billingType: 'PIX',
    value: 497, dueDate: new Date().toISOString().slice(0, 10), externalReference: `cal-asaas:${fixture.uid}`,
    description: 'Teste Sandbox cancelamento Agenda' });
  fixture.paymentId = payment.id; save();
}
let payment = await provider(`/payments/${fixture.paymentId}`);
assert.equal(payment.status, 'PENDING', 'Never delete a paid payment, including Sandbox');
if (!payment.deleted) await provider(`/payments/${fixture.paymentId}`, 'DELETE');
payment = await provider(`/payments/${fixture.paymentId}`);
assert.equal(payment.deleted, true);

const env = { ASAAS_API_KEY: vars.ASAAS_SANDBOX_API_KEY, ASAAS_API_URL: base, ASAAS_ENVIRONMENT: 'sandbox',
  ASAAS_WEBHOOK_TOKEN: 'sandbox-local-regression-only', SUPABASE_URL: 'https://db.example.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-db', CAL_ASAAS_INTEGRATION_TOKEN: 'synthetic-cal',
  ASSETS: { fetch: async () => new Response('', { status: 404 }) } };
const calls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  calls.push({ host: url.hostname, method: init.method || 'GET' });
  assert.equal(init.method || 'GET', 'GET', 'Webhook verification may only read data');
  if (url.hostname === 'api-sandbox.asaas.com') {
    if (fixture.authorizationUnavailable && url.pathname === `/v3/pix/automatic/authorizations/${fixture.authorizationId}`) {
      return Response.json({ id: fixture.authorizationId, contractId: `SANDBOX-WEBHOOK-${fixture.uid}`, value: 10, status: 'REFUSED' });
    }
    return nativeFetch(input, { ...init, redirect: 'error' });
  }
  if (url.hostname === 'db.example.invalid') return Response.json([]);
  // The absence of the removed Cal order is simulated, with zero production calls.
  if (url.hostname === 'agenda.imobiturbo.com.br') return Response.json({ error: 'order_not_found' }, { status: 404 });
  throw new Error(`Unexpected network target: ${url.hostname}`);
};
try {
  const module = await import(pathToFileURL(workerFile || path.resolve('functions/api/checkout/webhook.js')));
  async function invoke(payload) {
    const request = new Request('https://site.example.invalid/api/checkout/webhook', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'asaas-access-token': env.ASAAS_WEBHOOK_TOKEN },
      body: JSON.stringify(payload) });
    return workerFile ? module.default.fetch(request, env, { waitUntil: promise => promise.catch(() => {}) })
      : module.onRequestPost({ request, env });
  }
  const results = [];
  for (const [payload, expected] of [
    [{ event: 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CREATED', authorization: { id: fixture.authorizationId } }, 'ignored_product'],
    [{ event: 'PAYMENT_DELETED', payment: { id: fixture.paymentId } }, 'ignored_deleted_unpaid_order'],
  ]) {
    for (let retry = 0; retry < 2; retry++) {
      const response = await invoke(payload);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.status, expected);
      if (expected === 'ignored_deleted_unpaid_order') assert.equal(body.paid, false);
      results.push({ event: payload.event, retry, http_status: response.status, status: body.status });
    }
  }
  fixture.verified = results; fixture.verifiedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ environment: 'sandbox', compiledWorker: Boolean(workerFile), results,
    pixAutomaticProviderVerified: !fixture.authorizationUnavailable,
    pixAutomaticSandboxPermissionDenied: fixture.authorizationUnavailable,
    productionNetworkCalls: 0, webhookWrites: calls.filter(c => c.method !== 'GET').length }));
} finally {
  globalThis.fetch = nativeFetch;
}
