const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {createHmac}=require('node:crypto');
const load=()=>import(pathToFileURL(path.resolve(__dirname,'../functions/api/checkout/community-email-receipts.js')));
const id='11111111-1111-4111-8111-111111111111',org='18b103e6-a006-45ac-84d5-62312f45ba77';
const config={organizationId:org,environment:'production'};
const ref=`community:v1:production:${org}:${id}:email`;
function payload(object='email_open') {return {event_message:{email_info:{client_reference:ref,to:[{email_address:{address:'buyer@example.invalid'}}]},request_id:'provider-synthetic',event_data:{object,details:{time:new Date(Date.now()-1000).toISOString()}}}};}
function request(data,headers={}) {return new Request('https://local.invalid',{method:'POST',headers,body:data});}
test('unsigned, wrong header, implicit mode and HMAC fallback rejected',async()=>{
 const m=await load(),body=JSON.stringify(payload());
 await assert.rejects(m.authenticatedEmailData(request(body),{}),e=>e.status===503);
 const env={COMMUNITY_EMAIL_WEBHOOK_AUTH_MODE:'header',COMMUNITY_EMAIL_WEBHOOK_TOKEN:'synthetic'};
 await assert.rejects(m.authenticatedEmailData(request(body),env),e=>e.status===401);
 await assert.rejects(m.authenticatedEmailData(request(body,{'X-Imobiturbo-Webhook-Token':'wrong'}),env),e=>e.status===401);
 assert.deepEqual(await m.authenticatedEmailData(request(body,{'X-Imobiturbo-Webhook-Token':'synthetic'}),env),payloadFrom(body));
});
const payloadFrom=JSON.parse;
test('explicit confirmed Agent HMAC signs exact decoded data, rejects JSON reserialization/timestamp/replay/unsigned',async()=>{
 const m=await load(),now=Date.now(),data='{ "exact" : "UTF8 á + &" }';
 const env={COMMUNITY_EMAIL_WEBHOOK_AUTH_MODE:'hmac',COMMUNITY_EMAIL_AGENT_AUTH_KEY:'synthetic-agent',COMMUNITY_EMAIL_AGENT_AUTH_KEY_CONFIRMED:'true'};
 const mac=createHmac('sha256',env.COMMUNITY_EMAIL_AGENT_AUTH_KEY).update(data,'utf8').digest('base64');
 const req=(text,ts=now)=>request(new URLSearchParams({data:text}).toString(),{'Content-Type':'application/x-www-form-urlencoded','producer-signature':`ts=${ts};s=${encodeURIComponent(mac)};s-algorithm=HmacSHA256`});
 assert.deepEqual(await m.authenticatedEmailData(req(data),env,now),JSON.parse(data));
 await assert.rejects(m.authenticatedEmailData(req(JSON.stringify(JSON.parse(data))),env,now),e=>e.status===401);
 await assert.rejects(m.authenticatedEmailData(req(data,now-300001),env,now),e=>e.status===401);
 await assert.rejects(m.authenticatedEmailData(req(data),{...env,COMMUNITY_EMAIL_AGENT_AUTH_KEY_CONFIRMED:'false'},now),e=>e.status===503);
});
test('only genuine open/click/bounce parses; sendTest and acceptance cannot complete',async()=>{
 const m=await load();
 for(const object of ['email_open','email_link_click'])assert.equal(m.parseEmailReceipt(payload(object)).status,'completed');
 assert.equal(m.parseEmailReceipt(payload('hardbounce')).status,'failed');
 assert.equal(m.parseEmailReceipt({...payload(),providerSendTest:true}),null);
 assert.equal(m.parseEmailReceipt({request_id:'provider-synthetic',data:[{code:'EM_104'}]}),null);
 assert.equal(m.parseEmailReceipt(payload('email_delivered')),null);
});
test('reference, provider ID, recipient and organization correlate; duplicate/failure cannot downgrade completion; DB failure throws',async()=>{
 const m=await load(),p=payload(),receipt=m.parseEmailReceipt(p);
 const row={id:'notification',status:'uncertain',attempts:1,updated_at:'old',external_id:'provider-synthetic'};
 let writes=0;
 const store=async(table,filters,patch)=>{
  if(table==='cobranca_competencias')return [{subscription_id:'subscription',period_end:'2027-01-03T00:00:00Z'}];
  if(table==='cobranca_assinaturas')return [{email:'buyer@example.invalid',checkout_order_id:'order',sold_snapshot:{contract_version:1,resource_profile:{unlimited:true},products:['os'],duration_months:3}}];
  if(table==='cobranca_pedidos')return [{buyer_email:'buyer@example.invalid'}];
  if(table==='cobranca_entregas')return [{product:'os',status:'completed',completed_at:'proof'}];
  if(patch){writes++;Object.assign(row,patch);}
  return [{...row}];
 };
 assert.equal(await m.recordEmailReceipt(store,config,{...receipt,recipient:'wrong@example.invalid'}),false);
 assert.equal(await m.recordEmailReceipt(store,config,{...receipt,id:'wrong'}),false);
 assert.equal(await m.recordEmailReceipt(store,config,{...receipt,reference:ref.replace(org,id)}),false);
 assert.equal(writes,0);
 assert.equal(await m.recordEmailReceipt(store,config,receipt),true);assert.equal(row.status,'completed');const at=row.delivered_at;
 assert.equal(await m.recordEmailReceipt(store,config,{...receipt,status:'failed'}),true);
 assert.equal(await m.recordEmailReceipt(store,config,{...receipt,at:new Date().toISOString()}),true);
 assert.equal(writes,1);assert.equal(row.delivered_at,at);
 await assert.rejects(m.recordEmailReceipt(async()=>{throw new Error('db failure');},config,receipt));
});
