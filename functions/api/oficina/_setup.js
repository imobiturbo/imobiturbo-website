export const OFICINA_WEBHOOK_NAME = "Oficina Imobiturbo outubro2026";
export const OFICINA_WEBHOOK_URL = "https://imobiturbo-website.pages.dev/api/oficina/webhook";
const PREVIOUS_OFICINA_WEBHOOK_URL = "https://www.imobiturbo.com.br/api/oficina/webhook";
export const OFICINA_WEBHOOK_EVENTS = ["PAYMENT_CREATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_REFUNDED", "PAYMENT_DELETED", "PAYMENT_OVERDUE"];

async function api(env, path, options = {}) {
  const response = await fetch("https://api.asaas.com/v3" + path, {
    ...options, headers: { access_token: env.ASAAS_API_KEY, "Content-Type": "application/json", "User-Agent": "Imobiturbo-Oficina/1.0" }, signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("oficina_setup_provider_" + response.status);
  return response.json();
}

function verifiedHook(hook, env, { authWriteAcknowledged = false, shapeOnly = false, expectedUrl = OFICINA_WEBHOOK_URL } = {}) {
  const checks = { id: Boolean(hook.id), name: hook.name === OFICINA_WEBHOOK_NAME, url: hook.url === expectedUrl,
    enabled: hook.enabled === true, interrupted: hook.interrupted === false, apiVersion: Number(hook.apiVersion) === 3,
    sendType: hook.sendType === "SEQUENTIALLY",
    hasAuthToken: shapeOnly || hook.hasAuthToken === true || (hook.hasAuthToken == null && hook.authToken === env.OFICINA_ASAAS_WEBHOOK_TOKEN),
    authToken: shapeOnly || hook.authToken === env.OFICINA_ASAAS_WEBHOOK_TOKEN || (hook.authToken == null && authWriteAcknowledged),
    events: Array.isArray(hook.events) && OFICINA_WEBHOOK_EVENTS.every(event => hook.events.includes(event)) };
  const invalidFields = Object.keys(checks).filter(key => !checks[key]);
  if (invalidFields.length) {
    const error = new Error("oficina_webhook_configuration_mismatch");
    error.details = { webhookId: hook.id, invalidFields, apiVersion: hook.apiVersion, authTokenReturned: typeof hook.authToken === "string" };
    throw error;
  }
  // Never serialize authToken/provider response, even to the authenticated admin.
  return { webhookId: hook.id, webhookUrl: hook.url, enabled: true, interrupted: false, authConfigured: !shapeOnly,
    authVerification: hook.authToken == null ? "write_acknowledged" : "readback_match" };
}

export async function ensureOficinaWebhook(env) {
  const matches = [];
  for (let offset = 0; ; offset += 100) {
    if (offset >= 10000) throw new Error("oficina_webhook_pagination_limit");
    const page = await api(env, "/webhooks?limit=100&offset=" + offset);
    if (!Array.isArray(page.data)) throw new Error("oficina_webhook_invalid_list");
    for (const hook of page.data) {
      if (hook.name === OFICINA_WEBHOOK_NAME || [OFICINA_WEBHOOK_URL, PREVIOUS_OFICINA_WEBHOOK_URL].includes(hook.url)) matches.push(hook);
    }
    if (page.hasMore !== true) break;
    if (!page.data.length) throw new Error("oficina_webhook_invalid_pagination");
  }
  if (matches.length > 1) throw new Error("oficina_webhook_ambiguous");
  if (matches.length === 1) {
    const hook = matches[0];
    if (hook.name !== OFICINA_WEBHOOK_NAME || ![OFICINA_WEBHOOK_URL, PREVIOUS_OFICINA_WEBHOOK_URL].includes(hook.url)) throw new Error("oficina_webhook_identity_mismatch");
    const current = await api(env, "/webhooks/" + encodeURIComponent(hook.id));
    if (current.authToken == null || current.url === PREVIOUS_OFICINA_WEBHOOK_URL) {
      // The official GET schema omits authToken. Validate the nonsecret shape,
      // then acknowledge an auth-only write to this exact owned workshop hook.
      verifiedHook(current, env, { shapeOnly: true, expectedUrl: hook.url });
      const updated = await api(env, "/webhooks/" + encodeURIComponent(hook.id), { method: "PUT", body: JSON.stringify({ authToken: env.OFICINA_ASAAS_WEBHOOK_TOKEN, ...(current.url === PREVIOUS_OFICINA_WEBHOOK_URL ? { url: OFICINA_WEBHOOK_URL } : {}) }) });
      if (updated.id !== hook.id) throw new Error("oficina_webhook_identity_mismatch");
      return verifiedHook(await api(env, "/webhooks/" + encodeURIComponent(hook.id)), env, { authWriteAcknowledged: true });
    }
    return verifiedHook(current, env);
  }
  const hook = await api(env, "/webhooks", { method: "POST", body: JSON.stringify({
    name: OFICINA_WEBHOOK_NAME, url: OFICINA_WEBHOOK_URL, email: "natanpimentel@imobiturbo.com.br",
    enabled: true, interrupted: false, sendType: "SEQUENTIALLY", apiVersion: 3,
    authToken: env.OFICINA_ASAAS_WEBHOOK_TOKEN, events: OFICINA_WEBHOOK_EVENTS,
  }) });
  if (!hook.id) throw new Error("oficina_webhook_create_failed");
  return verifiedHook(await api(env, "/webhooks/" + encodeURIComponent(hook.id)), env, { authWriteAcknowledged: true });
}
