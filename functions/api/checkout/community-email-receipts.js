import { UUID, CommunityError } from './_community-orders.js';
import { notificationConfig, notificationStore, activationContext, emailReference, normalizeEmail, notificationReceiptRpc } from './_community-notifications.js';

function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i=0; i<Math.max(a.length,b.length); i++) diff |= (a.charCodeAt(i)||0) ^ (b.charCodeAt(i)||0);
  return diff === 0;
}
export async function authenticatedEmailData(request, env, now = Date.now()) {
  const raw = await request.text();
  if (raw.length > 262144) throw new CommunityError('receipt_too_large', 413);
  const form = request.headers.get('content-type')?.split(';')[0] === 'application/x-www-form-urlencoded';
  let data = raw;
  if (form) {
    const params = new URLSearchParams(raw);
    if (params.getAll('data').length !== 1 || [...params.keys()].some(k => k !== 'data')) throw new CommunityError('receipt_invalid',400);
    data = params.get('data'); // exact decoded UTF-8; never reserialize JSON for the MAC
  }
  if (env.COMMUNITY_EMAIL_WEBHOOK_AUTH_MODE === 'header') {
    if (!env.COMMUNITY_EMAIL_WEBHOOK_TOKEN) throw new CommunityError('receipt_auth_configuration',503);
    if (!equal(request.headers.get('X-Imobiturbo-Webhook-Token'), env.COMMUNITY_EMAIL_WEBHOOK_TOKEN)) throw new CommunityError('receipt_unauthorized',401);
  } else if (env.COMMUNITY_EMAIL_WEBHOOK_AUTH_MODE === 'hmac') {
    if (!env.COMMUNITY_EMAIL_AGENT_AUTH_KEY || env.COMMUNITY_EMAIL_AGENT_AUTH_KEY_CONFIRMED !== 'true') throw new CommunityError('receipt_auth_configuration',503);
    if (!form) throw new CommunityError('receipt_unauthorized',401);
    const parts = (request.headers.get('producer-signature') || '').split(';').map(p => p.trim().split(/=(.*)/s).slice(0,2));
    const signature = Object.fromEntries(parts);
    if (parts.length !== 3 || new Set(parts.map(p=>p[0])).size !== 3 || signature['s-algorithm'] !== 'HmacSHA256' ||
        !/^\d{13}$/.test(signature.ts || '') || Math.abs(now - Number(signature.ts)) > 300000) throw new CommunityError('receipt_unauthorized',401);
    const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(env.COMMUNITY_EMAIL_AGENT_AUTH_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data)));
    const mac = btoa(String.fromCharCode(...bytes));
    if (!equal(mac, decodeURIComponent(signature.s || ''))) throw new CommunityError('receipt_unauthorized',401);
  } else throw new CommunityError('receipt_auth_configuration',503);
  try { return JSON.parse(data); } catch (_) { throw new CommunityError('receipt_invalid',400); }
}
export function parseEmailReceipt(payload) {
  // Mock send-test does not carry a genuine sold activation/provider ID/recipient.
  if (!payload || payload.test === true || payload.is_test === true || payload.providerSendTest === true) return null;
  const message = Array.isArray(payload.event_message) ? payload.event_message[0] : payload.event_message;
  const info = message?.email_info, details = message?.event_data?.details;
  const object = message?.event_data?.object;
  const delivered = ['email_open','email_link_click'].includes(object);
  const hardBounce = ['hardbounce','hard_bounce'].includes(object);
  const softBounce = ['softbounce','soft_bounce'].includes(object);
  const failed = hardBounce || softBounce;
  const reference = info?.client_reference, id = message?.request_id;
  const to = info?.to;
  const addresses = Array.isArray(to) ? to.flatMap(t => Array.isArray(t.email_address) ? t.email_address.map(a=>a.address) : [t.email_address?.address]) :
    Array.isArray(to?.email_address) ? to.email_address.map(a=>a.address) : [to?.email_address?.address];
  const recipient = normalizeEmail(addresses[0]);
  const time = details?.time ?? details?.modified_time;
  const timestamp = typeof time === 'number' ? time : typeof time === 'string' && /^\d{13}$/.test(time) ? Number(time) : Date.parse(time);
  if ((!delivered && !failed) || typeof reference !== 'string' || typeof id !== 'string' || !id ||
      addresses.length !== 1 || !recipient || !Number.isFinite(timestamp) || timestamp > Date.now()+300000) return null;
  const at = new Date(timestamp).toISOString();
  const error_code = failed ? (hardBounce ? 'community_email_hard_bounce' : 'community_email_soft_bounce') : null;
  return { reference, id, recipient, at, status: delivered ? 'completed' : hardBounce ? 'failed' : 'uncertain', error_code,
    failure_proof: failed ? { contract_version: 1, source: 'zoho_authenticated_webhook', terminal: hardBounce,
      external_id: id, occurred_at: at, error_code } : null };

}
export async function recordEmailReceipt(store, config, receipt, rpc = notificationReceiptRpc(config)) {
  const prefix = `community:v1:${config.environment}:${config.organizationId}:`;
  if (!receipt.reference.startsWith(prefix) || !receipt.reference.endsWith(':email')) return false;
  const activationId = receipt.reference.slice(prefix.length,-6);
  if (!UUID.test(activationId) || receipt.reference !== emailReference(config,activationId)) return false;
  const context = await activationContext(store,config,activationId);
  // Review holds new sends, not signed receipts of an already paid/sent attempt.
  if (!context.productsReady || normalizeEmail(context.subscription.email) !== receipt.recipient) return false;
  const rows = await store('cobranca_notificacoes', { activation_id: `eq.${activationId}`, channel:'eq.email', limit:'2' });
  if (rows.length !== 1) return false;
  const n = rows[0];
  if (n.external_id !== receipt.id) {
    const history = await store('cobranca_notificacao_tentativas', { notification_id:`eq.${n.id}`, environment:`eq.${config.environment}`,
      channel:'eq.email', external_id:`eq.${receipt.id}`, limit:'2' });
    if (history.length > 1) throw new CommunityError('receipt_history_conflict',500);
    if (history.length !== 1) {
      // CPaaS can call back before its send response stores request_id. Keep
      // that authenticated recent event retryable instead of losing its receipt.
      const age = Date.now() - Date.parse(receipt.at);
      if (['processing','uncertain'].includes(n.status) && n.attempts > 0 && !n.external_id && age >= -300000)
        throw new CommunityError('receipt_pending_dispatch',500);
      return false; // Never attach an uncorrelated ID to a reset/unknown attempt.
    }
  }
  // Root RPC locks/rechecks current/archive IDs and preserves every attempt.
  // Historical delivery can complete the channel; contrary terminal proof needs
  // manual review. No REST PATCH fallback when RPC/migration is absent.
  return rpc({ contract_version:1, organization_id:config.organizationId, environment:config.environment,
    notification_id:n.id, channel:'email', external_id:receipt.id,
    status:receipt.status, at:receipt.at, failure_proof:receipt.failure_proof ?? null });
}
export async function onRequestPost({request,env}) {
  try {
    const data=await authenticatedEmailData(request,env),config=notificationConfig(env),store=notificationStore(config);
    const messages=Array.isArray(data.event_message) ? data.event_message : [data.event_message];
    let matched=false;
    for (const event_message of messages) {
      const receipt=parseEmailReceipt({...data,event_message});
      if (receipt) matched=(await recordEmailReceipt(store,config,receipt)) || matched;
    }
    return Response.json({ok:true,matched});
  } catch(error) { return Response.json({error:error.code || 'receipt_unavailable'},{status:error.status || 500}); }
}
