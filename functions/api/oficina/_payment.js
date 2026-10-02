import { json, validOficinaPayment, paymentState, normalizePhone } from "./_shared.js";
import { findCheckout } from "./_checkout.js";
import { dispatchOficinaPurchase } from "./_tracking.js";
import { captureLead, sourceConfig, recordPayment } from "./_crm.js";

export async function handleOficinaPayment({ request, env = {}, payment }) {
  // Authentication is mandatory for this branch even when legacy handlers
  // accept unauthenticated provider payloads.
  if (!env.OFICINA_ASAAS_WEBHOOK_TOKEN) return json({ ok: false, error: "oficina_webhook_not_configured" }, 503);
  if (request.headers.get("asaas-access-token") !== env.OFICINA_ASAAS_WEBHOOK_TOKEN) return json({ ok: false, error: "asaas_unauthorized" }, 401);
  let paymentEnv = env;
  if (!env.OFICINA_PAYMENT_LINK_ID) {
    try {
      const link = await findCheckout(env);
      if (!link) throw new Error("missing_link");
      paymentEnv = { ...env, OFICINA_PAYMENT_LINK_ID: link.paymentLinkId };
    } catch { return json({ ok: false, error: "oficina_link_verification_pending" }, 503); }
  }
  if (!validOficinaPayment(payment, paymentEnv)) return json({ ok: false, error: "oficina_payment_mismatch" }, 422);
  const state = paymentState(payment);
  if (!state) return json({ ok: false, error: "oficina_status_unrecognized" }, 422);
  try {
    const config = await sourceConfig(env);
    if (typeof payment.customer !== "string" || !/^cus_[A-Za-z0-9_-]+$/.test(payment.customer)) throw new Error("customer_missing");
    const response = await fetch(`https://api.asaas.com/v3/customers/${encodeURIComponent(payment.customer)}`, {
      headers: { access_token: env.ASAAS_API_KEY, "User-Agent": "Imobiturbo-Oficina/1.0" }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("customer_unavailable");
    const customer = await response.json();
    if (customer.id !== payment.customer) throw new Error("customer_mismatch");
    const phone = normalizePhone(customer.mobilePhone || customer.phone);
    const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
    if (!phone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("customer_identity_missing");
    // No fabricated consent/profile: buyer can enter through the hosted link
    // without submitting our pre-checkout form.
    const leadId = await captureLead(env, { name: customer.name || "Participante da oficina", email, phone: phone || "" }, "oficina:payment:" + payment.id, config);
    const result = await recordPayment(env, leadId, payment, state, config);
    if (state === "pago" && result.state === "pago") {
      const tracking = await dispatchOficinaPurchase({ env, payment, leadId, config, customer, trustedPaymentLinkId: paymentEnv.OFICINA_PAYMENT_LINK_ID });
      if (!tracking.hub || !tracking.meta) return json({ ok: false, error: "oficina_purchase_tracking_pending" }, 503);
    }
    return json({ ok: true, productId: "oficina-imobiturbo-202610", paymentId: payment.id, ...result });
  } catch {
    return json({ ok: false, error: "oficina_crm_pending" }, 503);
  }
}
