const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const load = file => import(pathToFileURL(path.resolve(__dirname,'../functions/api/checkout',file)));
const activationId='11111111-1111-4111-8111-111111111111';
const config={organizationId:'18b103e6-a006-45ac-84d5-62312f45ba77',environment:'production'};
function fixture(missing=false, financialReview=false) {
  const now=new Date(Date.now()-10000).toISOString();
  const state={ channels:['email','whatsapp'].map(channel=>({id:channel,channel,activation_id:activationId,status:'pending',attempts:0,updated_at:now,next_attempt_at:now,external_id:null,accepted_at:null,failure_proof:null})) };
  const store=async (table,filters,patch)=> {
    if(table==='cobranca_competencias')return [{subscription_id:'sub',period_end:'2027-10-03T00:00:00Z'}];
    if(table==='cobranca_assinaturas')return [{email:'buyer@example.invalid',checkout_order_id:'order',sold_snapshot:{contract_version:1,resource_profile:{unlimited:true},products:['os','club'],duration_months:12}}];
    if(table==='cobranca_pedidos')return [{buyer_email:'buyer@example.invalid',buyer_phone:'11999998888',buyer_name:'Synthetic'}];
    if(table==='cobranca_revisoes_financeiras') {
      assert.equal(filters.checkout_order_id,'eq.order');assert.equal(filters.environment,'eq.production');assert.equal(filters.provider,'eq.asaas');assert.equal(filters.state,'eq.pending');assert.equal(filters.select,'id,activation_id');assert.equal(filters.or,`(activation_id.eq.${activationId},activation_id.is.null)`);
      return financialReview ? [{id:'synthetic-review',activation_id:financialReview === true ? activationId : financialReview}] : [];
    }
    if(table==='cobranca_entregas')return ['os',...(missing?[]:['club'])].map(product=>({product,status:'completed',completed_at:now}));
    if(table==='cobranca_pending_notifications')return state.channels.filter(n=>['pending','failed'].includes(n.status)&&Date.parse(n.next_attempt_at)<=Date.now()).map(n=>({...n}));
    assert.equal(table,'cobranca_notificacoes');
    const rows=state.channels.filter(n=>Object.entries(filters).every(([k,v])=> {
      if(k==='limit')return true;
      if(v==='is.null')return n[k] == null;
      if(v.startsWith('lte.'))return Date.parse(n[k])<=Date.parse(v.slice(4));
      if(v.startsWith('gt.'))return Date.parse(n[k])>Date.parse(v.slice(3));
      return n[k]===v.slice(3);
    }));
    if(patch)rows.forEach(n=>Object.assign(n,patch));
    return rows.map(n=>({...n}));
  };
  const claim=async request=>{
    if(state.financialHold)return {claimed:false,reason:'financial_review_pending',notification:null};
    const rows=await store('cobranca_notificacoes',{id:`eq.${request.notification_id}`,status:`eq.${request.expected_status}`,updated_at:`eq.${request.expected_updated_at}`,
      external_id:'is.null',accepted_at:'is.null',failure_proof:'is.null'}, {status:'processing',claim_token:request.claim_token,
      lease_until:new Date(Date.now()+120000).toISOString(),updated_at:new Date().toISOString(),attempts:state.channels.find(n=>n.id===request.notification_id).attempts+1});
    return {claimed:rows.length===1,reason:rows.length?'claimed':'claim_lost',notification:rows[0]||null};
  };
  return {state,store,claim};
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
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send:async()=>{calls++;}});
  assert.equal(calls,0);assert.ok(h.state.channels.every(n=>n.attempts===0));
});
test('concurrent duplicates send once per independent channel; API acceptance never completes',async()=>{
  const m=await load('_community-notifications.js'),h=fixture(),calls=[];
  const send=async channel=>{calls.push(channel);return {status:'processing',external_id:`synthetic-${channel}`,accepted_at:new Date().toISOString()};};
  await Promise.all(Array.from({length:6},()=>m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send})));
  assert.deepEqual(calls.sort(),['email','whatsapp']);assert.ok(h.state.channels.every(n=>n.status==='processing'&&!n.delivered_at));
  h.state.channels.forEach(n=>n.lease_until=new Date(Date.now()-1000).toISOString());
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send});
  assert.equal(calls.length,2);assert.ok(h.state.channels.every(n=>n.status==='uncertain'));
});
test('preflight failure retries only its channel, leaving completed sibling untouched',async()=>{
  const m=await load('_community-notifications.js'),{CommunityError}=await load('_community-orders.js'),h=fixture();
  const send=async channel=>{if(channel==='email')throw new CommunityError('community_email_configuration');return {status:'processing',external_id:'wa'};};
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send});
  assert.equal(h.state.channels[0].status,'failed');
  Object.assign(h.state.channels[1],{status:'completed',delivered_at:new Date().toISOString()});
  h.state.channels[0].next_attempt_at=new Date(0).toISOString();let calls=[];
  await m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send:async channel=>{calls.push(channel);return {status:'processing',external_id:'email'};}});
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

test('terminal/external failed and soft bounce preserve proof/error/IDs under repeated drains',async()=>{
 const m=await load('_community-notifications.js');
 for(const extra of [
  {status:'failed',external_id:'rejected-id',accepted_at:'2026-10-03T00:00:00Z',error_code:'provider_failure'},
  {status:'failed',failure_proof:{terminal:true},error_code:'verified_failure'},
  {status:'failed',error_code:'unclassified_failure'},
  {status:'uncertain',failure_proof:{terminal:false},external_id:'soft-bounce',error_code:'community_email_soft_bounce'}
 ]) {
  const h=fixture();Object.assign(h.state.channels[0],extra);h.state.channels[1].status='completed';
  const before=structuredClone(h.state.channels[0]);let sends=0,patches=0;
  const store=async(t,f,p)=>{if(p)patches++;return h.store(t,f,p);};
  for(let i=0;i<3;i++)await m.processCommunityNotifications({config,activationId,env:{},claim:h.claim,store,send:async()=>{sends++;}});
  assert.equal(sends,0);assert.equal(patches,0);assert.deepEqual(h.state.channels[0],before);
 }
});
test('manual terminal archive/reset opens a new attempt only after IDs and proof are cleared',async()=>{
 const m=await load('_community-notifications.js'),h=fixture();let sends=[];
 const email=h.state.channels[0];h.state.channels[1].status='completed';
 Object.assign(email,{status:'failed',attempts:1,external_id:'old',accepted_at:'2026-10-03T00:00:00Z',failure_proof:{terminal:true},error_code:'failure'});
 const send=async(c,msg,env,reference)=>{sends.push(reference);return {status:'processing',external_id:'new'};};
 await m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send});assert.equal(sends.length,0);
 Object.assign(email,{status:'pending',external_id:null,accepted_at:null,failure_proof:null,error_code:null,updated_at:'manual-reset'});
 await m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send});
 assert.deepEqual(sends,[m.emailReference(config,activationId)]);assert.equal(email.attempts,2);
});
test('claim CAS forbids an external effect added after candidate read',async()=>{
 const m=await load('_community-notifications.js'),h=fixture();h.state.channels[1].status='completed';let sends=0;
 const store=async(t,f,p)=> {
  if(p?.claim_token)h.state.channels[0].external_id='concurrent-provider-effect';
  return h.store(t,f,p);
 };
 await m.processCommunityNotifications({config,activationId,env:{},claim:async request=>{h.state.channels[0].external_id='concurrent-provider-effect';return h.claim(request);},store,send:async()=>{sends++;}});
 assert.equal(sends,0);assert.equal(h.state.channels[0].attempts,0);
});
test('signed failure arriving before acceptance finish wins CAS and preserves proof',async()=>{
 const m=await load('_community-notifications.js'),h=fixture();h.state.channels[1].status='completed';
 const proof={contract_version:1,terminal:true,external_id:'accepted-id'};
 await m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:h.claim,send:async()=>{
  Object.assign(h.state.channels[0],{status:'failed',external_id:'accepted-id',failure_proof:proof,error_code:'verified_failure'});
  return {status:'processing',external_id:'accepted-id',accepted_at:new Date().toISOString()};
 }});
 assert.equal(h.state.channels[0].status,'failed');assert.deepEqual(h.state.channels[0].failure_proof,proof);
});
test('a manual reset during reconciliation is never changed back to uncertain',async()=>{
 const m=await load('_community-notifications.js'),h=fixture();h.state.channels[1].status='completed';
 Object.assign(h.state.channels[0],{status:'processing',external_id:'old',attempts:1,lease_until:new Date(0).toISOString()});
 let patches=0;
 const store=async(t,f,p)=>{
  if(t==='cobranca_notificacoes'&&f.id&&!p)Object.assign(h.state.channels[0],{status:'pending',external_id:null,accepted_at:null,failure_proof:null,updated_at:'reset'});
  if(p)patches++;
  return h.store(t,f,p);
 };
 await m.processCommunityNotifications({config,activationId,env:{},claim:h.claim,store,send:async()=>assert.fail('stale snapshot cannot send')});
 assert.equal(patches,0);assert.equal(h.state.channels[0].status,'pending');
});
test('durable receipt transport enforces strict contract and fails closed without RPC',async()=>{
 const m=await load('_community-notifications.js'),conf={...config,db:'https://db.example.invalid',key:'synthetic'};let sent;
 const rpc=m.notificationReceiptRpc(conf,async(url,init)=>{sent=JSON.parse(init.body);assert.ok(url.endsWith('/rpc/record_community_notification_receipt'));return Response.json({contract_version:1,matched:true});});
 assert.equal(await rpc({notification_id:'synthetic'}),true);assert.deepEqual(sent,{p_receipt:{notification_id:'synthetic'}});
 for(const value of [{matched:true},{contract_version:1,matched:'true'}])await assert.rejects(m.notificationReceiptRpc(conf,async()=>Response.json(value))({}),e=>e.status===500);
 await assert.rejects(m.notificationReceiptRpc(conf,async()=>Response.json({error:'not_found'},{status:404}))({}),e=>e.status===500);
});

test('pending financial review scoped to sold order/env blocks new sends without mutating historical paid/completed state',async()=>{
 const m=await load('_community-notifications.js'),h=fixture(false,true);let sends=0,patches=0;
 Object.assign(h.state.channels[1],{status:'completed',external_id:'paid-history',accepted_at:'accepted-proof'});
 const before=structuredClone(h.state.channels);
 const result=await m.processCommunityNotifications({config,activationId,env:{},claim:h.claim,store:async(t,f,p)=>{if(p)patches++;return h.store(t,f,p);},send:async()=>{sends++;}});
 assert.equal(sends,0);assert.equal(patches,0);assert.deepEqual(h.state.channels,before);
 assert.equal(result[0].error_code,'community_financial_review_pending');assert.equal(result[1].status,'completed');
});

test('financial review in another paid competence does not hold this activation; unbound initial review holds order',async()=>{
 const m=await load('_community-notifications.js');
 const other=fixture(false,'22222222-2222-4222-8222-222222222222');let calls=0;
 await m.processCommunityNotifications({config,activationId,env:{},store:other.store,claim:other.claim,send:async()=>{calls++;return {status:'processing',external_id:'accepted'};}});
 assert.equal(calls,2);
 const initial=fixture();let initialCalls=0;
 const store=async(t,f,p)=>t==='cobranca_revisoes_financeiras'?[{id:'initial-unpaid-review',activation_id:null}]:initial.store(t,f,p);
 await m.processCommunityNotifications({config,activationId,env:{},claim:initial.claim,store,send:async()=>{initialCalls++;}});
 assert.equal(initialCalls,0);assert.ok(initial.state.channels.every(n=>n.attempts===0));
});

test('a hold committed after context read blocks the atomic dispatch authorization',async()=>{
 const m=await load('_community-notifications.js'),h=fixture();let sends=0;
 const store=async(t,f,p)=>{const rows=await h.store(t,f,p);if(t==='cobranca_pending_notifications')h.state.financialHold=true;return rows;};
 const result=await m.processCommunityNotifications({config,activationId,env:{},store,claim:h.claim,send:async()=>{sends++;}});
 assert.equal(sends,0);assert.ok(h.state.channels.every(n=>n.attempts===0));assert.ok(result.every(n=>n.error_code==='community_financial_review_pending'));
});
test('atomic claim unavailable or with wrong identity cannot fall back to REST claim or send',async()=>{
 const m=await load('_community-notifications.js'),h=fixture();let sends=0;
 await assert.rejects(m.processCommunityNotifications({config,activationId,env:{},store:h.store,claim:async()=>{throw new Error('RPC unavailable');},send:async()=>{sends++;}}));
 assert.equal(sends,0);assert.ok(h.state.channels.every(n=>n.attempts===0));
 const rpc=m.notificationClaimRpc({...config,db:'https://central.invalid',key:'synthetic'},async()=>Response.json({contract_version:1,claimed:true,reason:'claimed',notification:{id:'wrong'}}));
 await assert.rejects(rpc({notification_id:'email',claim_token:'nonce'}),e=>e.status===500);
});
