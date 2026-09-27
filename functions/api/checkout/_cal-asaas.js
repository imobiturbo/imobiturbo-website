import { CONSULTING_PRODUCT_ID, isValidConsultingPayment } from "./_products.js";

export const CAL_ASAAS_REFERENCE_PREFIX = "cal-asaas:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOOKING_UID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const CONSULTING_BASE_AMOUNT_CENTS = 49700;

export function parseCalAsaasReference(externalReference) {
  if (typeof externalReference !== "string" || !externalReference.startsWith(CAL_ASAAS_REFERENCE_PREFIX)) return null;
  const uid = externalReference.slice(CAL_ASAAS_REFERENCE_PREFIX.length);
  return { uid, valid: UUID_PATTERN.test(uid) };
}

function unavailable() {
  return new Error("cal_asaas_order_lookup_unavailable");
}

function validOrderEnvelope(order, uid) {
  return Boolean(order && typeof order === "object" && !Array.isArray(order) &&
    order.uid === uid && UUID_PATTERN.test(order.uid) &&
    typeof order.bookingUid === "string" && BOOKING_UID_PATTERN.test(order.bookingUid) &&
    (typeof order.productId === "string" || order.productId === null));
}

export async function fetchCalAsaasOrder({ env, uid }) {
  const token = typeof env?.CAL_ASAAS_INTEGRATION_TOKEN === "string" ? env.CAL_ASAAS_INTEGRATION_TOKEN.trim() : "";
  if (!token || !UUID_PATTERN.test(uid || "")) throw unavailable();

  const url = new URL("https://agenda.imobiturbo.com.br/api/integrations/asaas/order");
  url.searchParams.set("uid", uid);
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: "Bearer " + token, "User-Agent": "Imobiturbo-Checkout/1.0" },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw unavailable();
  }
  if (!response.ok) throw unavailable();

  let order;
  try { order = await response.json(); }
  catch { throw unavailable(); }
  if (!validOrderEnvelope(order, uid)) throw unavailable();
  return order;
}

function providerCustomerId(value) {
  if (typeof value === "string") return value;
  return value && typeof value.id === "string" ? value.id : "";
}

function installmentCentsFor(totalCents, count, number) {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return base + (number === count ? remainder : 0);
}

function paymentMatchesInstallmentAmount(payment, totalCents, count) {
  const valueCents = Math.round(Number(payment.value) * 100);
  if (!Number.isSafeInteger(valueCents)) return false;
  if (payment.installmentNumber == null) {
    return [installmentCentsFor(totalCents, count, 1), installmentCentsFor(totalCents, count, count)].includes(valueCents);
  }
  const number = Number(payment.installmentNumber);
  return Number.isInteger(number) && number >= 1 && number <= count &&
    valueCents === installmentCentsFor(totalCents, count, number);
}

async function fetchAsaasInstallment({ env, installmentId }) {
  if (!env?.ASAAS_API_KEY) throw unavailable();
  let response;
  try {
    response = await fetch("https://api.asaas.com/v3/installments/" + encodeURIComponent(installmentId), {
      headers: { access_token: env.ASAAS_API_KEY, "User-Agent": "Imobiturbo-Checkout/1.0" },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw unavailable();
  }
  if (!response.ok) throw unavailable();
  try { return await response.json(); }
  catch { throw unavailable(); }
}

function expectedTotalCents(installmentCount) {
  if (installmentCount === 1 || installmentCount <= 3) return CONSULTING_BASE_AMOUNT_CENTS;
  return 58800;
}

function trustedConsultingDetails(order) {
  const count = order.installmentCount;
  const offerCode = count === 1 ? "consultoria-a-vista" :
    count === 12 ? "consultoria-12x49" : "consultoria-" + count + "x";
  return {
    productId: CONSULTING_PRODUCT_ID,
    plan: "consultoria",
    eventId: order.uid,
    expiresAt: null,
    offerCode,
    orderId: order.uid,
    installmentCount: count,
    installmentValue: Math.floor(order.totalAmount / count) / 100,
    orderAmount: order.totalAmount / 100,
  };
}

export async function resolveCalAsaasConsultingPayment({ env, uid, payment }) {
  const order = await fetchCalAsaasOrder({ env, uid });
  if (order.productId !== CONSULTING_PRODUCT_ID) return { kind: "ignored_product", order };

  const count = order.installmentCount;
  const totalCents = order.totalAmount;
  const expectedTotal = Number.isInteger(count) && count >= 1 && count <= 12 ? expectedTotalCents(count) : 0;
  const providerPaymentId = typeof payment?.id === "string" ? payment.id : "";
  const customerMatches = providerCustomerId(payment?.customer) === order.customerId;
  const billingMatches = payment?.billingType === order.billingType;
  const amountMatches = count === 1
    ? Math.round(Number(payment?.value) * 100) === totalCents
    : paymentMatchesInstallmentAmount(payment || {}, totalCents, count);

  if (order.eventTypeId !== 7 ||
      !Number.isInteger(count) || count < 1 || count > 12 ||
      !Number.isSafeInteger(totalCents) || totalCents !== expectedTotal ||
      order.baseAmount !== CONSULTING_BASE_AMOUNT_CENTS ||
      !["PIX", "CREDIT_CARD"].includes(order.billingType) ||
      (count > 1 && order.billingType !== "CREDIT_CARD") ||
      typeof order.paymentId !== "string" || !order.paymentId ||
      typeof order.customerId !== "string" || !order.customerId ||
      (!order.installmentId && count > 1) ||
      !customerMatches || !billingMatches || !amountMatches) {
    return { kind: "payment_mismatch", order };
  }

  const samePayment = providerPaymentId === order.paymentId;
  if (count === 1) {
    if (!samePayment || payment.installment) return { kind: "payment_mismatch", order };
  } else {
    if (!order.installmentId || payment.installment !== order.installmentId) {
      return { kind: "payment_mismatch", order };
    }
    const installment = await fetchAsaasInstallment({ env, installmentId: order.installmentId });
    if (installment?.id !== order.installmentId ||
        providerCustomerId(installment.customer) !== order.customerId ||
        installment.billingType !== order.billingType ||
        Number(installment.installmentCount) !== count ||
        Math.round(Number(installment.totalValue) * 100) !== totalCents) {
      return { kind: "payment_mismatch", order };
    }
    if (!samePayment && !payment.installment) return { kind: "payment_mismatch", order };
  }

  const details = trustedConsultingDetails(order);
  if (!isValidConsultingPayment(payment, details)) return { kind: "payment_mismatch", order };
  return { kind: "consulting", order, details };
}
