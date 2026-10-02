import { json } from "./_shared.js";
import { ensureCheckout } from "./_checkout.js";
import { ensureOficinaWebhook } from "./_setup.js";

export async function onRequestPost({ request, env = {} }) {
  if (!env.OFICINA_SETUP_TOKEN || env.OFICINA_SETUP_TOKEN.length < 32) return json({ ok: false, error: "oficina_setup_not_configured" }, 503);
  if (request.headers.get("Authorization") !== "Bearer " + env.OFICINA_SETUP_TOKEN) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.ASAAS_API_KEY || !env.OFICINA_ASAAS_WEBHOOK_TOKEN || env.OFICINA_ASAAS_WEBHOOK_TOKEN.length < 32 || env.OFICINA_ASAAS_WEBHOOK_TOKEN.length > 255) return json({ ok: false, error: "oficina_setup_not_configured" }, 503);
  try {
    const checkout = await ensureCheckout(env);
    const hook = await ensureOficinaWebhook(env);
    return json({ ...checkout, ...hook });
  } catch (error) {
    const reason = /^(oficina|asaas)_[a-z0-9_]+$/.test(error?.message || "") ? error.message : "oficina_setup_failed";
    return json({ ok: false, error: "oficina_setup_pending", reason, ...(error?.provider ? { provider: error.provider } : {}), ...(error?.details ? { details: error.details } : {}) }, 503);
  }
}
