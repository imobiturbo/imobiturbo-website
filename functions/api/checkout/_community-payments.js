import { PIX_AUTO_MODE, pixAutomaticAuthorization, verifyPixAutomaticPayment, pixAutomaticPayments, resolvePixAutomaticAuthorization } from './_pix-automatic.js';
import { COMMUNITY_PLANS, COMMUNITY_PRODUCT_ID, communityReferenceId } from "./_products.js";
import { CommunityError, communityConfig, communityDb, asaasGet, findCommunityOrder,
  resolveCommunityOrder, reconcileCommunityOrder, assertCommunityOrder, customerId, cents, CLUB_ORGANIZATION_ID, UUID } from "./_community-orders.js";

export function communityCalendarPeriod(date, months) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || ![1, 3, 12].includes(months)) throw new CommunityError("community_competence_unresolved", 422);
  const start = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== date || start.getUTCFullYear() < 2020 || start.getUTCFullYear() > 2100) throw new CommunityError("community_competence_unresolved", 422);
  const end = new Date(start), day = start.getUTCDate();
  end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + months);
  end.setUTCDate(Math.min(day, new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()));
  return { period_start: start.toISOString(), period_end: end.toISOString() };
}
export function confirmationProof(payment, environment) {
  // confirmedDate is the first confirmation, paymentDate is settlement. The
  // latter, dateCreated, event arrival and wall clock are never substitutes.
  const ref = `asaas:${environment}:payment:${payment.id}:confirmedDate`;
  const value = payment.confirmedDate;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    communityCalendarPeriod(value, 1);
    return { schema_version: 1, precision: "date", source: "asaas_payment_lookup", evidence_ref: ref,
      confirmed_date: value, provider_time_zone: null, time_zone_evidence_ref: null };
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))) {
    return { schema_version: 1, precision: "instant", source: "asaas_payment_lookup", evidence_ref: ref,
      confirmed_at: new Date(value).toISOString() };
  }
  return { schema_version: 1, precision: "unresolved", source: "asaas_payment_lookup", evidence_ref: ref };
}
async function ledgerRows(config, table, filters) {
  const params = new URLSearchParams({ provider: "eq.asaas", environment: `eq.${config.environment}`,
    organization_id: `eq.${config.organizationId}`, ...filters });
  const rows = await communityDb(config, `${table}?${params}`);
  if (!Array.isArray(rows)) throw new CommunityError("community_storage_pending");
  return rows;
}
function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJson(value[key])]));
  return value;
}
function assertPaymentIdentity(order, payment) {
  const s = order.sold_snapshot;
  if (!/^pay_[A-Za-z0-9_]+$/.test(payment.id || "") || customerId(payment) !== order.provider_customer_id ||
      payment.billingType !== (s.price_mode === "pix" ? "PIX" : "CREDIT_CARD") ||
      (payment.externalReference && payment.externalReference !== order.external_reference) ||
      (s.price_mode === "recurring_card" ? payment.subscription !== order.provider_subscription_id || Boolean(payment.installment) :
        Boolean(payment.subscription) || (s.installment_count > 1 ? payment.installment !== order.provider_installment_id :
          payment.id !== order.provider_payment_id || Boolean(payment.installment)))) throw new CommunityError("community_payment_binding_conflict", 422);
}
async function verifyPaymentContext(config, order, payment) {
  assertCommunityOrder(config, order);
  if (order.status !== "created") throw new CommunityError("community_order_reconciliation_pending");
  const auto = order.sold_snapshot.price_mode === PIX_AUTO_MODE;
  let automaticProof = null;
  if (auto) automaticProof = await verifyPixAutomaticPayment(config, order, payment); else assertPaymentIdentity(order, payment);
  let snapshot = order.sold_snapshot;
  const subscriptions = await ledgerRows(config, "cobranca_assinaturas", { checkout_order_id: `eq.${order.id}`, limit: "2" });
  if (subscriptions.length > 1) throw new CommunityError("community_subscription_conflict", 422);
  const subscription = subscriptions[0];
  if (subscription) {
    if (subscription.customer_id !== order.provider_customer_id || subscription.email !== order.buyer_email ||
        subscription.provider_subscription_id !== order.provider_subscription_id ||
        JSON.stringify(canonicalJson(subscription.sold_snapshot)) !== JSON.stringify(canonicalJson(snapshot))) throw new CommunityError("community_subscription_conflict", 422);
    snapshot = subscription.sold_snapshot;
  }
  let date, group = null, number = 1;
  if (auto) { date = payment.originalDueDate; } else if (snapshot.price_mode === "recurring_card") {
    const source = await asaasGet(config, `/subscriptions/${encodeURIComponent(order.provider_subscription_id)}`);
    if (source.id !== order.provider_subscription_id || source.externalReference !== order.external_reference ||
        customerId(source) !== order.provider_customer_id || source.billingType !== "CREDIT_CARD" || source.cycle !== "MONTHLY") throw new CommunityError("community_subscription_conflict", 422);
    date = payment.originalDueDate; // Never move a competence after late payment.
  } else if (snapshot.installment_count > 1) {
    group = await asaasGet(config, `/installments/${encodeURIComponent(order.provider_installment_id)}`);
    if (group.id !== order.provider_installment_id || customerId(group) !== order.provider_customer_id ||
        group.billingType !== "CREDIT_CARD" || Number(group.installmentCount) !== snapshot.installment_count ||
        cents(group.value) !== snapshot.contract_total_cents) throw new CommunityError("community_installment_conflict", 422);
    const first = await asaasGet(config, `/payments/${encodeURIComponent(order.provider_payment_id)}`);
    assertPaymentIdentity(order, first);
    if (first.installmentNumber !== 1) throw new CommunityError("community_installment_conflict", 422);
    date = first.originalDueDate;
    number = Number(payment.installmentNumber);
    if (!Number.isInteger(number) || number < 1 || number > snapshot.installment_count || (number === 1 && payment.id !== first.id)) throw new CommunityError("community_installment_conflict", 422);
  } else date = payment.originalDueDate;
  const total = snapshot.contract_total_cents, count = snapshot.installment_count;
  const expected = Math.floor(total / count) + (number === count ? total % count : 0);
  if (cents(payment.value) !== expected) throw new CommunityError("community_amount_conflict", 422);
  const period = communityCalendarPeriod(date, snapshot.duration_months);
  const orderId = (auto || snapshot.price_mode === "recurring_card") ? `${order.id}:${date}` : order.provider_installment_id || order.id;
  const competenceKey = auto ? `pixauto:${order.provider_pix_authorization_id}:${date}` : snapshot.price_mode === "recurring_card" ? `subscription:${order.provider_subscription_id}:${date}` :
    `${snapshot.price_mode === "installment_card" ? "installment" : "order"}:${orderId}`;
  return { snapshot, subscription, number, expected, date, orderId, competenceKey, period, automaticProof };
}
export async function recordCommunityPayment(config, order, payment, eventId) {
  const ctx = await verifyPaymentContext(config, order, payment);
  const prior = await ledgerRows(config, "cobranca_pagamentos", { provider_payment_id: `eq.${payment.id}`, limit: "2" });
  if (prior.length > 1) throw new CommunityError("community_payment_conflict", 422);
  const refunds = Array.isArray(payment.refunds) ? payment.refunds.filter(r =>
    ["PENDING", "DONE"].includes(r.status)).map(r => ({ status: r.status, amount_cents: cents(r.value) })) : [];
  const transactionRefund = (ctx.automaticProof?.transaction?.refunded_cents || 0) > 0;
  const negative = transactionRefund || payment.deleted === true || ["REFUNDED", "REFUND_REQUESTED", "REFUND_IN_PROGRESS",
    "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"].includes(payment.status) ||
    refunds.length > 0 || ["REQUESTED", "IN_DISPUTE", "DISPUTE_LOST", "DONE"].includes(payment.chargeback?.status) ||
    (prior.length > 0 && !["CONFIRMED", "RECEIVED"].includes(payment.status));
  if (negative) {
    const observation = { contract_version: 1, provider: "asaas", organization_id: config.organizationId,
      environment: config.environment, checkout_order_id: order.id, payment_id: payment.id,
      customer_id: customerId(payment), provider_subscription_id: ctx.snapshot.price_mode === PIX_AUTO_MODE ? null : payment.subscription || null,
      provider_installment_id: payment.installment || null, billing_type: payment.billingType,
      amount_cents: cents(payment.value), installment_number: ctx.number, status: payment.status,
      deleted: Boolean(payment.deleted), refunds, chargeback_status: payment.chargeback?.status || null,
      source: transactionRefund ? "asaas_payment_and_pix_transaction_lookup" : "asaas_payment_lookup",
      ...(ctx.snapshot.price_mode === PIX_AUTO_MODE ? { provider_pix_authorization_id: order.provider_pix_authorization_id } : {}),
      ...(transactionRefund ? { pix_transaction: ctx.automaticProof.transaction } : {}) };
    // A partial refund can retain RECEIVED. Include the verified observation
    // in the journal identity so a later change cannot be swallowed as replay.
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonicalJson(observation)))));
    const hash = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
    observation.event_id = `review:${payment.id}:${hash}`;
    const result = await communityDb(config, "rpc/record_community_financial_review", { p_review: observation });
    if (result?.contract_version !== 1 || !UUID.test(result.review_id || "") || !["pending", "resolved"].includes(result.state))
      throw new CommunityError("community_financial_review_pending");
    return { paid: false, financialStatus: payment.status, fulfillment: "manual_financial_review", ctx };
  }
  if (!["CONFIRMED", "RECEIVED"].includes(payment.status) || ctx.automaticProof?.settled === false) {
    return { paid: false, financialStatus: payment.status, fulfillment: "manual_review_or_awaiting_payment", ctx };
  }
  let proof = confirmationProof(payment, config.environment);
  // A later settlement GET must not replace a stronger first-confirmation proof.
  const old = prior[0]?.confirmation_proof;
  if (old && old.precision !== "unresolved") {
    // Civil DATE with an unproved zone can differ by one UTC day. The frozen
    // database contract decides consistency/refinement; never manufacture a zone.
    if (old.precision === "date" && proof.precision === "date" && old.confirmed_date !== proof.confirmed_date) throw new CommunityError("community_confirmation_conflict", 422);
    if (old.precision === "instant" && proof.precision === "instant" && Date.parse(old.confirmed_at) !== Date.parse(proof.confirmed_at)) throw new CommunityError("community_confirmation_conflict", 422);
    if (proof.precision === "unresolved") proof = old;
  }
  // paid_at is optional compatibility. Keep NULL: the DB owns the purchase's
  // earliest proof, including groups received out of order.
  const payload = { contract_version: 1, provider: "asaas", environment: config.environment, expected_environment: config.environment,
    organization_id: config.organizationId, os_organization_id: ctx.subscription?.os_organization_id || null,
    club_organization_id: ctx.snapshot.products.includes("club") ? (ctx.subscription?.club_organization_id || CLUB_ORGANIZATION_ID) : null,
    auth_user_id: ctx.subscription?.auth_user_id || null, email: order.buyer_email, customer_id: order.provider_customer_id,
    ...(ctx.snapshot.price_mode === PIX_AUTO_MODE ? { provider_pix_authorization_id: order.provider_pix_authorization_id } : {}),
    provider_subscription_id: order.provider_subscription_id || null, checkout_order_id: order.id, order_id: ctx.orderId,
    payment_id: payment.id, event_id: /^[a-zA-Z0-9_:-]{1,180}$/.test(eventId || "") ? eventId : `lookup:${payment.id}:${payment.status}`, offer_key: ctx.snapshot.offer_key,
    offer_version: ctx.snapshot.offer_version, competence_key: ctx.competenceKey, competence_date: ctx.date, ...ctx.period,
    paid_at: null, verified_paid_at: proof.precision === "instant" ? proof.confirmed_at : null, confirmation_proof: proof,
    amount_cents: cents(payment.value), expected_amount_cents: ctx.expected, contract_total_cents: ctx.snapshot.contract_total_cents,
    currency: "BRL", price_mode: ctx.snapshot.price_mode, installment_count: ctx.snapshot.installment_count, installment_number: ctx.number,
    status: payment.status, grace_days: ctx.subscription?.grace_days ?? 7, club_enrollment_verification: { outcome: "unresolved" } };
  const result = await communityDb(config, "rpc/record_community_payment", { p_payment: payload });
  if (result?.contract_version !== 1 || !UUID.test(result.activation_id || "") || !UUID.test(result.subscription_id || "") ||
      !UUID.test(result.payment_id || "") || !Array.isArray(result.products) ||
      JSON.stringify([...result.products].sort()) !== JSON.stringify([...ctx.snapshot.products].sort()) ||
      ["period_start", "period_end"].some(key => typeof result[key] !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(result[key]) ||
        Date.parse(result[key]) !== Date.parse(ctx.period[key]))) throw new CommunityError("community_financial_record_pending");
  return { paid: true, result, confirmation: proof.precision, ctx, fulfillment: "provisioning_pending" };
}

async function reconcileOrderPayments(config, order, requestedPayment, financialEventId) {
  const deadline = Date.now() + 60000;
  if (order.sold_snapshot.price_mode === PIX_AUTO_MODE) config = { ...config, pixAutomaticDeadline: deadline };
  const checkDeadline = () => {
    if (Date.now() >= deadline) throw new CommunityError("community_reconciliation_timeout");
  };
  const ids = new Set();
  const auto = order.sold_snapshot.price_mode === PIX_AUTO_MODE;
  if (auto) { const auth = await pixAutomaticAuthorization(config, order); for (const id of await pixAutomaticPayments(config, order, auth)) ids.add(id); }
  if (requestedPayment) {
    if (!/^pay_[A-Za-z0-9_]+$/.test(requestedPayment.id || "")) throw new CommunityError("community_payment_identity_conflict", 422);
    ids.add(requestedPayment.id);
  }
  const path = order.provider_subscription_id ? `/subscriptions/${encodeURIComponent(order.provider_subscription_id)}/payments` :
    order.provider_installment_id ? `/installments/${encodeURIComponent(order.provider_installment_id)}/payments` : null;
  if (path) {
    let offset = 0, complete = false;
    const listed = new Set();
    // Bounded complete enumeration. A timeout, repeated page, malformed page or
    // exhausted bound must fail the caller, never ACK a partially scanned order.
    for (let page = 0; page < 20; page++) {
      checkDeadline();
      const data = await asaasGet(config, `${path}?limit=100&offset=${offset}`);
      checkDeadline();
      if (!Array.isArray(data.data) || data.data.length > 100 || typeof data.hasMore !== "boolean" ||
          (data.offset != null && data.offset !== offset)) throw new CommunityError("community_gateway_list_incomplete");
      for (const row of data.data) {
        if (!/^pay_[A-Za-z0-9_]+$/.test(row?.id || "")) throw new CommunityError("community_payment_identity_conflict", 422);
        if (listed.has(row.id)) throw new CommunityError("community_gateway_list_incomplete");
        listed.add(row.id); ids.add(row.id);
      }
      if (!data.hasMore) { complete = true; break; }
      if (!data.data.length) throw new CommunityError("community_gateway_list_incomplete");
      offset += data.data.length;
    }
    if (!complete) throw new CommunityError("community_gateway_list_incomplete");
  }
  // A known first charge/event can precede the list's eventual visibility. It
  // still needs its own verified GET and remains subject to all binding guards.
  if (order.provider_payment_id) ids.add(order.provider_payment_id);
  let selected = null, reviewed = false;
  for (const id of ids) {
    checkDeadline();
    const payment = await asaasGet(config, `/payments/${encodeURIComponent(id)}`);
    checkDeadline();
    if (payment.id !== id) throw new CommunityError("community_payment_identity_conflict", 422);
    // Never filter by a stale list status: deleted/refunded/partial-refund,
    // settled and fresh pending payments all use the same verified processor.
    const financial = await recordCommunityPayment(config, order, payment,
      id === requestedPayment?.id ? financialEventId : undefined);
    checkDeadline();
    if (financial.fulfillment === "manual_financial_review") reviewed = true;
    const current = { payment, financial };
    if (requestedPayment) {
      if (id === requestedPayment.id) selected = current;
    } else if (!auto && (order.provider_installment_id || !order.provider_subscription_id)) {
      if (id === order.provider_payment_id) selected = current;
    } else if (!selected || String(payment.originalDueDate) > String(selected.payment.originalDueDate) ||
        (payment.originalDueDate === selected.payment.originalDueDate && payment.id < selected.payment.id)) selected = current;
  }
  return { selected, reviewed };
}

export async function communityOrderStatus(config, inputOrder, eventId, requestedPayment, financialEventId) {
  const order = await reconcileCommunityOrder(config, inputOrder);
  const s = order.sold_snapshot;
  const plan = Object.keys(COMMUNITY_PLANS).find(p => COMMUNITY_PLANS[p].offerKey === s.offer_key) || null;
  const meta = { success: true, managedCommunity: true, gateway: "asaas", checkoutOrderId: order.id, orderId: order.id,
    plan, productId: COMMUNITY_PRODUCT_ID, amount: s.contract_total_cents / 100, installmentCount: s.installment_count,
    installmentValue: Math.floor(s.contract_total_cents / s.installment_count) / 100,
    billingType: ["pix", PIX_AUTO_MODE].includes(s.price_mode) ? "PIX" : "CREDIT_CARD", eventId: eventId || `purch_${order.id}`,
    expiresAt: new Date(Date.parse(order.created_at) + 30 * 60 * 1000).toISOString() };
  if (order.status !== "created") return { ...meta, paid: false, status: order.status.toUpperCase(), orderStatus: order.status,
    recoverable: true, retryCreationAllowed: order.status === "failed" && Boolean(order.result?.failure_proof) };
  const { selected, reviewed } = await reconcileOrderPayments(config, order, requestedPayment, financialEventId);
  const autoAuthorization = s.price_mode === PIX_AUTO_MODE ? await pixAutomaticAuthorization(config, order) : null;
  const automaticMeta = autoAuthorization ? { pixAutomatic: true, authorizationId: autoAuthorization.id,
    pixAutomaticAuthorizationStatus: autoAuthorization.status } : {};
  if (!selected && s.price_mode === PIX_AUTO_MODE) {
    const auth = autoAuthorization;
    const qr = auth.status === "CREATED" && Date.parse(meta.expiresAt) > Date.now() && auth.payload && auth.encodedImage ? {
      copyPaste: auth.payload, qrCodeBase64: `data:image/png;base64,${auth.encodedImage}`, expiresAt: meta.expiresAt } : null;
    return { ...meta, ...automaticMeta, paymentId: `auto_${auth.id}`,
      status: auth.status === "ACTIVE" ? "PENDING" : auth.status, authorizationStatus: auth.status,
      paid: false, isApproved: false, orderStatus: "created", ...(qr ? { pix: qr } : { pixPending: true }) };
  }
  if (!selected) return { ...meta, paymentId: order.provider_subscription_id, subscriptionId: order.provider_subscription_id,
    status: "PENDING", paid: false, orderStatus: "created", recoverable: true };
  const { payment, financial } = selected;
  let pix = null;
  if (s.price_mode !== PIX_AUTO_MODE && !financial.paid && payment.billingType === "PIX" && !payment.deleted && Date.parse(meta.expiresAt) > Date.now()) {
    try {
      const qr = await asaasGet(config, `/payments/${encodeURIComponent(payment.id)}/pixQrCode`);
      if (qr.payload && qr.encodedImage) pix = { copyPaste: qr.payload, qrCodeBase64: `data:image/png;base64,${qr.encodedImage}`, expiresAt: meta.expiresAt };
    } catch (_) { /* Recover the same payment later; never create another Pix. */ }
  }
  const result = { ...meta, ...automaticMeta, eventId: eventId || `purch:${financial.ctx.competenceKey}`, orderId: financial.ctx.orderId, paymentId: payment.id, ...(order.provider_subscription_id ? { subscriptionId: order.provider_subscription_id } : {}),
    status: payment.status, paid: financial.paid, isApproved: financial.paid, orderStatus: "created", chargeAmount: cents(payment.value) / 100,
    fulfillment: reviewed ? "manual_financial_review" : financial.fulfillment, confirmationPrecision: financial.confirmation || null,
    ...(financial.result ? { activationId: financial.result.activation_id, products: financial.result.products,
      periodStart: financial.result.period_start, periodEnd: financial.result.period_end } : {}),
    invoiceUrl: payment.invoiceUrl, deleted: Boolean(payment.deleted), ...(pix ? { pix } : payment.billingType === "PIX" && !financial.paid ? { pixPending: true } : {}) };
  // Server-only analytics context; do not expose buyer details in public status.
  Object.defineProperty(result, "trackingBuyer", { value: { email: order.buyer_email, name: order.buyer_name, phone: order.buyer_phone } });
  return result;
}
export async function tryCommunityPayment({ env, payment, eventId, webhook = false, request }) {
  if (webhook && (!env?.ASAAS_WEBHOOK_TOKEN || request.headers.get("asaas-access-token") !== env.ASAAS_WEBHOOK_TOKEN)) throw new CommunityError("asaas_unauthorized", env?.ASAAS_WEBHOOK_TOKEN ? 401 : 503);
  const ref = communityReferenceId(payment.externalReference);
  if (!ref && typeof payment.externalReference === "string") {
    if (payment.externalReference.startsWith("cal-asaas:")) return null;
    try {
      const legacy = JSON.parse(payment.externalReference);
      if (legacy?.plan === "consultoria" || (legacy?.product_id && legacy.product_id !== COMMUNITY_PRODUCT_ID)) return null;
    } catch (_) { /* An omitted/unknown reference still checks durable IDs. */ }
  }
  if (!ref && (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY)) return null;
  const config = communityConfig(env);
  const order = await resolveCommunityOrder(config, payment);
  if (!order) return null;
  if (webhook && (!env.ASAAS_WEBHOOK_TOKEN || request.headers.get("asaas-access-token") !== env.ASAAS_WEBHOOK_TOKEN)) throw new CommunityError("asaas_unauthorized", env.ASAAS_WEBHOOK_TOKEN ? 401 : 503);
  return communityOrderStatus(config, order, webhook ? undefined : eventId, payment.id.startsWith("sub_") ? undefined : payment, webhook ? eventId : undefined);
}
export async function communityIntentStatus(env, key, eventId) {
  const config = communityConfig(env);
  if (!UUID.test(key || "")) throw new CommunityError("community_invalid_request_key", 400);
  const order = await findCommunityOrder(config, "request_key", key);
  if (!order) return { success: true, gateway: "asaas", paid: false, status: "MISSING", recoverable: true, retryCreationAllowed: true };
  return communityOrderStatus(config, order, eventId);
}
export function communityErrorResponse(error, headers = {}) {
  return Response.json({ success: false, ok: false, error: error instanceof CommunityError ? error.code : "community_processing_pending",
    recoverable: true }, { status: error instanceof CommunityError ? error.status : 503, headers });
}

export async function communityAutomaticStatus(env, opaqueId, eventId) {
  if (!opaqueId.startsWith('auto_') || !UUID.test(opaqueId.slice(5))) throw new CommunityError('community_invalid_lookup',400);
  const config = communityConfig(env);
  const order = await findCommunityOrder(config,'provider_pix_authorization_id',opaqueId.slice(5));
  if (!order || order.sold_snapshot.price_mode !== PIX_AUTO_MODE) throw new CommunityError('community_order_missing',422);
  return communityOrderStatus(config,order,eventId);
}
export async function communityAutomaticWebhook(env, request, payload) {
  if (!env?.ASAAS_WEBHOOK_TOKEN || request.headers.get('asaas-access-token') !== env.ASAAS_WEBHOOK_TOKEN)
    throw new CommunityError('asaas_unauthorized',env?.ASAAS_WEBHOOK_TOKEN ? 401 : 503);
  const config = communityConfig(env);
  const order = await resolvePixAutomaticAuthorization(config,payload.authorization?.id);
  if (!order) return { status: 'ignored_product' };
  return communityOrderStatus(config,order);
}
