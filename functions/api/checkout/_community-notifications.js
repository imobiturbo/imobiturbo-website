import { UUID, COMMERCIAL_ORGANIZATION_ID, CommunityError } from './_community-orders.js';
import { formatPostPurchaseEmail, formatPostPurchaseWhatsApp, cleanPhoneNumber } from './_notifications.js';

export const normalizeEmail = value => String(value || '').trim().toLowerCase();
export function notificationConfig(env) {
  const organizationId = env.COMMUNITY_ORGANIZATION_ID || COMMERCIAL_ORGANIZATION_ID;
  const environment = env.COMMUNITY_ENVIRONMENT || env.ASAAS_ENVIRONMENT;
  if (!UUID.test(organizationId) || !['production','sandbox'].includes(environment) ||
      !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_URL || new URL(env.SUPABASE_URL).protocol !== 'https:')
    throw new CommunityError('community_notification_configuration', 503);
  return { organizationId, environment, db: new URL(env.SUPABASE_URL).origin, key: env.SUPABASE_SERVICE_ROLE_KEY };
}
export function validNotificationRequest(body, config) {
  return body && Object.keys(body).sort().join(',') === 'activation_id,commercial_organization_id,contract_version,environment' &&
    body.contract_version === 1 && UUID.test(body.activation_id || '') && body.environment === config.environment &&
    body.commercial_organization_id === config.organizationId;
}
export function notificationStore(config, fetchFn = fetch) {
  return async (table, filters = {}, patch) => {
    const query = new URLSearchParams({ organization_id: `eq.${config.organizationId}`, ...filters });
    const response = await fetchFn(`${config.db}/rest/v1/${table}?${query}`, {
      method: patch ? 'PATCH' : 'GET', headers: { apikey: config.key, Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json', Prefer: 'return=representation' },
      ...(patch ? { body: JSON.stringify(patch) } : {}), signal: AbortSignal.timeout(7000),
    });
    const rows = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(rows)) throw new CommunityError('community_notification_storage', 500);
    return rows;
  };
}
async function one(store, table, filters) {
  const rows = await store(table, { ...filters, limit: '2' });
  if (rows.length !== 1) throw new CommunityError('community_notification_binding', 409);
  return rows[0];
}
export async function activationContext(store, config, activationId) {
  const activation = await one(store, 'cobranca_competencias', { id: `eq.${activationId}`, environment: `eq.${config.environment}` });
  const subscription = await one(store, 'cobranca_assinaturas', { id: `eq.${activation.subscription_id}`, environment: `eq.${config.environment}` });
  if (subscription.sold_snapshot?.contract_version !== 1 || subscription.sold_snapshot?.resource_profile?.unlimited !== true) throw new CommunityError("community_notification_binding", 409);
  const order = await one(store, 'cobranca_pedidos', { id: `eq.${subscription.checkout_order_id}`, environment: `eq.${config.environment}` });
  const products = subscription.sold_snapshot?.products;
  if (order.buyer_email !== subscription.email || !Array.isArray(products) || !products.length ||
      new Set(products).size !== products.length || products.some(p => !['os','club'].includes(p)) ||
      ![1,3,12].includes(subscription.sold_snapshot.duration_months)) throw new CommunityError('community_notification_binding', 409);
  const deliveries = await store('cobranca_entregas', { activation_id: `eq.${activationId}` });
  const productsReady = products.every(product => deliveries.some(d => d.product === product && d.status === 'completed' && d.completed_at));
  const reviews = await store('cobranca_revisoes_financeiras', { select:'id,activation_id', checkout_order_id:`eq.${subscription.checkout_order_id}`,
    provider:'eq.asaas', environment:`eq.${config.environment}`, state:'eq.pending',
    or:`(activation_id.eq.${activationId},activation_id.is.null)`, limit:'1' });
  const financialReviewPending = reviews.some(review => review.activation_id === activationId || review.activation_id === null);
  const ready = productsReady && !financialReviewPending;
  let enrollment = null;
  if (products.includes('club') && subscription.club_enrollment_id) {
    enrollment = await one(store, 'cobranca_club_matriculas', { id: `eq.${subscription.club_enrollment_id}`, environment: `eq.${config.environment}` });
    if (enrollment.email !== subscription.email || enrollment.club_organization_id !== subscription.club_organization_id)
      throw new CommunityError('community_notification_binding', 409);
    enrollment.protected_content_allowed = Boolean(enrollment.protected_release_at && Date.parse(enrollment.protected_release_at) <= Date.now());
  }
  return { ready, productsReady, financialReviewPending, subscription, order, message: { name: order.buyer_name, email: subscription.email, phone: order.buyer_phone,
    plan: {1:'mensal',3:'trimestral',12:'anual'}[subscription.sold_snapshot.duration_months],
    community: { products, duration_months: subscription.sold_snapshot.duration_months, period_end: activation.period_end, club_enrollment: enrollment } } };
}
export const emailReference = (config, activation) => `community:v1:${config.environment}:${config.organizationId}:${activation}:email`;

export function notificationReceiptRpc(config, fetchFn = fetch) {
  return async receipt => {
    const response = await fetchFn(`${config.db}/rest/v1/rpc/record_community_notification_receipt`, {
      method: 'POST', headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_receipt: receipt }), signal: AbortSignal.timeout(7000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.contract_version !== 1 || typeof result.matched !== 'boolean')
      throw new CommunityError('community_receipt_storage', 500);
    return result.matched;
  };
}
const PRE_EFFECT_ERRORS = new Set(['community_email_configuration', 'community_email_invalid',
  'community_whatsapp_configuration', 'community_phone_invalid', 'community_channel_invalid', 'community_message_contract_invalid']);
function externalFailure(n) {
  return n.status === 'failed' && (n.external_id || n.accepted_at || n.failure_proof || !PRE_EFFECT_ERRORS.has(n.error_code));
}
export async function sendCommunityChannel(channel, message, env, reference, fetchFn = fetch) {
  let url, headers, payload;
  if (channel === 'email') {
    const token = String(env.ZEPTOMAIL_API_KEY || env.ZEPTOMAIL_TOKEN || '').trim().replace(/^(?:Zoho-enczapikey\s*)+/i, '').trim();
    const from = env.ZEPTOMAIL_FROM_EMAIL || env.ZEPTOMAIL_FROM_ADDRESS;
    if (!token || !from) throw new CommunityError('community_email_configuration');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) throw new CommunityError('community_email_invalid');
    const email = formatPostPurchaseEmail(message);
    url = env.ZEPTOMAIL_API_URL || 'https://cpaas.zoho.com/v1.1/email';
    headers = { Authorization: `Zoho-enczapikey ${token}`, 'Content-Type': 'application/json' };
    payload = { from: { address: from, name: env.ZEPTOMAIL_FROM_NAME || 'Imobiturbo Comunidade' },
      to: [{ email_address: { address: message.email, name: message.name } }], subject: email.subject,
      htmlbody: email.html, textbody: email.text, client_reference: reference, track_opens: true, track_clicks: true };
  } else if (channel === 'whatsapp') {
    if (!env.META_WHATSAPP_TOKEN || !env.META_PHONE_NUMBER_ID) throw new CommunityError('community_whatsapp_configuration');
    if (!/^55\d{10,11}$/.test(cleanPhoneNumber(message.phone))) throw new CommunityError('community_phone_invalid');
    url = `https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v22.0'}/${env.META_PHONE_NUMBER_ID}/messages`;
    headers = { Authorization: `Bearer ${env.META_WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' };
    payload = formatPostPurchaseWhatsApp(message);
  } else throw new CommunityError('community_channel_invalid');
  // Errors after POST begins are uncertain; never infer absence from a timeout or HTTP error.
  try {
    const response = await fetchFn(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(7000) });
    const data = await response.json();
    const id = channel === 'email' ? data.request_id : data.messages?.[0]?.id;
    const recipient = channel === 'whatsapp' ? data.contacts?.[0]?.wa_id : null;
    if (recipient && cleanPhoneNumber(recipient) !== cleanPhoneNumber(message.phone)) return { status: 'uncertain', error_code: 'community_provider_recipient_conflict' };
    if (!response.ok || typeof id !== 'string' || !id) return { status: 'uncertain', error_code: 'community_provider_outcome_unknown' };
    return { status: 'processing', external_id: id, accepted_at: new Date().toISOString() };
  } catch (_) { return { status: 'uncertain', error_code: 'community_provider_outcome_unknown' }; }
}
export async function processCommunityNotifications({ config, activationId, env, store = notificationStore(config), send = sendCommunityChannel }) {
  const context = await activationContext(store, config, activationId);
  const filter = { activation_id: `eq.${activationId}` };
  const channels = await store('cobranca_notificacoes', filter);
  if (!context.ready) return channels.map(n => ({ ...resultChannel(n),
    ...(!n.error_code && n.status === 'pending' ? { error_code: context.financialReviewPending ? 'community_financial_review_pending' : 'community_products_pending' } : {}) }));
  const pending = await store('cobranca_pending_notifications', { ...filter, environment: `eq.${config.environment}` });
  const output = [];
  for (const item of channels) {
    if (externalFailure(item) || item.failure_proof || item.status === 'completed' || (item.status === 'processing' && Date.parse(item.lease_until) > Date.now())) {
      output.push(resultChannel(item)); continue;
    }
    // Provider absence cannot currently be proved via Meta GET or CPaaS logs without OAuth.
    // Reconcile against authenticated persisted receipts first; hold uncertain work, never resend blindly.
    if (item.status === 'uncertain' || item.status === 'processing' || item.accepted_at || item.external_id) {
      const current = await one(store, 'cobranca_notificacoes', { id: `eq.${item.id}` });
      if (!externalFailure(current) && !current.failure_proof && current.status !== 'completed' &&
          current.status === item.status && current.attempts === item.attempts && current.claim_token === item.claim_token &&
          current.external_id === item.external_id && current.accepted_at === item.accepted_at) {
        const rows = await store('cobranca_notificacoes', { id: `eq.${current.id}`, status: `eq.${current.status}`, updated_at: `eq.${current.updated_at}` },
          { status: 'uncertain', error_code: current.error_code || 'community_receipt_reconciliation_required', lease_until: null, next_attempt_at: new Date(Date.now()+60000).toISOString(), updated_at: new Date().toISOString() });
        output.push(resultChannel(rows[0] || current));
      } else output.push(resultChannel(current));
      continue;
    }
    if (!['pending','failed'].includes(item.status) || !pending.some(n => n.id === item.id)) { output.push(resultChannel(item)); continue; }
    const token = crypto.randomUUID(), now = new Date().toISOString();
    const claimed = await store('cobranca_notificacoes', { id: `eq.${item.id}`, status: `eq.${item.status}`, updated_at: `eq.${item.updated_at}`,
      next_attempt_at: `lte.${now}`, external_id: 'is.null', accepted_at: 'is.null', failure_proof: 'is.null' }, { status: 'processing', claim_token: token, lease_until: new Date(Date.now()+120000).toISOString(),
      attempts: item.attempts + 1, updated_at: now });
    if (!claimed.length) { output.push(resultChannel(await one(store, 'cobranca_notificacoes', { id: `eq.${item.id}` }))); continue; }
    let outcome;
    try { outcome = await send(item.channel, context.message, env, emailReference(config, activationId)); }
    catch (error) { outcome = error instanceof CommunityError && PRE_EFFECT_ERRORS.has(error.code) ? { status: 'failed', error_code: error.code } : { status: 'uncertain', error_code: 'community_provider_outcome_unknown' }; }
    const finished = await store('cobranca_notificacoes', { id: `eq.${item.id}`, claim_token: `eq.${token}`, status: 'eq.processing',
      lease_until: `gt.${new Date().toISOString()}` }, { ...outcome, next_attempt_at: new Date(Date.now()+60000).toISOString(), updated_at: new Date().toISOString(),
      ...(outcome.status === 'processing' ? {} : { lease_until: null }) });
    output.push(resultChannel(finished[0] || await one(store, 'cobranca_notificacoes', { id: `eq.${item.id}` })));
  }
  return output;
}
function resultChannel(n) { return { channel: n.channel, status: n.status, ...(n.external_id ? { provider_message_id: n.external_id } : {}), ...(n.error_code ? { error_code: n.error_code } : {}) }; }
