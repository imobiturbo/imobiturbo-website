import { OFICINA_REFERENCE, normalizeLead } from "./_shared.js";

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
  return { ...config, pipelineId: source.default_pipeline_id };
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

async function mutateOfficeFields(env, leadId, config, transition) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const scope = { id: "eq." + leadId, organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
      "source_metadata->>form_source_id": "eq." + env.OFICINA_CRM_SOURCE_ID };
    const rows = await rest(config, "crm_leads", { ...scope, select: "id,custom_fields,stage_id,pipeline_id" });
    if (rows.length !== 1) throw new Error("oficina_crm_lead_mismatch");
    const fields = rows[0].custom_fields || {};
    const change = transition(fields, rows[0]);
    if (!change.fields) return change.result;
    // OS form replays overwrite source_metadata without CAS. Keep all office
    // operational state in this reserved field; never write source_metadata.
    const updated = await rest(config, "crm_leads", { ...scope,
      ...(change.stageId ? { stage_id: "eq." + rows[0].stage_id, pipeline_id: "eq." + config.pipelineId } : {}),
      custom_fields: rows[0].custom_fields == null ? "is.null" : "eq." + JSON.stringify(rows[0].custom_fields),
    }, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ custom_fields: change.fields, ...(change.stageId ? { stage_id: change.stageId } : {}) }) });
    if (updated.length === 1) return change.result;
  }
  throw new Error("oficina_fields_cas_conflict");
}

// Reuse registration's allowlist and validation; never retain identity or tokens.
export function officeTracking(input) {
  const tracking = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return tracking;
  for (const [key, value] of Object.entries(input)) {
    const normalized = normalizeLead({ name: "Tracking", email: "tracking@example.invalid",
      phone: "+5511999999999", profile: "corretor", consent: true, tracking: { [key]: value } });
    const allowed = normalized?.tracking[key];
    if (typeof allowed === "string" && allowed.trim()) tracking[key] = allowed;
  }
  return tracking;
}

export function originTracking(row) {
  return officeTracking({ ...row.source_metadata?.meta_form?.utm,
    ...row.source_metadata?.meta_form?.answers, ...row.custom_fields, ...row.source_metadata });
}

export async function saveOfficeTracking(env, leadId, tracking, config) {
  const incoming = officeTracking(tracking);
  return mutateOfficeFields(env, leadId, config, (fields, current) => {
    if (current.pipeline_id !== config.pipelineId) throw new Error("oficina_crm_lead_stage_mismatch");
    const first = officeTracking(fields._oficina_tracking);
    // First non-empty snapshot wins as a whole: never mix campaigns on replay.
    if (Object.keys(first).length || !Object.keys(incoming).length) return { result: first };
    return { fields: { ...fields, _oficina_tracking: incoming }, result: incoming };
  });
}

export async function preserveOfficeTracking(env, phone, config) {
  const rows = await rest(config, "crm_leads", {
    select: "id,custom_fields,source_metadata,contact:contacts!inner(phone_number)",
    organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
    "source_metadata->>form_source_id": "eq." + env.OFICINA_CRM_SOURCE_ID,
    pipeline_id: "eq." + config.pipelineId,
    "contact.organization_id": "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
    "contact.phone_number": "eq." + phone, limit: "2",
  });
  if (rows.length > 1) throw new Error("oficina_phone_identity_ambiguous");
  if (rows.length === 1) await saveOfficeTracking(env, rows[0].id, originTracking(rows[0]), config);
}

export async function recordPayment(env, leadId, payment, state, config) {
  if (!config.pipelineId) throw new Error("oficina_crm_source_not_ready");
  const stages = await rest(config, "crm_stages", {
    select: "id,slug,organization_id,pipeline_id", organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
    pipeline_id: "eq." + config.pipelineId,
  });
  const bySlug = {};
  for (const slug of ["inscricao", "pago", "acompanhamento", "reembolso"]) {
    const matches = stages.filter(stage => stage.slug === slug && stage.organization_id === env.OFICINA_CRM_ORGANIZATION_ID &&
      stage.pipeline_id === config.pipelineId && typeof stage.id === "string" && stage.id);
    if (matches.length !== 1) throw new Error("oficina_crm_stages_not_ready");
    bySlug[slug] = matches[0].id;
  }
  if (new Set(Object.values(bySlug)).size !== 4) throw new Error("oficina_crm_stages_not_ready");
  return mutateOfficeFields(env, leadId, config, (fields, current) => {
    if (current.pipeline_id !== config.pipelineId || !Object.values(bySlug).includes(current.stage_id)) {
      throw new Error("oficina_crm_lead_stage_mismatch");
    }
    const payments = fields._oficina_payments || {};
    const previous = payments[payment.id];
    const ranks = { pendente: 0, pago: 1, cancelado: 2 };
    if (previous && ranks[previous.state] >= ranks[state]) return { result: { duplicate: true, state: previous.state } };
    const stageId = state === "cancelado" && current.stage_id !== bySlug.reembolso ? bySlug.reembolso :
      state === "pago" && current.stage_id === bySlug.inscricao ? bySlug.pago : null;
    return { stageId, fields: { ...fields, oficina_payment_status: state, _oficina_payments: { ...payments, [payment.id]: {
      ...previous, state, providerStatus: payment.status, value: 47, billingType: payment.billingType,
      paymentLink: payment.paymentLink,
      ...(typeof payment.netValue === "number" && Number.isFinite(payment.netValue) && payment.netValue >= 0 && payment.netValue <= payment.value ? { netValue: payment.netValue } : {}),
      ...(state === "pago" ? { purchaseEventTime: previous?.purchaseEventTime || Math.floor(Date.now() / 1000) } : {}),
      updatedAt: new Date().toISOString(),
    } } }, result: { duplicate: false, state } };
  });
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
  return mutateOfficeFields(env, leadId, config, fields => {
    const previous = fields._oficina_payments?.[paymentId];
    if (!previous) throw new Error("oficina_crm_payment_missing");
    return { fields: { ...fields, _oficina_payments: { ...fields._oficina_payments, [paymentId]: {
      ...previous, hubPurchaseSent: Boolean(previous.hubPurchaseSent || delivery.hub),
      metaPurchaseSent: Boolean(previous.metaPurchaseSent || delivery.meta),
    } }, ...(previous.state === "pago" ? {
      oficina_room_e1: "https://meet.google.com/tvd-sxie-voj",
      oficina_room_e2: "https://meet.google.com/oxg-oqro-upx",
    } : {}) }, result: true };
  });
}

export async function officePhoneByVerifiedEmail(env, email, config) {
  // Join starts at office-scoped leads, never a global email/contact lookup.
  // email_normalized is the canonical contact key used by OS ingestion.
  const rows = await rest(config, "crm_leads", {
    select: "id,contact:contacts!inner(id,email_normalized,phone_number)",
    organization_id: "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
    "source_metadata->>form_source_id": "eq." + env.OFICINA_CRM_SOURCE_ID,
    "contact.organization_id": "eq." + env.OFICINA_CRM_ORGANIZATION_ID,
    "contact.email_normalized": "eq." + email,
    pipeline_id: "eq." + config.pipelineId,
    limit: "2",
  });
  if (rows.length !== 1 || !rows[0].contact || rows[0].contact.email_normalized !== email) throw new Error("oficina_email_identity_ambiguous");
  return rows[0].contact.phone_number;
}

export async function updateWelcomeState(env, leadId, paymentId, config, transition) {
  return mutateOfficeFields(env, leadId, config, fields => {
    const payment = fields._oficina_payments?.[paymentId];
    if (!payment) throw new Error("oficina_crm_payment_missing");
    const change = transition(payment);
    if (!change.patch) return { result: change.result };
    return { fields: { ...fields, _oficina_payments: { ...fields._oficina_payments,
      [paymentId]: { ...payment, ...change.patch },
    } }, result: change.result };
  });
}
