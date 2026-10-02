import { json } from "./_shared.js";
import { ensureCheckout } from "./_checkout.js";

export async function onRequestPost({ env = {} }) {
  // No buyer input, no customer/payment creation. Fixed hosted resource only.
  try { return json(await ensureCheckout(env)); }
  catch { return json({ ok: false, error: "oficina_checkout_unavailable" }, 503); }
}
