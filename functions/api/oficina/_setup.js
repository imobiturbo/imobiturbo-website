export const OFICINA_WEBHOOK_NAME = "Oficina Imobiturbo outubro2026";
export const OFICINA_WEBHOOK_URL = "https://www.imobiturbo.com.br/api/oficina/webhook";
export const OFICINA_WEBHOOK_EVENTS = ["PAYMENT_CREATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_REFUNDED", "PAYMENT_DELETED", "PAYMENT_OVERDUE"];

async function api(env, path, options = {}) {
  const response = await fetch("https://api.asaas.com/v3" + path, {
    ...options, headers: { access_token: env.ASAAS_API_KEY, "Content-Type": "application/json", "User-Agent": "Imobiturbo-Oficina/1.0" }, signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("oficina_setup_provider_" + response.status);
  return response.json();
}

function verifiedHook(hook, env) {
  const checks = { id: Boolean(hook.id), name: hook.name === OFICINA_WEBHOOK_NAME, url: hook.url === OFICINA_WEBHOOK_URL,
    enabled: hook.enabled === true, interrupted: hook.interrupted === false, apiVersion: Number(hook.apiVersion) === 3,
    sendType: hook.sendType === "SEQUENTIALLY", authToken: hook.authToken === env.OFICINA_ASAAS_WEBHOOK_TOKEN,
    events: Array.isArray(hook.events) && OFICINA_WEBHOOK_EVENTS.every(event => hook.events.includes(event)) };
  const invalidFields = Object.keys(checks).filter(key => !checks[key]);
  if (invalidFields.length) {
    const error = new Error("oficina_webhook_configuration_mismatch");
    error.details = { webhookId: hook.id, invalidFields, apiVersion: hook.apiVersion, authTokenReturned: typeof hook.authToken === "string" };
    throw error;
  }
  // Never serialize authToken/provider response, even to the authenticated admin.
  return { webhookId: hook.id, webhookUrl: hook.url, enabled: true, interrupted: false, authConfigured: true };
}

export async function ensureOficinaWebhook(env) {
  const matches = [];
  for (let offset = 0; ; offset += 100) {
    if (offset >= 10000) throw new Error("oficina_webhook_pagination_limit");
    const page = await api(env, "/webhooks?limit=100&offset=" + offset);
    if (!Array.isArray(page.data)) throw new Error("oficina_webhook_invalid_list");
    for (const hook of page.data) {
      if (hook.name === OFICINA_WEBHOOK_NAME || hook.url === OFICINA_WEBHOOK_URL) matches.push(hook);
    }
    if (page.hasMore !== true) break;
    if (!page.data.length) throw new Error("oficina_webhook_invalid_pagination");
  }
  if (matches.length > 1) throw new Error("oficina_webhook_ambiguous");
  if (matches.length === 1) {
    const hook = matches[0];
    if (hook.name !== OFICINA_WEBHOOK_NAME || hook.url !== OFICINA_WEBHOOK_URL) throw new Error("oficina_webhook_identity_mismatch");
    return verifiedHook(await api(env, "/webhooks/" + encodeURIComponent(hook.id)), env);
  }
  const hook = await api(env, "/webhooks", { method: "POST", body: JSON.stringify({
    name: OFICINA_WEBHOOK_NAME, url: OFICINA_WEBHOOK_URL, email: "natanpimentel@imobiturbo.com.br",
    enabled: true, interrupted: false, sendType: "SEQUENTIALLY", apiVersion: 3,
    authToken: env.OFICINA_ASAAS_WEBHOOK_TOKEN, events: OFICINA_WEBHOOK_EVENTS,
  }) });
  if (!hook.id) throw new Error("oficina_webhook_create_failed");
  return verifiedHook(await api(env, "/webhooks/" + encodeURIComponent(hook.id)), env);
}
