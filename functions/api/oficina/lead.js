import { json, normalizeLead } from "./_shared.js";
import { ensureCheckout } from "./_checkout.js";
import { captureLead, leadExternalId } from "./_crm.js";

export async function onRequestPost({ request, env = {} }) {
  if (env.OFICINA_SETUP_READY !== "true") return json({ ok: false, error: "oficina_crm_unavailable" }, 503);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ ok: false, error: "json_required" }, 415);
  let input;
  try {
    const body = await request.text();
    if (body.length > 12000) return json({ ok: false, error: "payload_too_large" }, 413);
    input = JSON.parse(body);
  } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const lead = normalizeLead(input);
  if (!lead) return json({ ok: false, error: "invalid_lead" }, 422);
  try {
    await captureLead(env, lead, await leadExternalId(lead.phone));
    return json(await ensureCheckout(env));
  } catch {
    return json({ ok: false, error: "oficina_crm_unavailable" }, 503);
  }
}
