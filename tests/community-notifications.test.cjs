const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const load = file => import(pathToFileURL(path.resolve(__dirname,'../functions/api/checkout',file)));
const activationId='11111111-1111-4111-8111-111111111111';
const config={organizationId:'18b103e6-a006-45ac-84d5-62312f45ba77',environment:'production'};
function fixture(missing=false) {
  const now=new Date(Date.now()-10000).toISOString();
  const state={ channels:['email','whatsapp'].map(channel=>({id:channel,channel,activation_id:activationId,status:'pending',attempts:0,updated_at:now,next_attempt_at:now})) };
  const store=async (table,filters,patch)=> {
    if(table==='cobranca_competencias')return [{subscription_id:'sub',period_end:'2027-10-03T00:00:00Z'}];
    if(table==='cobranca_assinaturas')return [{email:'buyer@example.invalid',checkout_order_id:'order',sold_snapshot:{contract_version:1,resource_profile:{unlimited:true},products:['os','club'],duration_months:12}}];
    if(table==='cobranca_pedidos')return [{buyer_email:'buyer@example.invalid',buyer_phone:'11999998888',buyer_name:'Synthetic'}];
    if(table==='cobranca_entregas')return ['os',...(missing?[]:['club'])].map(product=>({product,status:'completed',completed_at:now}));
    if(table==='cobranca_pending_notifications')return state.channels.filter(n=>['pending','failed'].includes(n.status)&&Date.parse(n.next_attempt_at)<=Date.now()).map(n=>({...n}));
    assert.equal(table,'cobranca_notificacoes');
    const rows=state.channels.filter(n=>Object.entries(filters).every(([k,v])=> k==='limit'||v.startsWith('lte.')? k==='limit'||Date.parse(n[k])<=Date.parse(v.slice(4)) : v.startsWith('gt.')?Date.parse(n[k])>Date.parse(v.slice(3)): n[k]===v.slice(3)));
    if(patch)rows.forEach(n=>Object.assign(n,patch));
    return rows.map(n=>({...n}));
  };
  return {state,store};
}
test('strict endpoint rejects buyer/payload fields and cross environment/org',async()=>{
  const m=await load('_community-notifications.js');
  const body={contract_version:1,activation_id:activationId,environment:'production',commercial_organization_id:config.organizationId};
  assert.equal(m.validNotificationRequest(body,config),true);
  for(const delta of [{email:'attacker@example.invalid'},{environment:'sandbox'},{commercial_organization_id:activationId},{contract_version:2}])assert.equal(m.validNotificationRequest({...body,...delta},config),false);
  const route=await load('community-notifications.js');
  const response=await route.onRequestPost({request:new Request('https://local.invalid',{method:'POST',body:JSON.stringify(body)}),env:{COMMUNITY_INTERNAL_TOKEN:'synthetic'}});
  assert.equal(response.status,401);
});
test('all sold products required before any channel claim',async()=>{
  const m=await load('_community-notifications.js'),h=fixture(true);let calls=0;
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,send:async()=>{calls++;}});
  assert.equal(calls,0);assert.ok(h.state.channels.every(n=>n.attempts===0));
});
test('concurrent duplicates send once per independent channel; API acceptance never completes',async()=>{
  const m=await load('_community-notifications.js'),h=fixture(),calls=[];
  const send=async channel=>{calls.push(channel);return {status:'processing',external_id:`synthetic-${channel}`,accepted_at:new Date().toISOString()};};
  await Promise.all(Array.from({length:6},()=>m.processCommunityNotifications({config,activationId,env:{},store:h.store,send})));
  assert.deepEqual(calls.sort(),['email','whatsapp']);assert.ok(h.state.channels.every(n=>n.status==='processing'&&!n.delivered_at));
  h.state.channels.forEach(n=>n.lease_until=new Date(Date.now()-1000).toISOString());
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,send});
  assert.equal(calls.length,2);assert.ok(h.state.channels.every(n=>n.status==='uncertain'));
});
test('preflight failure retries only its channel, leaving completed sibling untouched',async()=>{
  const m=await load('_community-notifications.js'),{CommunityError}=await load('_community-orders.js'),h=fixture();
  const send=async channel=>{if(channel==='email')throw new CommunityError('community_email_configuration');return {status:'processing',external_id:'wa'};};
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,send});
  assert.equal(h.state.channels[0].status,'failed');
  Object.assign(h.state.channels[1],{status:'completed',delivered_at:new Date().toISOString()});
  h.state.channels[0].next_attempt_at=new Date(0).toISOString();let calls=[];
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,send:async channel=>{calls.push(channel);return {status:'processing',external_id:'email'};}});
  assert.deepEqual(calls,['email']);assert.equal(h.state.channels[1].status,'completed');
});
test('provider timeout/HTTP rejection remain uncertain and payload tracking is per community email',async()=>{
  const m=await load('_community-notifications.js');
  const message={email:'buyer@example.invalid',phone:'11999998888',name:'Synthetic',community:{products:['os','club'],duration_months:3,period_end:'2027-01-03T00:00:00Z'}};
  const env={ZEPTOMAIL_API_KEY:'synthetic',ZEPTOMAIL_FROM_EMAIL:'sender@example.invalid'};let payload;
  const accepted=await m.sendCommunityChannel('email',message,env,'synthetic-ref',async(url,init)=>{payload=JSON.parse(init.body);return Response.json({request_id:'synthetic-id',data:[{code:'EM_104'}]});});
  assert.equal(accepted.status,'processing');assert.equal(payload.track_opens,true);assert.equal(payload.track_clicks,true);assert.equal(payload.client_reference,'synthetic-ref');
  assert.equal((await m.sendCommunityChannel('email',message,env,'ref',async()=>{throw new Error('timeout');})).status,'uncertain');
  assert.equal((await m.sendCommunityChannel('email',message,env,'ref',async()=>Response.json({error:'failure'},{status:500}))).status,'uncertain');
});
