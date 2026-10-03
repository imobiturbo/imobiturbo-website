export const COMMUNITY_PRODUCT_ID = "comunidade-imobiturbo";
export const CONSULTING_PRODUCT_ID = "consultoria-individual-natan";
export const CONSULTING_HUB_OFFER_ID = "12e90537-263d-4150-9757-52193187ffbd";

// Public offers only. Historical semestral/live orders keep their legacy reader.
export const COMMUNITY_PLANS = Object.freeze({
  mensal: { offerKey: "comunidade-mensal", months: 1, pixCents: 14700, cardCents: 14700, installments: 1 },
  trimestral: { offerKey: "comunidade-trimestral", months: 3, pixCents: 35700, cardCents: 38100, installments: 3 },
  anual: { offerKey: "comunidade-anual", months: 12, pixCents: 99700, cardCents: 116400, installments: 12 },
});

export function communityReferenceId(reference) {
  if (typeof reference !== "string" || !reference.startsWith("community:")) return null;
  const id = reference.slice(10);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : "invalid";
}

export function consultingInstallmentTotalCents(count) {
  return Number.isInteger(count) && count >= 4 && count <= 12 ? 58800 : 49700;
}

function installmentValueCents(totalCents, count, number = 1) {
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;
  return baseCents + (number === count ? remainderCents : 0);
}

function paymentOrderTotalCents(payment, count) {
  if (count !== 2 && count !== 3) return consultingInstallmentTotalCents(count);
  const parsedNumber = Number(payment.installmentNumber);
  const number = payment.installmentNumber != null && Number.isInteger(parsedNumber) && parsedNumber >= 1 && parsedNumber <= count ? parsedNumber : 1;
  const valueCents = Math.round(Number(payment.value) * 100);
  return [49700, 58800].find(total => installmentValueCents(total, count, number) === valueCents) ??
    consultingInstallmentTotalCents(count);
}

// Read provider-owned payment metadata. Never infer a paid state from a URL,
// a browser draft or the creation of an ACTIVE subscription.
export function checkoutDetails(payment = {}) {
  let reference = {};
  try {
    const parsed = JSON.parse(payment.externalReference || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) reference = parsed;
  } catch (_) {}
  const consulting = reference.product_id === CONSULTING_PRODUCT_ID || reference.plan === "consultoria" ||
    /^Consultoria Individual de 1h com Natan Pimentel/i.test(payment.description || "");
  const knownPlans = ["anual", "semestral", "trimestral", "mensal"];
  const plan = consulting ? "consultoria" : knownPlans.includes(reference.plan) ? reference.plan : null;
  const rawExp = reference.checkout_expires_at ?? reference.exp;
  const expiresAt = typeof rawExp === "number" ? rawExp : Date.parse(rawExp);
  const offerCode = consulting ? (typeof reference.offer_code === "string" ? reference.offer_code : "consultoria-a-vista") : null;
  const installmentMatch = typeof offerCode === "string" ? /^consultoria-([2-9]|1[0-2])x$/.exec(offerCode) : null;
  const installmentCount = offerCode === "consultoria-12x49" ? 12 : installmentMatch ? Number(installmentMatch[1]) : 1;
  const orderTotalCents = paymentOrderTotalCents(payment, installmentCount);
  const firstInstallmentCents = installmentCount > 1 ? Math.floor(orderTotalCents / installmentCount) : orderTotalCents;
  const orderId = consulting && typeof reference.eid === "string" && reference.eid
    ? `consultoria-${reference.eid}` : `purch_${payment.id}`;
  return {
    productId: consulting ? CONSULTING_PRODUCT_ID : (plan ? COMMUNITY_PRODUCT_ID : "unknown"),
    plan,
    ...(reference.offer_code === "live997" ? {
      offerCode: "live997",
      installmentCount: reference.i === 12 ? 12 : 1,
      orderAmount: reference.i === 12 ? 1196.40 : 997,
      orderId: reference.i === 12 ? `live-${reference.eid || payment.installment || payment.id}` : payment.id,
    } : {}),
    eventId: typeof reference.eid === "string" ? reference.eid :
      (typeof payment.externalReference === "string" && !payment.externalReference.startsWith("{") ? payment.externalReference : `purch_${payment.id}`),
    expiresAt: Number.isFinite(expiresAt) ? new Date(expiresAt).toISOString() : null,
    ...(consulting ? {
      offerCode,
      orderId,
      installmentCount,
      installmentValue: firstInstallmentCents / 100,
      orderAmount: orderTotalCents / 100,
    } : {}),
  };
}

export function isAsaasPaymentPaid(payment) {
  return payment.deleted !== true &&
    ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(payment.status);
}

export function isValidConsultingPayment(payment, details = checkoutDetails(payment)) {
  if (details.productId !== CONSULTING_PRODUCT_ID) return false;
  const value = Number(payment.value);
  if (details.offerCode === "consultoria-a-vista") {
    return ["PIX", "CREDIT_CARD"].includes(payment.billingType) && value === 497;
  }
  const count = Number(details.installmentCount);
  const expectedOffer = count === 12 ? ["consultoria-12x49", "consultoria-12x"].includes(details.offerCode) :
    details.offerCode === `consultoria-${count}x`;
  if (!expectedOffer || payment.billingType !== "CREDIT_CARD" || !Number.isInteger(count) || count < 2 || count > 12 || !Number.isFinite(value)) return false;
  let installmentNumber = 1;
  if (payment.installmentNumber != null) {
    installmentNumber = Number(payment.installmentNumber);
    if (!Number.isInteger(installmentNumber) || installmentNumber < 1 || installmentNumber > count) return false;
  }
  const supportedTotals = count <= 3 ? [49700, 58800] : [58800];
  return supportedTotals.some(totalCents => Math.round(value * 100) === installmentValueCents(totalCents, count, installmentNumber));
}
