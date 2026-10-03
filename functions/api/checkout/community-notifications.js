import { notificationConfig, notificationStore, validNotificationRequest, processCommunityNotifications } from './_community-notifications.js';
export async function onRequestPost({ request, env }) {
  if (!env.COMMUNITY_INTERNAL_TOKEN) return Response.json({ error: 'community_auth_configuration' }, { status: 503 });
  if (request.headers.get('Authorization') !== `Bearer ${env.COMMUNITY_INTERNAL_TOKEN}`) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const config = notificationConfig(env);
    let body;
    try { body = await request.json(); } catch (_) { return Response.json({ error: "community_request_invalid" }, { status: 400 }); }
    if (!validNotificationRequest(body, config)) return Response.json({ error: 'community_request_invalid' }, { status: 400 });
    const channels = await processCommunityNotifications({ config, activationId: body.activation_id, env, store: notificationStore(config) });
    return Response.json({ contract_version: 1, activation_id: body.activation_id, channels }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ error: error.code || 'community_notification_unavailable' }, { status: error.status || 500 }); }
}
