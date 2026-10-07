import { communityConfig, communityDb, assertCommunityOrder, CommunityError, UUID } from './_community-orders.js';

const SOURCE_TOKEN = 'imt_lp_oficial_30e9db2c23e85e4915f76d8407f0d3f2';
const SOURCE_URL = `https://os.imobiturbo.com.br/api/v1/public/form-sources/${SOURCE_TOKEN}`;
const LABELS = ['checkout:pendente', 'checkout:abandonado', 'checkout:pago'];
const META = 'community_checkout_v1';
const email = value => String(value || '').trim().toLowerCase();
const phone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};
const fail = code => new CommunityError(code, 503);
function timeout(config, maximum) {
  const remaining = (config.crmDeadline || Date.now() + 20000) - Date.now();
  if (remaining <= 0) throw fail('community_crm_deadline');
  return AbortSignal.timeout(Math.min(maximum, remaining));
}
async function contactKey(buyer) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${email(buyer.email)}:${phone(buyer.phone)}`));
  return 'community-contact:' + [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}
function configForCrm(env) { return communityConfig(env); }
async function store(config, table, filters, patch) {
  const query = new URLSearchParams({ organization_id: `eq.${config.organizationId}`, ...filters });
  const response = await fetch(`${config.db}/rest/v1/${table}?${query}`, {
    method: patch ? 'PATCH' : 'GET', headers: { apikey: config.key, Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(patch ? { body: JSON.stringify(patch) } : {}), signal: timeout(config, 5000),
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(rows)) throw fail('community_crm_storage_pending');
  return rows;
}
async function one(config, table, id) {
  if (!UUID.test(id || '')) throw fail('community_crm_identity_conflict');
  const rows = await store(config, table, { id: `eq.${id}`, limit: '2' });
  if (rows.length !== 1) throw fail('community_crm_identity_conflict');
  return rows[0];
}
async function ingest(config, payload) {
  const response = await fetch(SOURCE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: timeout(config, 8000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false || data?.success === false || !UUID.test(data?.data?.lead_id || ''))
    throw fail('community_crm_capture_pending');
  return data.data.lead_id;
}
function lifecycleTags(current, status) {
  // A previously verified buyer remains a buyer even when opening a new cart.
  const next = current.includes('checkout:pago') ? 'paid' : status;
  return [...new Set([...current.filter(t => !LABELS.includes(t)), 'checkout:comunidade',
    next === 'paid' ? 'checkout:pago' : next === 'abandoned' ? 'checkout:abandonado' : 'checkout:pendente'])];
}
async function addressBelongsToContact(config, table, value, contactId) {
  const rows = await store(config, table, { normalized_value: `eq.${value}`, removed_at: 'is.null', select: 'contact_id', limit: '2' });
  const owners = new Set(rows.map(row => row.contact_id));
  return owners.size === 1 && owners.has(contactId);
}
async function assertBuyerContact(config, contact, buyer) {
  if (contact.is_anonymized || contact.is_merged_into) throw fail('community_crm_buyer_conflict');
  const emailMatches = email(contact.email) === email(buyer.email) ||
    await addressBelongsToContact(config, 'contact_emails', email(buyer.email), contact.id);
  const phoneMatches = phone(contact.phone_number) === phone(buyer.phone) ||
    await addressBelongsToContact(config, 'contact_phones', `+${phone(buyer.phone)}`, contact.id);
  if (!emailMatches || !phoneMatches) throw fail('community_crm_buyer_conflict');
}
async function annotate(config, leadId, buyer, observation) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const lead = await one(config, 'crm_leads', leadId);
    const contact = await one(config, 'contacts', lead.contact_id);
    await assertBuyerContact(config, contact, buyer);
    const metadata = lead.source_metadata || {}, previous = metadata[META] || {};
    const orders = { ...(previous.orders || {}) };
    if (observation.orderId) {
      const old = orders[observation.orderId];
      orders[observation.orderId] = { ...observation, status: old?.status === 'paid' ? 'paid' : observation.status };
    }
    const status = Object.values(orders).some(o => o.status === 'paid') ? 'paid' : observation.status;
    const summary = { ...previous, product: 'comunidade-imobiturbo', orders, status,
      capture_created_at: previous.capture_created_at || new Date().toISOString() };
    const tags = lifecycleTags(lead.tags || [], status);
    if (JSON.stringify(previous) !== JSON.stringify(summary) || JSON.stringify(lead.tags || []) !== JSON.stringify(tags)) {
      const changed = await store(config, 'crm_leads', { id: `eq.${leadId}`, updated_at: `eq.${lead.updated_at}` },
        { source_metadata: { ...metadata, [META]: summary }, tags });
      if (!changed.length) continue; // Another writer changed the lead: reread, retain its stage/tags.
    }
    for (let i = 0; i < 3; i++) {
      const current = i ? await one(config, 'contacts', contact.id) : contact;
      await assertBuyerContact(config, current, buyer);
      const contactTags = lifecycleTags(current.tags || [], status);
      if (JSON.stringify(contactTags) === JSON.stringify(current.tags || [])) return { lead_id: leadId, contact_id: contact.id, status };
      const changed = await store(config, 'contacts', { id: `eq.${contact.id}`, updated_at: `eq.${current.updated_at}` }, { tags: contactTags });
      if (changed.length) return { lead_id: leadId, contact_id: contact.id, status };
    }
    throw fail('community_crm_contact_retry');
  }
  throw fail('community_crm_concurrent_retry');
}
export async function captureCommunityLead(env, payload) {
  const config = { ...configForCrm(env), crmDeadline: Date.now() + 20000 };
  const buyer = { name: String(payload.name || '').trim(), email: email(payload.email), phone: phone(payload.phone) };
  if (!buyer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email) || !/^\d{12,15}$/.test(buyer.phone))
    throw new CommunityError('community_invalid_buyer', 400);
  // Stable contact identity also deduplicates retries when the browser loses its receipt.
  const external = await contactKey(buyer);
  const leadId = await ingest(config, { ...buyer, plan: ['anual','trimestral','mensal'].includes(payload.plan) ? payload.plan : 'anual',
    source: 'vagas_modal', external_id: external,
    ...Object.fromEntries(Object.entries(payload).filter(([k,v]) => /^(utm_(source|medium|campaign|content|term)|fbclid|fbc|fbp)$/.test(k) && typeof v === 'string').map(([k,v]) => [k,v.slice(0,500)])) });
  return annotate(config, leadId, buyer, { status: 'pending' });
}
async function paidObservation(config, order) {
  const subscriptions = await store(config, 'cobranca_assinaturas', { checkout_order_id: `eq.${order.id}`, environment: `eq.${config.environment}`, select: 'id' });
  if (!subscriptions.length) return false;
  const activations = await store(config, 'cobranca_competencias', { subscription_id: `in.(${subscriptions.map(s=>s.id).join(',')})`, environment: `eq.${config.environment}`, select: 'id' });
  if (!activations.length) return false;
  const payments = await store(config, 'cobranca_pagamentos', { activation_id: `in.(${activations.map(a=>a.id).join(',')})`, provider: 'eq.asaas', environment: `eq.${config.environment}`, status: 'in.(CONFIRMED,RECEIVED)', select: 'status,provider_payment_id' });
  return payments.length > 0;
}
export async function syncCommunityCrm(config, order, now = Date.now()) {
  config = { ...config, crmDeadline: Math.min(config.crmDeadline || Infinity, Date.now() + 20000) };
  assertCommunityOrder(config, order);
  const paid = await paidObservation(config, order);
  const status = paid ? 'paid' : now - Date.parse(order.created_at) >= 3600000 ? 'abandoned' : 'pending';
  const mapped = await store(config, 'crm_leads', { [`source_metadata->${META}->orders->${order.id}`]: 'not.is.null', select: 'id', limit: '2' });
  if (mapped.length > 1) throw fail('community_crm_multiple_leads');
  const leadId = mapped[0]?.id || await ingest(config, { name: order.buyer_name, email: order.buyer_email, phone: order.buyer_phone,
    plan: { 1: 'mensal', 3: 'trimestral', 12: 'anual' }[order.sold_snapshot.duration_months], source: 'vagas_modal', external_id: await contactKey({ email: order.buyer_email, phone: order.buyer_phone }) });
  return annotate(config, leadId, { email: order.buyer_email, phone: order.buyer_phone },
    { orderId: order.id, status, created_at: order.created_at, offer: order.sold_snapshot.offer_key });
}
export function scheduleCommunityCrm(context, config, order) {
  const work = syncCommunityCrm(config, order).catch(() => console.warn('community_crm_reconciliation_pending'));
  if (context.waitUntil) context.waitUntil(work);
  return work; // CRM failures never repeat or fail a financial creation.
}
function cursorFilter(query, cursor) {
  if (!cursor) return;
  if (!UUID.test(cursor.id || '') || !/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(cursor.created_at || '') || !Number.isFinite(Date.parse(cursor.created_at)))
    throw new CommunityError('community_crm_cursor_invalid', 400);
  query.set('or', `(created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id}))`);
}
const position = row => ({ created_at: row.created_at, id: row.id });
export async function reconcileCommunityCrm(env, cursor = null, now = () => Date.now()) {
  const started = now(), wallStarted = Date.now(), config = { ...configForCrm(env), crmDeadline: wallStarted + 45000 };
  if (cursor && (typeof cursor !== 'object' || Array.isArray(cursor) || Object.keys(cursor).some(k=>!['orders','leads'].includes(k))))
    throw new CommunityError('community_crm_cursor_invalid', 400);
  const query = new URLSearchParams({ organization_id: `eq.${config.organizationId}`, environment: `eq.${config.environment}`,
    provider: 'eq.asaas', order: 'created_at.asc,id.asc', limit: '3' });
  cursorFilter(query, cursor?.orders);
  const orders = await communityDb(config, `cobranca_pedidos?${query}`);
  if (!Array.isArray(orders)) throw fail('community_crm_storage_pending');
  const summary = { scanned: 0, completed: 0, pending: 0, next_cursor: { orders: cursor?.orders || null, leads: cursor?.leads || null } };
  let processed = 0;
  // Leave a separate window for contact-only carts and return before the cron's 55s timeout.
  for (const order of orders.slice(0,2)) {
    if (now() >= started + 30000) break;
    summary.scanned++; processed++;
    try { await syncCommunityCrm({ ...config, crmDeadline: wallStarted + 32000 }, order); summary.completed++; }
    catch { summary.pending++; }
    summary.next_cursor.orders = position(order); // Advance even after failure; the next cycle retries it.
  }
  if (processed === orders.length) summary.next_cursor.orders = null;
  const leadQuery = new URLSearchParams({
    [`source_metadata->${META}->>status`]: 'eq.pending',
    [`source_metadata->${META}->>capture_created_at`]: `lte.${new Date(Date.now()-3600000).toISOString()}`,
    [`source_metadata->${META}->orders`]: 'eq.{}', order: 'created_at.asc,id.asc', limit: '3' });
  cursorFilter(leadQuery, cursor?.leads);
  let stale;
  try { stale = await store(config, 'crm_leads', Object.fromEntries(leadQuery)); }
  catch { summary.pending++; return summary; }
  let leadProcessed = 0;
  for (const lead of stale.slice(0,2)) {
    if (now() >= started + 43000) break;
    summary.scanned++; leadProcessed++;
    try {
      const contact = await one(config, 'contacts', lead.contact_id);
      await annotate({ ...config, crmDeadline: Math.min(wallStarted+45000, Date.now()+5000) }, lead.id,
        { email: contact.email, phone: contact.phone_number }, { status: 'abandoned' });
      summary.completed++;
    } catch { summary.pending++; }
    summary.next_cursor.leads = position(lead);
  }
  if (leadProcessed === stale.length) summary.next_cursor.leads = null;
  return summary;
}
