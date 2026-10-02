import { json } from "./_shared.js";
import { identifyOficinaPayment } from "./_checkout.js";
import { handleOficinaPayment } from "./_payment.js";

export async function onRequestPost({ request, env = {} }) {
  if (!env.OFICINA_ASAAS_WEBHOOK_TOKEN || !env.ASAAS_API_KEY) return json({ ok: false, error: "oficina_webhook_not_configured" }, 503);
  if (request.headers.get("asaas-access-token") !== env.OFICINA_ASAAS_WEBHOOK_TOKEN) return json({ ok: false, error: "asaas_unauthorized" }, 401);
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const id = payload?.payment?.id;
  if (!id) return json({ ok: true, status: "ignored_event" });
  if (typeof id !== "string" || !/^pay_[A-Za-z0-9_-]+$/.test(id)) return json({ ok: false, error: "invalid_payment_id" }, 422);
  try {
    const response = await fetch("https://api.asaas.com/v3/payments/" + encodeURIComponent(id), {
      headers: { access_token: env.ASAAS_API_KEY, "User-Agent": "Imobiturbo-Oficina/1.0" }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return json({ ok: false, error: "asaas_verification_pending" }, 503);
    const payment = await response.json();
    if (payment.id !== id) return json({ ok: false, error: "asaas_payment_mismatch" }, 422);
    if (!await identifyOficinaPayment(payment, env)) return json({ ok: true, status: "ignored_product" });
    return await handleOficinaPayment({ request, env, payment });
  } catch { return json({ ok: false, error: "oficina_verification_pending" }, 503); }
}
