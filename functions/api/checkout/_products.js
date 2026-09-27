export const COMMUNITY_PRODUCT_ID = "comunidade-imobiturbo";
export const CONSULTING_PRODUCT_ID = "consultoria-individual-natan";
export const CONSULTING_HUB_OFFER_ID = "12e90537-263d-4150-9757-52193187ffbd";

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
  const plan = consulting ? "consultoria" : knownPlans.includes(reference.plan) ? reference.plan :
    knownPlans.find(value => (payment.description || "").toLowerCase().includes(value)) || "anual";
  const rawExp = reference.checkout_expires_at ?? reference.exp;
  const expiresAt = typeof rawExp === "number" ? rawExp : Date.parse(rawExp);
  const offerCode = consulting ? (typeof reference.offer_code === "string" ? reference.offer_code : "consultoria-a-vista") : null;
  const installmentCount = offerCode === "consultoria-12x49" ? 12 : 1;
  const orderId = consulting && typeof reference.eid === "string" && reference.eid
    ? `consultoria-${reference.eid}` : `purch_${payment.id}`;
  return {
    productId: consulting ? CONSULTING_PRODUCT_ID : COMMUNITY_PRODUCT_ID,
    plan,
    eventId: typeof reference.eid === "string" ? reference.eid :
      (typeof payment.externalReference === "string" && !payment.externalReference.startsWith("{") ? payment.externalReference : `purch_${payment.id}`),
    expiresAt: Number.isFinite(expiresAt) ? new Date(expiresAt).toISOString() : null,
    ...(consulting ? {
      offerCode,
      orderId,
      installmentCount,
      installmentValue: installmentCount === 12 ? 49 : 497,
      orderAmount: installmentCount === 12 ? 588 : 497,
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
  if (details.offerCode === "consultoria-12x49") {
    return payment.billingType === "CREDIT_CARD" && value === 49;
  }
  return details.offerCode === "consultoria-a-vista" &&
    ["PIX", "CREDIT_CARD"].includes(payment.billingType) && value === 497;
}
