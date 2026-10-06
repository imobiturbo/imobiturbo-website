import { COMMUNITY_PLANS, communityReferenceId } from "./_products.js";

export const COMMERCIAL_ORGANIZATION_ID = "18b103e6-a006-45ac-84d5-62312f45ba77";
export const CLUB_ORGANIZATION_ID = "2c7053d4-e46e-435f-8d3a-42c65da30130";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class CommunityError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}
export function asaasConnection(env) {
  const base = (env?.ASAAS_API_URL || "https://api.asaas.com/v3").replace(/\/$/, "");
  const environment = base === "https://api.asaas.com/v3" ? "production" :
    base === "https://api-sandbox.asaas.com/v3" ? "sandbox" : null;
  if (!environment || (env?.ASAAS_ENVIRONMENT && env.ASAAS_ENVIRONMENT !== environment)) throw new CommunityError("community_environment_conflict");
  return { base, environment };
}
export function communityConfig(env) {
  const { base, environment } = asaasConnection(env);
  const organizationId = env?.COMMUNITY_ORGANIZATION_ID || COMMERCIAL_ORGANIZATION_ID;
  if (!UUID.test(organizationId) || !env?.ASAAS_API_KEY || !env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) {
    throw new CommunityError("community_configuration_unavailable");
  }
  const dbUrl = new URL(env.SUPABASE_URL);
  if (dbUrl.protocol !== "https:") throw new CommunityError("community_configuration_unavailable");
  return { base, environment, organizationId, db: dbUrl.origin, key: env.SUPABASE_SERVICE_ROLE_KEY,
    headers: { access_token: env.ASAAS_API_KEY, "User-Agent": "Imobiturbo-Community/1.0", "Content-Type": "application/json" } };
}
export async function communityDb(config, path, body) {
  const response = await fetch(`${config.db}/rest/v1/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(7000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const conflict = response.status === 409 || /community_.*conflict|offer_inactive/.test(data?.message || "");
    throw new CommunityError(conflict ? "community_order_conflict" : "community_storage_pending", conflict ? 409 : 503);
  }
  return data;
}
export async function asaasGet(config, path) {
  const response = await fetch(`${config.base}${path}`, { headers: config.headers, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new CommunityError("community_gateway_verification_pending");
  const data = await response.json();
  if (!data || typeof data !== "object") throw new CommunityError("community_gateway_verification_pending");
  return data;
}
// Read every page. Partial/outage results never prove absence.
export async function asaasList(config, path) {
  const rows = []; let offset = 0;
  for (let page = 0; page < 100; page++) {
    const data = await asaasGet(config, `${path}${path.includes("?") ? "&" : "?"}limit=100&offset=${offset}`);
    if (!Array.isArray(data.data) || typeof data.hasMore !== "boolean") throw new CommunityError("community_gateway_list_incomplete");
    rows.push(...data.data);
    if (!data.hasMore) return rows;
    if (!data.data.length) break;
    offset += data.data.length;
  }
  throw new CommunityError("community_gateway_list_incomplete");
}
export async function findCommunityOrder(config, field, value) {
  if (!["id", "request_key", "provider_payment_id", "provider_subscription_id", "provider_installment_id"].includes(field)) throw new CommunityError("community_invalid_lookup", 400);
  const query = new URLSearchParams({ provider: "eq.asaas", environment: `eq.${config.environment}`,
    organization_id: `eq.${config.organizationId}`, [field]: `eq.${value}`, limit: "2" });
  const rows = await communityDb(config, `cobranca_pedidos?${query}`);
  if (!Array.isArray(rows) || rows.length > 1) throw new CommunityError("community_order_identity_conflict", 422);
  return rows[0] ? assertCommunityOrder(config, rows[0]) : null;
}
export function assertCommunityOrder(config, order) {
  const s = order?.sold_snapshot;
  if (!order || !UUID.test(order.id) || order.provider !== "asaas" || order.environment !== config.environment ||
      order.organization_id !== config.organizationId || order.external_reference !== `community:${order.id}` ||
      s?.contract_version !== 1 || ![1, 3, 12].includes(s.duration_months) || s.currency !== "BRL" ||
      !Number.isSafeInteger(s.contract_total_cents) || s.contract_total_cents <= 0 ||
      !Number.isInteger(s.installment_count) || s.installment_count < 1 || s.installment_count > 12 ||
      !["pix", "recurring_card", "installment_card"].includes(s.price_mode) ||
      (s.price_mode !== "installment_card" && s.installment_count !== 1) ||
      !Array.isArray(s.products) || !s.products.length || s.products.some(p => !["os", "club"].includes(p)) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.buyer_email || "")) throw new CommunityError("community_order_identity_conflict", 422);
  return order;
}
export function communitySelection(body) {
  const plan = String(body.plan || body.planId || "anual").toLowerCase();
  const product = Object.hasOwn(COMMUNITY_PLANS, plan) ? COMMUNITY_PLANS[plan] : null;
  const method = String(body.paymentMethod || "PIX").toUpperCase();
  if (!product || !["PIX", "CREDIT_CARD"].includes(method)) throw new CommunityError("community_offer_unavailable", 400);
  const count = method === "PIX" ? 1 : product.installments;
  if (body.installments != null && Number(body.installments) !== count) throw new CommunityError("community_installments_conflict", 400);
  return { plan, method, count, product, priceMode: method === "PIX" ? "pix" : plan === "mensal" ? "recurring_card" : "installment_card",
    total: method === "PIX" ? product.pixCents : product.cardCents };
}
export async function communityIntent(config, body) {
  const choice = communitySelection(body);
  if (!UUID.test(body.idempotencyKey || "") || body.idempotencyKey === body.eventId) throw new CommunityError("community_idempotency_key_required", 400);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 200 || !/^[0-9]{8,15}$/.test(phone)) throw new CommunityError("community_invalid_buyer", 400);
  const intent = { contract_version: 1, organization_id: config.organizationId, provider: "asaas",
    environment: config.environment, expected_environment: config.environment, request_key: body.idempotencyKey,
    buyer_email: email, buyer_name: name, buyer_phone: phone, offer_key: choice.product.offerKey, offer_version: 1,
    price_mode: choice.priceMode, contract_total_cents: choice.total, installment_count: choice.count, currency: "BRL" };
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(intent)));
  return { ...intent, request_hash: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("") };
}
export async function finishCommunityOrder(config, order, result) {
  if (!UUID.test(order.claim_token || "")) throw new CommunityError("community_order_claim_required", 409);
  return assertCommunityOrder(config, await communityDb(config, "rpc/finish_community_order", {
    p_order_id: order.id, p_claim_token: order.claim_token, p_result: result,
  }));
}
export function cents(value) {
  const number = Number(value), rounded = Math.round(number * 100);
  if (!Number.isFinite(number) || !Number.isSafeInteger(rounded) || Math.abs(number * 100 - rounded) > 0.000001) throw new CommunityError("community_amount_conflict", 422);
  return rounded;
}
export function customerId(resource) { return typeof resource.customer === "string" ? resource.customer : resource.customer?.id; }
export async function verifyOrderResource(config, order, resource, kind) {
  const s = order.sold_snapshot;
  if (resource.externalReference !== order.external_reference || !customerId(resource) ||
      (order.provider_customer_id && customerId(resource) !== order.provider_customer_id) || resource.deleted === true ||
      resource.billingType !== (s.price_mode === "pix" ? "PIX" : "CREDIT_CARD")) throw new CommunityError("community_gateway_binding_conflict", 422);
  if (!order.provider_customer_id) {
    const customer = await asaasGet(config, `/customers/${encodeURIComponent(customerId(resource))}`);
    if (customer.id !== customerId(resource) || customer.deleted ||
        String(customer.email || "").trim().toLowerCase() !== order.buyer_email) throw new CommunityError("community_gateway_buyer_conflict", 422);
  }
  if (kind === "subscription") {
    if (s.price_mode !== "recurring_card" || !/^sub_[A-Za-z0-9_]+$/.test(resource.id || "") || resource.cycle !== "MONTHLY" ||
        cents(resource.value) !== s.contract_total_cents || resource.installment) throw new CommunityError("community_gateway_binding_conflict", 422);
    return { status: "created", price_mode: s.price_mode, installment_count: 1, provider_customer_id: customerId(resource),
      provider_subscription_id: resource.id, provider_payment_id: order.provider_payment_id || null, provider_installment_id: null };
  }
  if (!/^pay_[A-Za-z0-9_]+$/.test(resource.id || "") || resource.subscription || s.price_mode === "recurring_card") throw new CommunityError("community_gateway_binding_conflict", 422);
  if (s.installment_count > 1) {
    if (!resource.installment) throw new CommunityError("community_gateway_binding_conflict", 422);
    const group = await asaasGet(config, `/installments/${encodeURIComponent(resource.installment)}`);
    if (group.id !== resource.installment || customerId(group) !== customerId(resource) || group.billingType !== "CREDIT_CARD" ||
        Number(group.installmentCount) !== s.installment_count || cents(group.value) !== s.contract_total_cents) throw new CommunityError("community_gateway_binding_conflict", 422);
    if (resource.installmentNumber !== 1 || cents(resource.value) !== Math.floor(s.contract_total_cents / s.installment_count)) throw new CommunityError("community_gateway_binding_conflict", 422);
  } else if (resource.installment || cents(resource.value) !== s.contract_total_cents) throw new CommunityError("community_gateway_binding_conflict", 422);
  return { status: "created", price_mode: s.price_mode, installment_count: s.installment_count,
    provider_customer_id: customerId(resource), provider_payment_id: resource.id,
    provider_subscription_id: null, provider_installment_id: resource.installment || null };
}
export async function reconcileCommunityOrder(config, order) {
  assertCommunityOrder(config, order);
  if (order.status === "created") return order;
  if (order.status === "failed" && ["pre_effect_definitive", "absence_verified"].includes(order.result?.failure_proof?.kind)) return order;
  if (order.status === "creating" && Date.parse(order.lease_until) > Date.now()) return order;
  if (order.status === "creating") order = await finishCommunityOrder(config, order, { status: "uncertain", error_code: "lease_expired" });
  const recurring = order.sold_snapshot.price_mode === "recurring_card";
  const path = recurring ? "/subscriptions" : "/payments";
  const rows = await asaasList(config, `${path}?externalReference=${encodeURIComponent(order.external_reference)}`);
  const matches = rows.filter(r => r.externalReference === order.external_reference);
  const candidates = recurring ? matches : matches.filter(r => !r.installment || Number(r.installmentNumber) === 1);
  if (!matches.length) {
    // A search is not a guarantee that a timed-out POST has finished. Keep the
    // uncertain order; root may reconcile authoritative absence separately.
    return order;
  }
  if (candidates.length !== 1) throw new CommunityError("community_gateway_multiple_orders", 409);
  const candidate = await asaasGet(config, `${path}/${encodeURIComponent(candidates[0].id)}`);
  const result = await verifyOrderResource(config, order, candidate, recurring ? "subscription" : "payment");
  return finishCommunityOrder(config, order, { ...result, reconciliation_evidence_ref: `asaas:${config.environment}:${candidate.id}` });
}
export async function resolveCommunityOrder(config, payment) {
  const reference = communityReferenceId(payment.externalReference);
  if (reference === "invalid") throw new CommunityError("community_invalid_reference", 422);
  if (reference) {
    const order = await findCommunityOrder(config, "id", reference);
    if (!order) throw new CommunityError("community_order_missing", 422);
    return order;
  }
  // Provider-owned subscription/installment IDs can recover omitted references.
  for (const [field, value] of [["provider_subscription_id", payment.subscription || (payment.id?.startsWith("sub_") ? payment.id : null)], ["provider_installment_id", payment.installment], ["provider_payment_id", payment.id]]) {
    if (value) { const order = await findCommunityOrder(config, field, value); if (order) return order; }
  }
  return null;
}
async function asaasPost(config, path, body) {
  const response = await fetch(`${config.base}${path}`, { method: "POST", headers: config.headers,
    body: JSON.stringify(body), signal: AbortSignal.timeout(65000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.id) throw new CommunityError("community_creation_uncertain");
  return data;
}
export async function createCommunityOrder(env, body) {
  const config = communityConfig(env), intent = await communityIntent(config, body);
  const claimed = await communityDb(config, "rpc/claim_community_order", { p_order: intent, p_lease_seconds: 120 });
  let order = assertCommunityOrder(config, claimed?.order);
  if (order.request_key !== intent.request_key || order.request_hash !== intent.request_hash ||
      order.buyer_email !== intent.buyer_email || order.buyer_name !== intent.buyer_name || order.buyer_phone !== intent.buyer_phone ||
      ["offer_key", "offer_version", "price_mode", "contract_total_cents", "installment_count", "currency"].some(key => order.sold_snapshot[key] !== intent[key])) {
    throw new CommunityError("community_order_conflict", 409);
  }
  if (!claimed.claimed) return { config, order: await reconcileCommunityOrder(config, order) };
  if (order.status !== "creating" || !UUID.test(order.claim_token || "")) throw new CommunityError("community_order_claim_required", 409);
  const selection = communitySelection(body);
  // Validate ephemeral credentials before the first provider mutation. Never
  // store CPF/card data in the order, a hash, logs or a response.
  const cpf = typeof body.cpfCnpj === "string" ? body.cpfCnpj.replace(/\D/g, "") : "";
  const card = body.creditCard;
  const hosted = body.checkoutMode === "hosted";
  if (!/^\d{11}(\d{3})?$/.test(cpf) || (hosted && card) || (!hosted && selection.method === "CREDIT_CARD" &&
      (!card || !/^\d{13,19}$/.test(String(card.number || "").replace(/\D/g, "")) || !/^\d{3,4}$/.test(String(card.ccv || "")) ||
       !/^(0[1-9]|1[0-2])$/.test(String(card.expiryMonth || "")) || !/^\d{4}$/.test(String(card.expiryYear || ""))))) {
    order = await finishCommunityOrder(config, order, { status: "failed", error_code: "invalid_payment_data",
      failure_proof: { kind: "pre_effect_definitive", evidence_ref: `checkout:validation:${order.id}`, reason: "Invalid payment data before any gateway request" } });
    return { config, order };
  }
  let knownCustomer = null;
  try {
    const customers = await asaasList(config, `/customers?cpfCnpj=${encodeURIComponent(cpf)}`);
    // Do not repurpose somebody else's account based only on email.
    const exact = customers.filter(c => String(c.cpfCnpj || "").replace(/\D/g, "") === cpf && String(c.email || "").trim().toLowerCase() === order.buyer_email && !c.deleted);
    if (exact.length > 1) throw new CommunityError("community_customer_ambiguous", 409);
    const customer = exact[0] || await asaasPost(config, "/customers", { name: order.buyer_name, email: order.buyer_email,
      mobilePhone: order.buyer_phone, cpfCnpj: cpf, notificationDisabled: true, externalReference: order.external_reference });
    if (!/^cus_[A-Za-z0-9_]+$/.test(customer.id || "")) throw new CommunityError("community_gateway_binding_conflict", 422);
    knownCustomer = customer.id;
    const due = new Date().toISOString().slice(0, 10);
    const payload = { customer: knownCustomer, billingType: selection.method, externalReference: order.external_reference,
      description: `Comunidade Imobiturbo - Plano ${selection.plan}`, fine: { value: 0, type: "FIXED" }, interest: { value: 0 } };
    if (hosted) payload.callback = { successUrl: "https://www.imobiturbo.com.br/vagas/?paymentReturn=1", autoRedirect: true };
    const s = order.sold_snapshot;
    if (selection.method === "CREDIT_CARD" && !hosted) {
      payload.creditCard = { holderName: card.holderName || order.buyer_name, number: String(card.number).replace(/\D/g, ""), expiryMonth: card.expiryMonth, expiryYear: card.expiryYear, ccv: card.ccv };
      payload.creditCardHolderInfo = { name: card.holderName || order.buyer_name, email: order.buyer_email, cpfCnpj: cpf,
        postalCode: card.postalCode || "20050005", addressNumber: card.addressNumber || "1", phone: order.buyer_phone, mobilePhone: order.buyer_phone };
      if (body.remoteIp) payload.remoteIp = body.remoteIp;
    }
    const recurring = s.price_mode === "recurring_card";
    if (recurring) Object.assign(payload, { value: s.contract_total_cents / 100, cycle: "MONTHLY", nextDueDate: due });
    else if (s.installment_count > 1) Object.assign(payload, { dueDate: due, installmentCount: s.installment_count, totalValue: s.contract_total_cents / 100 });
    else Object.assign(payload, { dueDate: due, value: s.contract_total_cents / 100 });
    const path = recurring ? "/subscriptions" : "/payments";
    const created = await asaasPost(config, path, payload);
    const verified = await asaasGet(config, `${path}/${encodeURIComponent(created.id)}`);
    if (verified.id !== created.id || customerId(verified) !== knownCustomer) throw new CommunityError("community_gateway_binding_conflict", 422);
    const result = await verifyOrderResource(config, { ...order, provider_customer_id: knownCustomer }, verified, recurring ? "subscription" : "payment");
    order = await finishCommunityOrder(config, order, result);
    return { config, order };
  } catch (error) {
    // Any attempted provider mutation/unknown finish result is uncertain. No
    // fallback gateway, second POST, or fabricated absence/failure proof.
    try { order = await finishCommunityOrder(config, order, { status: "uncertain", ...(knownCustomer ? { provider_customer_id: knownCustomer } : {}), error_code: "gateway_creation_uncertain" }); }
    catch (_) { /* A successful finish may have lost its response; lookup wins. */ }
    if (error instanceof CommunityError && error.status === 409) throw error;
    return { config, order };
  }
}
