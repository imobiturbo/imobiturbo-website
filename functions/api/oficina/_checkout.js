import { OFICINA_REFERENCE, OFICINA_PRICE, isOficinaPayment } from "./_shared.js";

export const OFICINA_LINK_NAME = "Oficina Imobiturbo - 9 e 10 outubro 2026";
export const OFICINA_CALLBACK = "https://www.imobiturbo.com.br/oficina/obrigado/";
const inFlight = new Map();

export function checkoutResult(link) {
  let url;
  try { url = new URL(link.url); } catch { throw new Error("oficina_link_invalid"); }
  if (url.protocol !== "https:" || url.username || url.password ||
      !["asaas.com", "www.asaas.com"].includes(url.hostname) ||
      typeof link.id !== "string" || !link.id || link.deleted === true || link.active === false ||
      link.externalReference !== OFICINA_REFERENCE || Number(link.value) !== OFICINA_PRICE ||
      link.chargeType !== "DETACHED" || link.billingType !== "UNDEFINED" ||
      Number(link.maxInstallmentCount) !== 1 || link.notificationEnabled !== true ||
      link.callback?.successUrl !== OFICINA_CALLBACK) throw new Error("oficina_link_invalid");
  return { ok: true, checkoutUrl: url.href, paymentLinkId: link.id };
}

async function api(env, path, options = {}) {
  if (!env.ASAAS_API_KEY) throw new Error("asaas_not_configured");
  const response = await fetch("https://api.asaas.com/v3" + path, {
    ...options, headers: { access_token: env.ASAAS_API_KEY, "User-Agent": "Imobiturbo-Oficina/1.0", "Content-Type": "application/json" }, signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("oficina_link_provider_" + response.status);
  return response.json();
}

export async function findCheckout(env) {
  if (env.OFICINA_PAYMENT_LINK_ID) return checkoutResult(await api(env, "/paymentLinks/" + encodeURIComponent(env.OFICINA_PAYMENT_LINK_ID)));
  // Both filters are documented. The second catches same-name resources whose
  // metadata was changed: do not create another resource over such a conflict.
  for (const filter of [{ externalReference: OFICINA_REFERENCE }, { name: OFICINA_LINK_NAME }]) {
    const matches = [];
    for (let offset = 0; ; offset += 100) {
      if (offset >= 10000) throw new Error("oficina_link_pagination_limit");
      const params = new URLSearchParams({ limit: "100", offset: String(offset), ...filter });
      const page = await api(env, "/paymentLinks?" + params);
      if (!Array.isArray(page.data)) throw new Error("oficina_link_invalid_response");
      for (const link of page.data) {
        if (link.externalReference === OFICINA_REFERENCE || link.name === OFICINA_LINK_NAME) matches.push(link);
      }
      if (page.hasMore !== true) break;
      if (page.data.length === 0) throw new Error("oficina_link_invalid_pagination");
    }
    if (matches.length > 1) throw new Error("oficina_link_ambiguous");
    if (matches.length === 1) return checkoutResult(matches[0]);
  }
  return null;
}

export async function ensureCheckout(env) {
  if (!env.ASAAS_API_KEY) throw new Error("asaas_not_configured");
  // Coalesce concurrent first requests in this isolate. Asaas does not expose
  // a unique externalReference constraint: root bootstraps once before opening
  // lead capture; cross-isolate initial creation remains an operational gate.
  if (inFlight.has(env.ASAAS_API_KEY)) return inFlight.get(env.ASAAS_API_KEY);
  const promise = (async () => {
    const existing = await findCheckout(env);
    if (existing) return existing;
    const created = await api(env, "/paymentLinks", { method: "POST", body: JSON.stringify({
      name: OFICINA_LINK_NAME, description: "Dois encontros online de organização de carteira e acompanhamento. 9 e 10/10/2026, 19h30–21h30 Brasília.",
      value: OFICINA_PRICE, billingType: "UNDEFINED", chargeType: "DETACHED",
      maxInstallmentCount: 1, externalReference: OFICINA_REFERENCE,
      notificationEnabled: true, dueDateLimitDays: 1,
      callback: { successUrl: OFICINA_CALLBACK, autoRedirect: true },
    }) });
    // Read back from the processor before returning a usable link.
    if (typeof created.id !== "string" || !created.id) throw new Error("oficina_link_create_failed");
    return checkoutResult(await api(env, "/paymentLinks/" + encodeURIComponent(created.id)));
  })();
  inFlight.set(env.ASAAS_API_KEY, promise);
  try { return await promise; } finally { inFlight.delete(env.ASAAS_API_KEY); }
}

export async function identifyOficinaPayment(payment, env) {
  if (isOficinaPayment(payment, env)) return true;
  if (!payment.paymentLink) return false;
  // Provider-owned link identity also reserves office payments when the
  // payment reference was changed and no env link ID was configured.
  const link = await api(env, "/paymentLinks/" + encodeURIComponent(payment.paymentLink));
  if (link.id !== payment.paymentLink) throw new Error("oficina_link_identity_mismatch");
  return (typeof link.externalReference === "string" && link.externalReference.startsWith(OFICINA_REFERENCE)) || link.name === OFICINA_LINK_NAME;
}
