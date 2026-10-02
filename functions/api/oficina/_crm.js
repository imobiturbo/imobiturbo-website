import { OFICINA_REFERENCE } from "./_shared.js";

function settings(env) {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OFICINA_CRM_ORGANIZATION_ID", "OFICINA_CRM_SOURCE_ID", "OFICINA_CRM_FORM_URL", "OFICINA_CRM_FORM_TOKEN"];
  if (required.some(key => !env[key])) throw new Error("oficina_crm_not_configured");
  const supabase = new URL(env.SUPABASE_URL);
  const form = new URL(env.OFICINA_CRM_FORM_URL);
  if (supabase.protocol !== "https:" || form.protocol !== "https:" || supabase.username || form.username ||
      !/^\/api\/v1\/public\/form-sources\/[^/]+$/.test(form.pathname) || form.search || form.hash) throw new Error("oficina_crm_not_configured");
  return { base: supabase.origin + "/rest/v1", form: form.href,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" } };
}

async function rest(config, table, params, options = {}) {
  const url = new URL(config.base + "/" + table);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { ...options, headers: { ...config.headers, ...options.headers }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error("oficina_crm_unavailable");
  return response.json();
}

export async function sourceConfig(env) {
  const config = settings(env);
  const rows = await rest(config, "webhook_sources", {
    select: "id,organization_id,path_token,is_active,status,config,kind,default_pipeline_id",
    id: "eq." + env.OFICINA_CRM_SOURCE_ID, organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
  });
  const source = rows[0];
  // Marker is an explicit operational gate: root must audit/disable outgoing
  // automations for the dedicated source/pipeline before setting it. It does
  // not suppress lead.created in OS, nor claims to do so.
  if (rows.length !== 1 || !source.is_active || source.status !== "active" ||
      source.kind !== "lead_capture" || !source.default_pipeline_id ||
      source.config?.oficina_no_notifications_confirmed !== true || source.config?.require_auth !== true ||
      decodeURIComponent(new URL(config.form).pathname.split("/").at(-1)) !== source.path_token) {
    throw new Error("oficina_crm_source_not_ready");
  }
  return config;
}

export async function captureLead(env, lead, externalId, config = null) {
  config ??= await sourceConfig(env);
  const response = await fetch(config.form, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.OFICINA_CRM_FORM_TOKEN },
    body: JSON.stringify({ name: lead.name, email: lead.email, phone: lead.phone,
      ...(lead.profile ? { oficina_profile: lead.profile } : {}),
      ...(lead.consent === true ? { oficina_consent: true } : {}),
      oficina_product: OFICINA_REFERENCE, ...lead.tracking, external_id: externalId }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("oficina_crm_capture_failed");
  const data = await response.json();
  if (typeof data.data?.lead_id !== "string" || !/^[0-9a-f-]{36}$/i.test(data.data.lead_id)) throw new Error("oficina_crm_capture_failed");
  return data.data.lead_id;
}

export async function leadExternalId(phone) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(OFICINA_REFERENCE + ":" + phone));
  return "oficina:lead:" + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function recordPayment(env, leadId, payment, state, config) {
  // CAS on the whole JSON snapshot preserves unrelated keys and simultaneous
  // payment updates. State never regresses due to a late pending snapshot.
  for (let attempt = 0; attempt < 4; attempt++) {
    const scope = { id: "eq." + leadId, organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
      "source_metadata->>form_source_id": "eq." + env.OFICINA_CRM_SOURCE_ID };
    const rows = await rest(config, "crm_leads", { ...scope, select: "id,source_metadata,custom_fields" });
    if (rows.length !== 1) throw new Error("oficina_crm_lead_mismatch");
    const metadata = rows[0].source_metadata || {};
    const payments = metadata.oficina_payments || {};
    const previous = payments[payment.id];
    const ranks = { pendente: 0, pago: 1, cancelado: 2 };
    if (previous && ranks[previous.state] >= ranks[state]) return { duplicate: true, state: previous.state };
    const next = { ...metadata, oficina_payments: { ...payments, [payment.id]: {
      ...previous, state, providerStatus: payment.status, value: 47, billingType: payment.billingType,
      paymentLink: payment.paymentLink,
      ...(state === "pago" ? { purchaseEventTime: previous?.purchaseEventTime || Math.floor(Date.now() / 1000) } : {}),
      updatedAt: new Date().toISOString(),
    } } };
    const updated = await rest(config, "crm_leads", { ...scope,
      source_metadata: rows[0].source_metadata == null ? "is.null" : "eq." + JSON.stringify(rows[0].source_metadata),
      custom_fields: rows[0].custom_fields == null ? "is.null" : "eq." + JSON.stringify(rows[0].custom_fields),
    }, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ source_metadata: next, custom_fields: { ...rows[0].custom_fields, oficina_payment_status: state } }),
    });
    if (updated.length === 1) return { duplicate: false, state };
  }
  throw new Error("oficina_crm_update_conflict");
}

export async function paymentContext(env, leadId, config) {
  const rows = await rest(config, "crm_leads", {
    select: "id,contact_id,custom_fields,source_metadata", id: "eq." + leadId,
    organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
    "source_metadata->>form_source_id": "eq." + env.OFICINA_CRM_SOURCE_ID,
  });
  if (rows.length !== 1) throw new Error("oficina_crm_lead_mismatch");
  let contact = {};
  if (rows[0].contact_id) {
    const contacts = await rest(config, "contacts", { select: "name,email,phone_number", id: "eq." + rows[0].contact_id, organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID });
    if (contacts.length !== 1) throw new Error("oficina_crm_contact_mismatch");
    contact = contacts[0];
  }
  return { ...rows[0], contact };
}

export async function savePaymentDelivery(env, leadId, paymentId, delivery, config) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await paymentContext(env, leadId, config);
    const metadata = row.source_metadata || {};
    const previous = metadata.oficina_payments?.[paymentId];
    if (!previous) throw new Error("oficina_crm_payment_missing");
    const next = { ...metadata, oficina_payments: { ...metadata.oficina_payments, [paymentId]: {
      ...previous, hubPurchaseSent: Boolean(previous.hubPurchaseSent || delivery.hub),
      metaPurchaseSent: Boolean(previous.metaPurchaseSent || delivery.meta),
    } } };
    const customFields = row.custom_fields || {};
    const paid = previous.state === "pago";
    const updated = await rest(config, "crm_leads", {
      id: "eq." + leadId, organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
      "source_metadata->>form_source_id": "eq." + env.OFICINA_CRM_SOURCE_ID,
      source_metadata: row.source_metadata == null ? "is.null" : "eq." + JSON.stringify(row.source_metadata),
      custom_fields: row.custom_fields == null ? "is.null" : "eq." + JSON.stringify(row.custom_fields),
    }, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ source_metadata: next,
      ...(paid ? { custom_fields: { ...customFields,
        oficina_room_e1: "https://meet.google.com/tvd-sxie-voj",
        oficina_room_e2: "https://meet.google.com/oxg-oqro-upx",
      } } : {}),
    }) });
    if (updated.length === 1) return;
  }
  throw new Error("oficina_crm_delivery_conflict");
}
