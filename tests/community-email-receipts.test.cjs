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
function receiptHarness({history=[],currentId='provider-synthetic',state='uncertain',attempts=1,financialReview=false}={}) {
 const row={id:'notification',status:state,attempts,external_id:currentId};
 const calls=[];
 const store=async(table,filters,patch)=>{
  assert.equal(patch,undefined,'receipt writes must use the atomic RPC');
  if(table==='cobranca_competencias')return [{subscription_id:'subscription',period_end:'2027-01-03T00:00:00Z'}];
  if(table==='cobranca_assinaturas')return [{email:'buyer@example.invalid',checkout_order_id:'order',sold_snapshot:{contract_version:1,resource_profile:{unlimited:true},products:['os'],duration_months:3}}];
  if(table==='cobranca_pedidos')return [{buyer_email:'buyer@example.invalid'}];
  if(table==='cobranca_revisoes_financeiras')return financialReview ? [{id:'synthetic-review',activation_id:id}] : [];
  if(table==='cobranca_entregas')return [{product:'os',status:'completed',completed_at:'proof'}];
  if(table==='cobranca_notificacao_tentativas') {
   assert.equal(filters.notification_id,'eq.notification');assert.equal(filters.channel,'eq.email');assert.equal(filters.environment,'eq.production');
   return history;
  }
  assert.equal(table,'cobranca_notificacoes');return [{...row}];
 };
 const rpc=async receipt=>{calls.push(receipt);return true;};
 return {row,store,rpc,calls};
}
test('reference, provider ID, recipient and org correlate before atomic RPC',async()=>{
 const m=await load(),receipt=m.parseEmailReceipt(payload()),h=receiptHarness();
 for(const delta of [{recipient:'wrong@example.invalid'},{id:'wrong'},{reference:ref.replace(org,id)}])
  assert.equal(await m.recordEmailReceipt(h.store,config,{...receipt,...delta},h.rpc),false);
 assert.equal(h.calls.length,0);
 assert.equal(await m.recordEmailReceipt(h.store,config,receipt,h.rpc),true);
 assert.equal(h.calls[0].status,'completed');assert.equal(h.calls[0].failure_proof,null);
 assert.deepEqual(Object.keys(h.calls[0]).sort(),['at','channel','contract_version','environment','external_id','failure_proof','notification_id','organization_id','status']);
 await assert.rejects(m.recordEmailReceipt(async()=>{throw new Error('db failure');},config,receipt,h.rpc));
});
test('hard bounce supplies terminal proof; soft bounce remains uncertain and nonterminal',async()=>{
 const m=await load();
 for(const [object,status,terminal] of [['hardbounce','failed',true],['softbounce','uncertain',false]]) {
  const h=receiptHarness(),receipt=m.parseEmailReceipt(payload(object));
  assert.equal(receipt.status,status);assert.equal(await m.recordEmailReceipt(h.store,config,receipt,h.rpc),true);
  assert.deepEqual(h.calls[0].failure_proof,{contract_version:1,source:'zoho_authenticated_webhook',terminal,external_id:'provider-synthetic',occurred_at:receipt.at,error_code:receipt.error_code});
 }
});
test('late archived ID targets its original attempt while current is manually pending or processing a later attempt',async()=>{
 const m=await load(),receipt=m.parseEmailReceipt(payload());
 for(const state of ['pending','processing','completed']) {
  const h=receiptHarness({currentId:'new-id',state,attempts:2,history:[{attempt_number:1}]});
  const before={...h.row};assert.equal(await m.recordEmailReceipt(h.store,config,receipt,h.rpc),true);
  assert.equal(h.calls[0].external_id,'provider-synthetic');assert.deepEqual(h.row,before);
 }
});
test('early callback retries until its provider ID is persisted; it never binds an unknown reset attempt',async()=>{
 const m=await load(),receipt=m.parseEmailReceipt(payload()),h=receiptHarness({currentId:null,state:'processing',attempts:2});
 await assert.rejects(m.recordEmailReceipt(h.store,config,receipt,h.rpc),e=>e.code==='receipt_pending_dispatch'&&e.status===500);
 assert.equal(h.calls.length,0);
 h.row.external_id=receipt.id;
 assert.equal(await m.recordEmailReceipt(h.store,config,receipt,h.rpc),true);
 const reset=receiptHarness({currentId:null,state:'pending',attempts:2});
 assert.equal(await m.recordEmailReceipt(reset.store,config,receipt,reset.rpc),false);
});
test('manual reset between correlation and RPC is resolved atomically, never by local PATCH',async()=>{
 const m=await load(),receipt=m.parseEmailReceipt(payload()),h=receiptHarness();
 assert.equal(await m.recordEmailReceipt(h.store,config,receipt,async args=>{
  assert.equal(args.external_id,'provider-synthetic');Object.assign(h.row,{status:'pending',attempts:2,external_id:null});return true;
 }),true);
 assert.equal(h.row.external_id,null,'RPC owns historical completion and preserves current IDs');
 const fresh=receiptHarness();await assert.rejects(m.recordEmailReceipt(fresh.store,config,receipt,async()=>{throw new Error('RPC missing');}));
});
test('financial review hold does not discard a real receipt for an already sent or archived attempt',async()=>{
 const m=await load(),h=receiptHarness({financialReview:true});
 assert.equal(await m.recordEmailReceipt(h.store,config,m.parseEmailReceipt(payload()),h.rpc),true);
 assert.equal(h.calls[0].status,'completed');
});

test('authenticated callback after accepted send timeout remains retryable without attaching an unknown ID',async()=>{
 const m=await load(),receipt=m.parseEmailReceipt(payload()),h=receiptHarness({currentId:null,state:'uncertain',attempts:1});
 await assert.rejects(m.recordEmailReceipt(h.store,config,receipt,h.rpc),e=>e.code==='receipt_pending_dispatch'&&e.status===500);
 assert.equal(h.calls.length,0);assert.equal(h.row.external_id,null);
 const untouched=receiptHarness({currentId:null,state:'uncertain',attempts:0});
 assert.equal(await m.recordEmailReceipt(untouched.store,config,receipt,untouched.rpc),false);
});

test('an older authenticated receipt for an uncertain ID-less attempt remains recoverable',async()=>{
 const m=await load(),h=receiptHarness({currentId:null,state:'uncertain',attempts:1}),receipt={...m.parseEmailReceipt(payload()),at:new Date(Date.now()-86400000).toISOString()};
 await assert.rejects(m.recordEmailReceipt(h.store,config,receipt,h.rpc),e=>e.code==='receipt_pending_dispatch'&&e.status===500);
 assert.equal(h.calls.length,0);
});
