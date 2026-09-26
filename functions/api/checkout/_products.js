export const COMMUNITY_PRODUCT_ID = "comunidade-imobiturbo";
export const CONSULTING_PRODUCT_ID = "consultoria-individual-natan";

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
  const expiresAt = Date.parse(reference.checkout_expires_at);
  return {
    productId: consulting ? CONSULTING_PRODUCT_ID : COMMUNITY_PRODUCT_ID,
    plan,
    eventId: typeof reference.eid === "string" ? reference.eid :
      (typeof payment.externalReference === "string" && !payment.externalReference.startsWith("{") ? payment.externalReference : `purch_${payment.id}`),
    expiresAt: Number.isFinite(expiresAt) ? new Date(expiresAt).toISOString() : null,
  };
}

export function isAsaasPaymentPaid(payment) {
  return payment.deleted !== true &&
    ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(payment.status);
}
