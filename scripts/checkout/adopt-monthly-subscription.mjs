// Bind an existing, independently verified subscription. Never create a charge.
import { createHash } from 'node:crypto';
import { communityConfig, communityIntent, communityDb, asaasGet, verifyOrderResource, finishCommunityOrder } from '../../functions/api/checkout/_community-orders.js';
const envFile = process.env.COMMUNITY_RUNTIME_ENV;
if (!envFile) throw new Error('COMMUNITY_RUNTIME_ENV required');
process.loadEnvFile(envFile);
const [subscriptionId, paymentId, mode] = process.argv.slice(2);
if (!/^sub_[a-zA-Z0-9_]+$/.test(subscriptionId || '') || !/^pay_[a-zA-Z0-9_]+$/.test(paymentId || '')) throw new Error('subscription and first payment required');
const config = communityConfig(process.env);
const subscription = await asaasGet(config, `/subscriptions/${subscriptionId}`);
const payment = await asaasGet(config, `/payments/${paymentId}`);
const customer = await asaasGet(config, `/customers/${subscription.customer}`);
let legacy = {};
try { legacy = JSON.parse(subscription.externalReference || '{}'); } catch (_) {}
if (subscription.id !== subscriptionId || payment.id !== paymentId || payment.subscription !== subscriptionId ||
    subscription.customer !== payment.customer || customer.id !== subscription.customer || customer.deleted ||
    subscription.value !== 147 || payment.value !== 147 || subscription.cycle !== 'MONTHLY' ||
    subscription.billingType !== 'CREDIT_CARD' || payment.billingType !== 'CREDIT_CARD' ||
    subscription.status !== 'ACTIVE' || subscription.deleted || payment.deleted ||
    (!subscription.externalReference?.startsWith('community:') &&
     (legacy.product_id !== 'comunidade-imobiturbo' || legacy.plan !== 'mensal'))) throw new Error('subscription identity/offer conflict');
const hex = createHash('sha256').update(`community-adoption-v1:${config.environment}:${subscriptionId}`).digest('hex');
const key = `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
const intent = await communityIntent(config, { idempotencyKey: key, eventId: `adopt_${subscriptionId}`, plan: 'mensal',
  paymentMethod: 'CREDIT_CARD', installments: 1, name: customer.name, email: customer.email, phone: customer.mobilePhone || customer.phone });
if (mode !== '--apply') {
  console.log(JSON.stringify({ subscriptionId, paymentId, status: payment.status, eligible: true, changes: 'bind existing subscription and payment; no new charge' }));
  process.exit(0);
}
const claimed = await communityDb(config, 'rpc/claim_community_order', { p_order: intent, p_lease_seconds: 120 });
let order = claimed.order;
if (!claimed.claimed && order.status !== 'created') throw new Error('adoption in progress; reconcile existing order');
if (subscription.externalReference?.startsWith('community:') && subscription.externalReference !== order.external_reference) throw new Error('subscription bound elsewhere');
const update = async (path, payload) => {
  const res = await fetch(config.base + path, { method: 'PUT', headers: config.headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(65000) });
  if (!res.ok) throw new Error(`provider update failed: ${res.status}`);
};
if (claimed.claimed) {
  try {
    const payload = { externalReference: order.external_reference, fine: { value: 0, type: 'FIXED' }, interest: { value: 0 } };
    if (process.env.ASAAS_CHECKOUT_CALLBACK_ENABLED === 'true') payload.callback = {
      successUrl: 'https://www.imobiturbo.com.br/vagas/?paymentReturn=1', autoRedirect: true };
    await update(`/subscriptions/${subscriptionId}`, payload);
    await update(`/payments/${paymentId}`, payload);
    const verifiedSubscription = await asaasGet(config, `/subscriptions/${subscriptionId}`);
    const verifiedPayment = await asaasGet(config, `/payments/${paymentId}`);
    if (verifiedPayment.externalReference !== order.external_reference || verifiedPayment.subscription !== subscriptionId ||
        verifiedPayment.customer !== payment.customer || verifiedPayment.value !== 147 ||
        verifiedSubscription.fine?.value !== 0 || verifiedSubscription.interest?.value !== 0) throw new Error('adoption verification conflict');
    const result = await verifyOrderResource(config, order, verifiedSubscription, 'subscription');
    order = await finishCommunityOrder(config, order, { ...result, provider_payment_id: paymentId,
      reconciliation_evidence_ref: `asaas:${config.environment}:adoption:${subscriptionId}` });
  } catch (error) {
    await finishCommunityOrder(config, order, { status: 'uncertain', provider_customer_id: customer.id,
      provider_subscription_id: subscriptionId, error_code: 'adoption_uncertain' }).catch(() => {});
    throw error;
  }
}
if (order.status !== 'created' || order.provider_subscription_id !== subscriptionId || order.provider_payment_id !== paymentId) throw new Error('durable binding conflict');
console.log(JSON.stringify({ subscriptionId, paymentId, checkoutOrderId: order.id, status: order.status,
  products: order.sold_snapshot.products, unlimited: order.sold_snapshot.resource_profile.unlimited, idempotencyKey: key }));
