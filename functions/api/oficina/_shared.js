export const OFICINA_REFERENCE = "oficina-imobiturbo-202610";
export const OFICINA_PRICE = 47;

export function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function isOficinaPayment(payment, env = {}) {
  // Reserve the whole namespace so malformed office references cannot fall
  // through to community provisioning. A configured link also identifies it.
  return (typeof payment.externalReference === "string" && payment.externalReference.startsWith(OFICINA_REFERENCE)) ||
    Boolean(env.OFICINA_PAYMENT_LINK_ID && payment.paymentLink === env.OFICINA_PAYMENT_LINK_ID);
}

export function validOficinaPayment(payment, env = {}) {
  return payment.externalReference === OFICINA_REFERENCE &&
    typeof payment.id === "string" && /^pay_[A-Za-z0-9_-]+$/.test(payment.id) &&
    Number(payment.value) === OFICINA_PRICE &&
    ["PIX", "CREDIT_CARD", "BOLETO"].includes(payment.billingType) &&
    Boolean(env.OFICINA_PAYMENT_LINK_ID) && payment.paymentLink === env.OFICINA_PAYMENT_LINK_ID &&
    !payment.subscription && !payment.installment;
}

export function paymentState(payment) {
  if (payment.deleted === true || ["REFUNDED", "REFUND_REQUESTED", "REFUND_IN_PROGRESS", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL", "CANCELED", "DELETED"].includes(payment.status)) return "cancelado";
  if (["CONFIRMED", "RECEIVED"].includes(payment.status)) return "pago";
  if (["PENDING", "AWAITING_PAYMENT", "OVERDUE", "DUNNING_REQUESTED", "DUNNING_RECEIVED", "AWAITING_RISK_ANALYSIS"].includes(payment.status)) return "pendente";
  return null;
}

export function normalizePhone(raw) {
  if (typeof raw !== "string" || !/^[+\d\s().-]+$/.test(raw) || raw.length > 30) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  if (!/^55[1-9]\d\d{8,9}$/.test(digits)) return null;
  // Match OS normalizePhoneBR for legacy Brazilian mobile numbers.
  if (digits.length === 12 && /[6-9]/.test(digits[4])) digits = digits.slice(0, 4) + "9" + digits.slice(4);
  return "+" + digits;
}

export function normalizeLead(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || input.consent !== true) return null;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = normalizePhone(input.phone);
  if (name.length < 2 || name.length > 120 || /[\x00-\x1f]/.test(name) ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phone || !["corretor", "gestor", "cliente_atual"].includes(input.profile)) return null;
  if (input.tracking != null && (typeof input.tracking !== "object" || Array.isArray(input.tracking))) return null;
  const tracking = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "imt_adset_name", "imt_adset_id", "imt_ad_id", "imt_placement", "fbclid", "fbc", "fbp", "visitor_id"]) {
    const value = input.tracking?.[key];
    if (value != null) {
      if (typeof value !== "string" || value.length > 500 || /[\x00-\x1f]/.test(value)) return null;
      tracking[key] = value;
    }
  }
  return { name, email, phone, profile: input.profile, consent: true, tracking };
}
