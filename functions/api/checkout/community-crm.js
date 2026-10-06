import { reconcileCommunityCrm } from './_community-crm.js';
export async function onRequestPost({ request, env }) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!env.COMMUNITY_INTERNAL_TOKEN) return Response.json({ error: 'community_crm_auth_configuration' }, { status: 503, headers });
  if (request.headers.get('Authorization') !== `Bearer ${env.COMMUNITY_INTERNAL_TOKEN}`) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  try {
    const body = await request.json();
    return Response.json(await reconcileCommunityCrm(env, body.cursor || null), { headers });
  } catch (error) { return Response.json({ error: error.code || 'community_crm_pending' }, { status: error.status || 503, headers }); }
}
