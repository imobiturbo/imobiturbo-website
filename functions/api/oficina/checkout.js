import { json } from "./_shared.js";
import { ensureCheckout } from "./_checkout.js";

export async function onRequestPost({ env = {} }) {
  if (env.OFICINA_SETUP_READY !== "true") return json({ ok: false, error: "oficina_checkout_unavailable" }, 503);
  // No buyer input, no customer/payment creation. Fixed hosted resource only.
  try { return json(await ensureCheckout(env)); }
  catch { return json({ ok: false, error: "oficina_checkout_unavailable" }, 503); }
}
