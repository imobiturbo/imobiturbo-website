import { dispatchVerifiedPurchaseToHub } from "../checkout/_tracking.js";
import { paymentContext, savePaymentDelivery } from "./_crm.js";
import { OFICINA_REFERENCE, validOficinaPayment, paymentState, normalizePhone } from "./_shared.js";

async function sha(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function dispatchOficinaPurchase({ env, payment, leadId, config, customer, trustedPaymentLinkId }) {
  if (!validOficinaPayment(payment, { ...env, OFICINA_PAYMENT_LINK_ID: trustedPaymentLinkId }) || paymentState(payment) !== "pago") return { hub: false, meta: false };
  const row = await paymentContext(env, leadId, config);
  const saved = row.source_metadata?.oficina_payments?.[payment.id];
  if (saved?.state !== "pago") return { hub: false, meta: false };
  if (saved.hubPurchaseSent && saved.metaPurchaseSent) return { hub: true, meta: true };
  const original = { ...(row.source_metadata?.meta_form?.answers || {}), ...row.custom_fields, ...row.source_metadata };
  const email = (row.contact.email || customer.email || "").trim().toLowerCase();
  const phone = (normalizePhone(row.contact.phone_number || customer.mobilePhone || customer.phone || "") || "").replace(/\D/g, "");
  const eventId = "oficina-purchase-" + payment.id;
  const visitorId = original.visitor_id || original.rt_vid || "";
  let hub = Boolean(saved.hubPurchaseSent), meta = Boolean(saved.metaPurchaseSent);
  if (!hub) {
    hub = await dispatchVerifiedPurchaseToHub({ env, paymentId: payment.id, eventId, amount: 47,
      contentName: "Oficina Imobiturbo", productId: OFICINA_REFERENCE, email, phone, name: row.contact.name || customer.name,
      fbp: original.fbp || "", fbc: original.fbc || "", visitorId, sessionId: original.session_id || "", tracking: original,
    });
  }
  if (!meta && env.META_ACCESS_TOKEN) {
    try {
      const userData = {};
      if (email) userData.em = [await sha(email)];
      if (phone) userData.ph = [await sha(phone)];
      if (visitorId) userData.external_id = [await sha(visitorId)];
      if (original.fbp) userData.fbp = original.fbp;
      if (original.fbc) userData.fbc = original.fbc;
      const response = await fetch("https://graph.facebook.com/v25.0/1025303472485246/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: env.META_ACCESS_TOKEN, data: [{ event_name: "Purchase", event_id: eventId,
          event_time: saved.purchaseEventTime, action_source: "website", event_source_url: "https://www.imobiturbo.com.br/oficina/",
          user_data: userData, custom_data: { value: 47, currency: "BRL", content_type: "product", content_ids: [OFICINA_REFERENCE],
            content_name: "Oficina Imobiturbo", order_id: payment.id },
        }] }), signal: AbortSignal.timeout(5000),
      });
      const result = await response.json();
      meta = response.ok && result.events_received > 0 && !result.error;
    } catch { meta = false; }
  }
  await savePaymentDelivery(env, leadId, payment.id, { hub, meta }, config);
  return { hub, meta };
}
