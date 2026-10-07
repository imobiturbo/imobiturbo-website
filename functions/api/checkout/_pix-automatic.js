// Asaas v3 Jornada 3, reviewed against the 2026-10-06 OpenAPI snapshot.
// Consent is not financial proof. Opaque auto_ IDs are never provider payments.
import { CommunityError, UUID, asaasGet, communityDb, findCommunityOrder, finishCommunityOrder, cents, customerId } from './_community-orders.js';
export const PIX_AUTO_MODE = 'recurring_pix_auto';
const AUTH_PATH = '/pix/automatic/authorizations';
const INSTRUCTION_PATH = '/pix/automatic/paymentInstructions';
async function pixGet(config, path) {
  if (config.pixAutomaticDeadline && Date.now() >= config.pixAutomaticDeadline) throw new CommunityError('community_reconciliation_timeout');
  const data = await asaasGet(config, path);
  if (config.pixAutomaticDeadline && Date.now() >= config.pixAutomaticDeadline) throw new CommunityError('community_reconciliation_timeout');
  return data;
}
const fail = () => { throw new CommunityError('community_pix_automatic_binding_conflict', 422); };
export function pixAutomaticContractId(order) { return order.id.replace(/-/g, '').toLowerCase(); }
export function pixAutomaticOrderId(contract) {
  if (!/^[0-9a-f]{32}$/.test(contract || '')) fail();
  const id = `${contract.slice(0,8)}-${contract.slice(8,12)}-${contract.slice(12,16)}-${contract.slice(16,20)}-${contract.slice(20)}`;
  if (!UUID.test(id)) fail();
  return id;
}
export function pixAutomaticPayload(order, customer) {
  if (order.sold_snapshot.price_mode !== PIX_AUTO_MODE || order.sold_snapshot.duration_months !== 1 ||
      order.sold_snapshot.installment_count !== 1 || order.sold_snapshot.contract_total_cents !== 14700 || !/^cus_[A-Za-z0-9_]+$/.test(customer)) fail();
  return { contractId: pixAutomaticContractId(order), customerId: customer, startDate: new Date().toISOString().slice(0,10),
    frequency: 'MONTHLY', paymentCreationMode: 'SUBSCRIPTION', value: 147, retryPolicy: 'NOT_ALLOWED',
    description: 'Comunidade Imobiturbo mensal', immediateQrCode: { expirationSeconds: 1800, originalValue: 147,
      description: 'Comunidade Imobiturbo mensal' } };
}
export async function verifyPixAutomaticAuthorization(config, order, auth) {
  if (order.sold_snapshot.price_mode !== PIX_AUTO_MODE || order.sold_snapshot.duration_months !== 1 ||
      order.sold_snapshot.installment_count !== 1 || order.sold_snapshot.contract_total_cents !== 14700 ||
      order.provider_subscription_id || order.provider_payment_id || order.provider_installment_id ||
      !UUID.test(auth?.id || '') || (order.provider_pix_authorization_id && order.provider_pix_authorization_id !== auth.id) ||
      auth.contractId !== pixAutomaticContractId(order) || !/^cus_[A-Za-z0-9_]+$/.test(auth.customerId || '') ||
      (order.provider_customer_id && auth.customerId !== order.provider_customer_id) || auth.frequency !== 'MONTHLY' ||
      auth.paymentCreationMode !== 'SUBSCRIPTION' || auth.retryPolicy !== 'NOT_ALLOWED' || cents(auth.value) !== 14700 ||
      !auth.immediateQrCode?.conciliationIdentifier || !['CREATED','ACTIVE','REFUSED','CANCELLED','EXPIRED'].includes(auth.status) ||
      (auth.subscriptionId && !/^sub_[A-Za-z0-9_]+$/.test(auth.subscriptionId))) fail();
  const customer = await pixGet(config, `/customers/${encodeURIComponent(auth.customerId)}`);
  if (customer.id !== auth.customerId || customer.deleted || String(customer.email || '').trim().toLowerCase() !== order.buyer_email) fail();
  return auth;
}
export function pixAutomaticResult(auth) {
  return { status: 'created', price_mode: PIX_AUTO_MODE, installment_count: 1, provider_customer_id: auth.customerId,
    provider_pix_authorization_id: auth.id, provider_payment_id: null, provider_subscription_id: null, provider_installment_id: null };
}
// Complete, bounded enumeration; no partial list ever proves absence.
export async function pixAutomaticList(config, path) {
  const rows = []; const ids = new Set(); let offset = 0;
  for (let page=0; page<10; page++) {
    const data = await pixGet(config, `${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${offset}`);
    if (!Array.isArray(data.data) || data.data.length>100 || typeof data.hasMore !== 'boolean' || (data.offset != null && data.offset !== offset)) throw new CommunityError('community_gateway_list_incomplete');
    for (const row of data.data) { if (!row?.id || ids.has(row.id)) throw new CommunityError('community_gateway_list_incomplete'); ids.add(row.id); rows.push(row); }
    if (!data.hasMore) return rows;
    if (!data.data.length) break;
    offset += data.data.length;
  }
  throw new CommunityError('community_gateway_list_incomplete');
}
export async function reconcilePixAutomaticOrder(config, order) {
  let auth;
  if (order.provider_pix_authorization_id) auth = await pixGet(config, `${AUTH_PATH}/${encodeURIComponent(order.provider_pix_authorization_id)}`);
  else {
    const rows = await pixAutomaticList(config, `${AUTH_PATH}${order.provider_customer_id ? `?customerId=${encodeURIComponent(order.provider_customer_id)}` : ""}`);
    const matches = rows.filter(row => row.contractId === pixAutomaticContractId(order));
    if (!matches.length) return order; // A timeout never authorizes another POST.
    if (matches.length !== 1) throw new CommunityError('community_gateway_multiple_orders',409);
    auth = await pixGet(config, `${AUTH_PATH}/${encodeURIComponent(matches[0].id)}`);
    if (auth.id !== matches[0].id) fail();
  }
  await verifyPixAutomaticAuthorization(config, order, auth);
  return finishCommunityOrder(config, order, { ...pixAutomaticResult(auth), reconciliation_evidence_ref: `asaas:${config.environment}:${auth.id}` });
}
export async function createPixAutomaticAuthorization(config, order, customer) {
  const response = await fetch(`${config.base}${AUTH_PATH}`, { method:'POST', headers:config.headers,
    body:JSON.stringify(pixAutomaticPayload(order,customer)), signal:AbortSignal.timeout(65000) });
  const created = await response.json().catch(() => null);
  if (!response.ok) {
    const codes = Array.isArray(created?.errors) ? created.errors.map(e => e?.code).filter(c => /^[a-z_]{1,50}$/.test(c || '')) : [];
    const error = new CommunityError(`asaas_http_${response.status}${codes.length ? '_' + codes[0] : ''}`);
    // Only this exact synchronous validation rejection proves no authorization
    // was created. Timeouts, 5xx and every unknown response remain uncertain.
    if (response.status === 400 && created?.errors?.length === 1 && codes[0] === 'invalid_action' &&
        created.errors[0].description === 'A descrição da autorização não deve ultrapassar 35 caracteres.') {
      error.failureProof = { kind: 'absence_verified', evidence_ref: `asaas:${config.environment}:authorization-description-rejected:${order.id}`,
        reason: 'Asaas HTTP 400 invalid_action: authorization description exceeds 35 characters; no authorization created.' };
    }
    throw error;
  }
  if (!UUID.test(created?.id || '')) throw new CommunityError('community_creation_uncertain');
  const auth = await pixGet(config, `${AUTH_PATH}/${encodeURIComponent(created.id)}`);
  if (auth.id !== created.id) fail();
  await verifyPixAutomaticAuthorization(config, { ...order, provider_customer_id:customer }, auth);
  return finishCommunityOrder(config, order, pixAutomaticResult(auth));
}
export async function pixAutomaticAuthorization(config, order) {
  if (!UUID.test(order.provider_pix_authorization_id || '')) fail();
  const auth = await pixGet(config, `${AUTH_PATH}/${encodeURIComponent(order.provider_pix_authorization_id)}`);
  return verifyPixAutomaticAuthorization(config, order, auth);
}
export async function verifyPixAutomaticPayment(config, order, payment, authorization) {
  const auth = authorization || await pixAutomaticAuthorization(config, order);
  if (!/^pay_[A-Za-z0-9_]+$/.test(payment.id || '') || payment.billingType !== 'PIX' ||
      customerId(payment) !== auth.customerId || payment.installment || cents(payment.value) !== 14700 ||
      (auth.subscriptionId ? payment.subscription && payment.subscription !== auth.subscriptionId : Boolean(payment.subscription))) fail();
  const reversed = payment.deleted === true || ['REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS',
    'CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL'].includes(payment.status) ||
    payment.refunds?.some(r => ['PENDING','DONE'].includes(r.status)) ||
    ['REQUESTED','IN_DISPUTE','DISPUTE_LOST','DONE'].includes(payment.chargeback?.status);
  // Try the initial transaction binding first. Authorization may be REFUSED
  // after a successfully paid first month; ACTIVE must not gate that month.
  let transaction;
  if (payment.pixTransaction) {
    if (!UUID.test(payment.pixTransaction)) fail();
    const tx = await pixGet(config, `/pix/transactions/${encodeURIComponent(payment.pixTransaction)}`);
    if (tx.id !== payment.pixTransaction || tx.payment !== payment.id ||
        tx.type !== 'CREDIT' || !['AWAITING_REQUEST','SCHEDULED','DONE'].includes(tx.status) || cents(tx.value) !== 14700 ||
        typeof tx.conciliationIdentifier !== 'string' || !tx.conciliationIdentifier) fail();
    const refundedCents = cents(tx.refundedValue || 0);
    if (refundedCents < 0 || refundedCents > 14700) fail();
    transaction = { id: tx.id, payment_id: tx.payment, conciliation_identifier: tx.conciliationIdentifier,
      type: tx.type, status: tx.status, amount_cents: cents(tx.value), refunded_cents: refundedCents };
    if (tx.conciliationIdentifier === auth.immediateQrCode.conciliationIdentifier) {
      return { auth, initial: true, settled: tx.status === 'DONE', transaction };
    }
  }
  const rows = await pixAutomaticList(config, `${INSTRUCTION_PATH}?authorizationId=${encodeURIComponent(auth.id)}&paymentId=${encodeURIComponent(payment.id)}`);
  if (!rows.length) fail();
  let settled = true;
  for (const row of rows) {
    if (!UUID.test(row.id)) fail();
    const instruction = await pixGet(config, `${INSTRUCTION_PATH}/${encodeURIComponent(row.id)}`);
    if (instruction.id !== row.id || instruction.paymentId !== payment.id || instruction.authorization?.id !== auth.id ||
        instruction.authorization?.customerId !== auth.customerId || instruction.dueDate !== payment.originalDueDate ||
        (['CONFIRMED','RECEIVED'].includes(payment.status) && !reversed && instruction.status !== 'DONE')) fail();
    settled = settled && instruction.status === 'DONE';
  }
  return { auth, initial: false, settled: settled && (!transaction || transaction.status === 'DONE'), ...(transaction ? { transaction } : {}) };
}
export async function resolvePixAutomaticPayment(config, payment) {
  if (!/^cus_[A-Za-z0-9_]+$/.test(customerId(payment) || "")) fail();
  config = { ...config, pixAutomaticDeadline: Date.now()+60000 };
  const rows = await pixAutomaticList(config, `${INSTRUCTION_PATH}?paymentId=${encodeURIComponent(payment.id)}`);
  const authIds = new Set();
  for (const row of rows) {
    if (!UUID.test(row.id)) fail();
    const instruction = await pixGet(config, `${INSTRUCTION_PATH}/${encodeURIComponent(row.id)}`);
    if (instruction.id !== row.id || instruction.paymentId !== payment.id || instruction.authorization?.customerId !== customerId(payment) || !UUID.test(instruction.authorization?.id || '')) fail();
    authIds.add(instruction.authorization.id);
  }
  if (authIds.size > 1) fail();
  if (authIds.size === 1) return findCommunityOrder(config,'provider_pix_authorization_id',[...authIds][0]);
  if (!payment.pixTransaction) return null;
  if (!UUID.test(payment.pixTransaction)) fail();
  const tx = await pixGet(config, `/pix/transactions/${encodeURIComponent(payment.pixTransaction)}`);
  if (tx.id !== payment.pixTransaction || tx.payment !== payment.id || !tx.conciliationIdentifier) fail();
  const query = new URLSearchParams({ provider:'eq.asaas',environment:`eq.${config.environment}`,organization_id:`eq.${config.organizationId}`,
    provider_customer_id:`eq.${customerId(payment)}`,status:'eq.created','sold_snapshot->>price_mode':`eq.${PIX_AUTO_MODE}`,limit:'51' });
  const orders = await communityDb(config,`cobranca_pedidos?${query}`);
  if (!Array.isArray(orders) || orders.length > 50) throw new CommunityError('community_pix_automatic_scan_incomplete');
  let found = null;
  for (const order of orders) {
    const auth = await pixAutomaticAuthorization(config,order);
    if (auth.immediateQrCode.conciliationIdentifier === tx.conciliationIdentifier) { if (found) fail(); found = order; }
  }
  return found;
}
export async function resolvePixAutomaticAuthorization(config, id) {
  if (!UUID.test(id || '')) fail();
  const auth = await pixGet(config,`${AUTH_PATH}/${encodeURIComponent(id)}`);
  if (auth.id !== id) fail();
  const order = await findCommunityOrder(config,'id',pixAutomaticOrderId(auth.contractId));
  if (!order) throw new CommunityError('community_order_missing',422);
  await verifyPixAutomaticAuthorization(config,order,auth);
  if (order.status === 'created') return order;
  return finishCommunityOrder(config, order, { ...pixAutomaticResult(auth), reconciliation_evidence_ref:`asaas:${config.environment}:${auth.id}` });
}
export async function pixAutomaticPayments(config, order, auth) {
  const ids = new Set();
  // Customer-scoped enumeration recovers the first payment whose ID does not
  // exist when the authorization is created. Never infer by amount/reference.
  const payments = await pixAutomaticList(config, `/payments?customer=${encodeURIComponent(auth.customerId)}&billingType=PIX`);
  for (const row of payments) {
    if (!/^pay_[A-Za-z0-9_]+$/.test(row.id || '')) fail();
    const payment = await pixGet(config,`/payments/${encodeURIComponent(row.id)}`);
    if (payment.id !== row.id || customerId(payment) !== auth.customerId) fail();
    if (!payment.pixTransaction) continue;
    if (!UUID.test(payment.pixTransaction)) fail();
    const tx = await pixGet(config,`/pix/transactions/${encodeURIComponent(payment.pixTransaction)}`);
    if (tx.id !== payment.pixTransaction || tx.payment !== payment.id) fail();
    if (tx.conciliationIdentifier === auth.immediateQrCode.conciliationIdentifier) ids.add(payment.id);
  }
  const instructions = await pixAutomaticList(config,`${INSTRUCTION_PATH}?authorizationId=${encodeURIComponent(auth.id)}`);
  for (const row of instructions) {
    if (!UUID.test(row.id)) fail();
    const instruction = await pixGet(config,`${INSTRUCTION_PATH}/${encodeURIComponent(row.id)}`);
    if (instruction.id !== row.id || instruction.authorization?.id !== auth.id || instruction.authorization.customerId !== auth.customerId || !/^pay_[A-Za-z0-9_]+$/.test(instruction.paymentId || '')) fail();
    ids.add(instruction.paymentId);
  }
  return [...ids];
}
