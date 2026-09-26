import { checkoutDetails, CONSULTING_PRODUCT_ID, isAsaasPaymentPaid } from "./_products.js";
import { dispatchVerifiedPurchaseToHub, dispatchPendingPurchaseToHub } from "./_tracking.js";

// A consulting payment never grants, extends or revokes community membership.
// Scheduling is initiated by the buyer on the confirmed thank-you screen.
export async function handleConsultingWebhook({ request, env, paymentId, verifiedPayment }) {
  if (!env?.ASAAS_API_KEY || !paymentId) {
    return Response.json({ ok: false, error: "consulting_verification_unavailable" }, { status: 503 });
  }
  let payment = verifiedPayment;
  if (!payment) {
    const response = await fetch(`https://api.asaas.com/v3/payments/${encodeURIComponent(paymentId)}`, {
      headers: { access_token: env.ASAAS_API_KEY, "User-Agent": "Imobiturbo-Checkout/1.0" }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return Response.json({ ok: false, error: "consulting_verification_pending" }, { status: 503 });
    payment = await response.json();
  }
  const details = checkoutDetails(payment);
  if (details.productId !== CONSULTING_PRODUCT_ID || Number(payment.value) !== 497) {
    return Response.json({ ok: false, error: "consulting_payment_mismatch" }, { status: 422 });
  }
  const paid = isAsaasPaymentPaid(payment);
  const pending = !payment.deleted && ["PENDING", "AWAITING_PAYMENT"].includes(payment.status);
  if (paid || pending) {
    const dispatch = paid ? dispatchVerifiedPurchaseToHub : dispatchPendingPurchaseToHub;
    await dispatch({
      env, request, paymentId: payment.id, eventId: details.eventId,
      productId: CONSULTING_PRODUCT_ID, amount: 497,
      contentName: "Consultoria Individual de 1h com Natan Pimentel",
      paymentMethod: payment.billingType,
    });
  }
  return Response.json({
    ok: true, paid, pending, productId: CONSULTING_PRODUCT_ID,
    fulfillment: paid ? "schedule_on_thank_you_page" : pending ? "awaiting_payment" : "manual_review",
    communityMembershipChanged: false,
  });
}
