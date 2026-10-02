import { json, OFICINA_PRICE } from "./_shared.js";
import { findCheckout } from "./_checkout.js";

export async function onRequestGet({ env = {} }) {
  if (env.OFICINA_SETUP_READY !== "true") return json({ error: "oficina_checkout_unavailable" }, 503);
  try {
    if (env.OFICINA_CHECKOUT_URL) {
      const checkout = new URL(env.OFICINA_CHECKOUT_URL);
      if (checkout.protocol !== "https:" || checkout.username || checkout.password ||
          !["asaas.com", "www.asaas.com"].includes(checkout.hostname)) throw new Error("invalid_url");
      return json({ checkoutUrl: checkout.href, price: OFICINA_PRICE, datesConfirmed: true });
    }
    const found = await findCheckout(env); // Read only: GET never creates a link.
    if (!found) return json({ error: "oficina_checkout_unavailable" }, 503);
    return json({ checkoutUrl: found.checkoutUrl, price: OFICINA_PRICE, datesConfirmed: true });
  } catch { return json({ error: "oficina_checkout_unavailable" }, 503); }
}
