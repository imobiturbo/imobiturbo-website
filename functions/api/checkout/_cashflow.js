import { checkoutDetails, CONSULTING_PRODUCT_ID, isValidConsultingPayment } from "./_products.js";

function eventForPayment(payment) {
  if (payment.deleted === true || ["DELETED", "CANCELED", "CANCELLED"].includes(payment.status)) return "PAYMENT_DELETED";
  const events = {
    CONFIRMED: "PAYMENT_CONFIRMED",
    RECEIVED: "PAYMENT_RECEIVED",
    RECEIVED_IN_CASH: "PAYMENT_RECEIVED_IN_CASH",
    PENDING: "PAYMENT_CREATED",
    AWAITING_PAYMENT: "PAYMENT_CREATED",
    OVERDUE: "PAYMENT_OVERDUE",
    REFUNDED: "PAYMENT_REFUNDED",
    CHARGEBACK_REQUESTED: "PAYMENT_CHARGEBACK_REQUESTED",
    CHARGEBACK_DISPUTE: "PAYMENT_CHARGEBACK_DISPUTE",
  };
  if (payment.status === "PARTIALLY_REFUNDED" && Array.isArray(payment.refunds) &&
      payment.refunds.some(refund => refund?.status === "DONE" && Number(refund.value) > 0)) {
    return "PAYMENT_PARTIALLY_REFUNDED";
  }
  return events[payment.status] || null;
}

// The Hub Cashflow webhook is a separate authenticated integration from its
// browser funnel tracker. Each Asaas installment keeps its own saleId; the
// shared externalReference carries one order id for funnel-level deduplication.
export async function dispatchConsultingCashflowToHub({ env, payment, trustedDetails = null }) {
  const endpoint = (env?.HUB_CASHFLOW_WEBHOOK_URL || "").trim();
  const token = env?.HUB_CASHFLOW_WEBHOOK_TOKEN || "";
  if (!endpoint || !token || !payment?.id) return false;

  const details = trustedDetails || checkoutDetails(payment);
  if (details.productId !== CONSULTING_PRODUCT_ID || !isValidConsultingPayment(payment, details)) return false;
  const event = eventForPayment(payment);
  if (!event) return false;

  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.hostname !== "hub.imobiturbo.com.br" ||
        !/^\/api\/cashflow\/webhooks\/asaas\/[0-9a-f-]{36}$/i.test(url.pathname)) return false;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "asaas-access-token": token },
      body: JSON.stringify({
        id: `consultoria-${payment.id}-${event}`,
        event,
        dateCreated: payment.dateCreated || new Date().toISOString(),
        payment,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
