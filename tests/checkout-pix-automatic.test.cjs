const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = file => import(pathToFileURL(path.join(process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname,'..'),'functions/api/checkout',file)));
const ORDER = '11111111-1111-4111-8111-111111111111';
const AUTH = '44444444-4444-4444-8444-444444444444';
const TX = '55555555-5555-4555-8555-555555555555';
const INSTRUCTION = '66666666-6666-4666-8666-666666666666';
const ORG = '18b103e6-a006-45ac-84d5-62312f45ba77';
const env = { ASAAS_API_KEY:'synthetic',ASAAS_WEBHOOK_TOKEN:'synthetic-hook',SUPABASE_URL:'https://db.example.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic',COMMUNITY_ORGANIZATION_ID:ORG };
const buyer = { plan:'mensal',paymentMethod:'PIX',pixAutomatic:true,installments:1,idempotencyKey:'22222222-2222-4222-8222-222222222222',name:'Synthetic',email:'buyer@example.invalid',phone:'11999999999',cpfCnpj:'52998224725' };
function fixture() {
 const order = { id:ORDER,provider:'asaas',environment:'production',organization_id:ORG,buyer_email:buyer.email,buyer_name:buyer.name,buyer_phone:buyer.phone,
 external_reference:`community:${ORDER}`,claim_token:'33333333-3333-4333-8333-333333333333',status:'created',created_at:new Date().toISOString(),
 provider_customer_id:'cus_synthetic',provider_payment_id:null,provider_subscription_id:null,provider_installment_id:null,provider_pix_authorization_id:AUTH,
 sold_snapshot:{contract_version:1,offer_key:'comunidade-mensal',offer_version:1,duration_months:1,products:['os','club'],currency:'BRL',price_mode:'recurring_pix_auto',contract_total_cents:14700,installment_count:1} };
 const auth={ id:AUTH,contractId:ORDER.replace(/-/g,''),customerId:'cus_synthetic',status:'CREATED',frequency:'MONTHLY',paymentCreationMode:'SUBSCRIPTION',retryPolicy:'NOT_ALLOWED',value:147,payload:'synthetic-qr',encodedImage:'synthetic-image',immediateQrCode:{conciliationIdentifier:'synthetic-concil'} };
 const payment={id:'pay_synthetic',customer:'cus_synthetic',billingType:'PIX',value:147,status:'RECEIVED',originalDueDate:'2026-10-06',confirmedDate:'2026-10-06',pixTransaction:TX};
 return {order,auth,payment};
}
function harness(t, options={}) {
 const f=fixture(); Object.assign(f.auth,options.auth); Object.assign(f.payment,options.payment);
 const state={...f,posts:0,records:[],reviews:[],calls:[],instruction:options.instruction || null,claimOnce:options.creating === true,timeout:options.timeout};
 if(options.creating) { Object.assign(state.order,{status:'creating',provider_customer_id:null,provider_pix_authorization_id:null,request_key:buyer.idempotencyKey,lease_until:new Date(Date.now()+120000).toISOString()}); }
 const original=global.fetch;t.after(()=>{global.fetch=original;});
 global.fetch=async(input,init={})=>{
  const u=new URL(input);state.calls.push(`${init.method || 'GET'} ${u.pathname}${u.search}`);const body=init.body?JSON.parse(init.body):null;
  let data;
  if(u.hostname==='db.example.invalid') {
   if(u.pathname.endsWith('/claim_community_order')) {
    if(state.claimOnce) {state.order.request_hash=body.p_order.request_hash;state.order.sold_snapshot={...state.order.sold_snapshot,...Object.fromEntries(['price_mode','offer_key','offer_version','contract_total_cents','installment_count','currency'].map(k=>[k,body.p_order[k]]))};state.claimOnce=false;data={claimed:true,order:state.order};}
    else data={claimed:false,order:state.order};
   } else if(u.pathname.endsWith('/finish_community_order')) {Object.assign(state.order,body.p_result);data=state.order;}
   else if(u.pathname.endsWith('/cobranca_pedidos')) data=[state.order];
   else if(u.pathname.endsWith('/cobranca_assinaturas') || u.pathname.endsWith('/cobranca_pagamentos')) data=[];
   else if(u.pathname.endsWith('/record_community_financial_review')) {state.reviews.push(body.p_review);data={contract_version:1,review_id:AUTH,state:'pending'};}
   else if(u.pathname.endsWith('/record_community_payment')) {state.records.push(body.p_payment);data={contract_version:1,activation_id:AUTH,subscription_id:TX,payment_id:INSTRUCTION,products:['os','club'],period_start:body.p_payment.period_start,period_end:body.p_payment.period_end};}
   else throw new Error(`Unexpected DB ${u.pathname}`);
  } else if(u.pathname==='/v3/pix/automatic/authorizations' && init.method==='POST') {
   state.posts++;assert.equal(body.contractId,state.auth.contractId);assert.equal(body.customerId,state.auth.customerId);assert.equal(body.paymentCreationMode,'SUBSCRIPTION');assert.equal(body.retryPolicy,'NOT_ALLOWED');assert.equal(body.frequency,'MONTHLY');assert.equal(body.value,147);assert.deepEqual(body.immediateQrCode,{expirationSeconds:1800,originalValue:147});
   if(state.timeout) throw new Error('synthetic timeout');data=state.auth;
  } else if(u.pathname==='/v3/pix/automatic/authorizations') data={data:state.timeout ? []:[state.auth],hasMore:false};
  else if(u.pathname===`/v3/pix/automatic/authorizations/${AUTH}`) data=state.auth;
  else if(u.pathname==='/v3/customers') data={data:[{id:'cus_synthetic',cpfCnpj:buyer.cpfCnpj,email:buyer.email}],hasMore:false};
  else if(u.pathname==='/v3/customers/cus_synthetic') data={id:'cus_synthetic',email:buyer.email};
  else if(u.pathname==='/v3/payments') data={data:options.noPayment ? []:[state.payment],hasMore:false};
  else if(u.pathname==='/v3/payments/pay_synthetic') data=state.payment;
  else if(u.pathname===`/v3/pix/transactions/${TX}`) data={id:TX,payment:'pay_synthetic',type:'CREDIT',status:'DONE',value:147,conciliationIdentifier:options.invalidTx ? 'wrong-concil':state.auth.immediateQrCode.conciliationIdentifier};
  else if(u.pathname==='/v3/pix/automatic/paymentInstructions') data={data:state.instruction?[state.instruction]:[],hasMore:false};
  else if(u.pathname===`/v3/pix/automatic/paymentInstructions/${INSTRUCTION}`) data=state.instruction;
  else throw new Error(`Unexpected provider ${u.pathname}`);
  return Response.json(data);
 };
 return state;
}
test('monthly explicit flag only; all legacy choices retain modes and fingerprints',async()=>{
 const m=await load('_community-orders.js');
 for(const plan of ['mensal','trimestral','anual']) for(const method of ['PIX','CREDIT_CARD']) {
  const b={...buyer,plan,paymentMethod:method,installments:undefined};const s=m.communitySelection(b);
  assert.equal(s.priceMode,plan==='mensal'&&method==='PIX'?'recurring_pix_auto':method==='PIX'?'pix':plan==='mensal'?'recurring_card':'installment_card');
 }
 const config=m.communityConfig(env);const a=await m.communityIntent(config,buyer),b=await m.communityIntent(config,{...buyer,pixAutomatic:false});assert.notEqual(a.request_hash,b.request_hash);
 assert.equal((await m.communityIntent(config,{...buyer,pixAutomatic:'true'})).request_hash,b.request_hash);
});
test('startup creates exactly one authorization; double click reuses QR and opaque nonfinancial identity',async t=>{
 const h=harness(t,{creating:true,noPayment:true});const m=await load('_community-orders.js');const p=await load('_community-payments.js');
 await m.createCommunityOrder(env,buyer);await m.createCommunityOrder(env,buyer);
 const status=await p.communityOrderStatus(m.communityConfig(env),h.order);
 assert.equal(h.posts,1);assert.equal(status.paymentId,`auto_${AUTH}`);assert.equal(status.authorizationId,AUTH);assert.equal(status.pixAutomatic,true);assert.equal(status.paid,false);assert.equal(status.pix.copyPaste,'synthetic-qr');assert.equal(status.invoiceUrl,undefined);assert.equal(h.order.provider_subscription_id,null);assert.equal(h.records.length,0);
});
test('timeout reconciliation never issues a second authorization POST even after complete empty list',async t=>{
 const h=harness(t,{creating:true,timeout:true,noPayment:true});const m=await load('_community-orders.js');
 await m.createCommunityOrder(env,buyer);await m.createCommunityOrder(env,buyer);
 assert.equal(h.posts,1);assert.equal(h.order.status,'uncertain');assert.equal(h.order.provider_customer_id,'cus_synthetic');
 h.timeout=false;await m.createCommunityOrder(env,buyer);assert.equal(h.order.status,'created');assert.equal(h.posts,1);
});
test('verified authorization rejects a wrong customer or QR binding',async t=>{
 const h=harness(t,{noPayment:true});const m=await load('_community-orders.js'),a=await load('_pix-automatic.js');
 await assert.rejects(a.verifyPixAutomaticAuthorization(m.communityConfig(env),h.order,{...h.auth,customerId:'cus_other'}));
 await assert.rejects(a.verifyPixAutomaticAuthorization(m.communityConfig(env),h.order,{...h.auth,immediateQrCode:{}}));
});
test('initial month is financial independently of REFUSED consent and absent generated subscription',async t=>{
 const h=harness(t,{auth:{status:'REFUSED'}});const m=await load('_community-orders.js'),p=await load('_community-payments.js');
 const result=await p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment);
 assert.equal(result.paid,true);assert.equal(h.records[0].provider_pix_authorization_id,AUTH);assert.equal(h.records[0].provider_subscription_id,null);assert.equal(h.records[0].competence_key,`pixauto:${AUTH}:2026-10-06`);assert.equal(h.records[0].order_id,`${ORDER}:2026-10-06`);assert.equal(h.records[0].period_end,'2026-11-06T00:00:00.000Z');
});
test('invalid first transaction binding does not record a paid month',async t=>{
 const h=harness(t,{invalidTx:true});const m=await load('_community-orders.js'),p=await load('_community-payments.js');
 await assert.rejects(p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment));assert.equal(h.records.length,0);
});
test('renewal proof ignores externalReference inheritance and repeats a stable monthly competence',async t=>{
 const instruction={id:INSTRUCTION,paymentId:'pay_synthetic',authorization:{id:AUTH,customerId:'cus_synthetic'},dueDate:'2026-11-06',status:'DONE'};
 const h=harness(t,{instruction,auth:{status:'ACTIVE',subscriptionId:'sub_generated'},payment:{pixTransaction:null,subscription:'sub_generated',externalReference:'provider-generated',originalDueDate:'2026-11-06'}});
 const m=await load('_community-orders.js'),p=await load('_community-payments.js');
 await p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment);await p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment);
 assert.equal(h.records[0].competence_key,`pixauto:${AUTH}:2026-11-06`);assert.equal(h.records[1].competence_key,h.records[0].competence_key);assert.equal(h.records[0].provider_subscription_id,null);
 h.instruction.authorization.id=TX;await assert.rejects(p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment));
 h.instruction.authorization.id=AUTH;h.payment.subscription='sub_wrong';await assert.rejects(p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment));
});
test('invalid recurring competence date fails before financial mutation',async t=>{
 const h=harness(t,{payment:{originalDueDate:'2026-02-30'}});const m=await load('_community-orders.js'),p=await load('_community-payments.js');
 await assert.rejects(p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment));assert.equal(h.records.length,0);
});
test('cancelled authorization with no payment returns no QR, paid proof or manual Pix fallback',async t=>{
 const h=harness(t,{noPayment:true,auth:{status:'CANCELLED'}});const m=await load('_community-orders.js'),p=await load('_community-payments.js');const r=await p.communityOrderStatus(m.communityConfig(env),h.order);
 assert.equal(r.paid,false);assert.equal(r.pix,undefined);assert.equal(r.status,'CANCELLED');assert.equal(r.pixAutomaticAuthorizationStatus,'CANCELLED');assert.equal(h.posts,0);
});
test('auto opaque status dispatch never queries a fake payment',async t=>{
 const h=harness(t,{noPayment:true});const route=await load('status.js');const r=await route.onRequestGet({env,request:new Request(`https://site.example.invalid/api/checkout/status?gateway=asaas&paymentId=auto_${AUTH}`)});
 assert.equal(r.status,200);assert.equal((await r.json()).pixAutomatic,true);assert.equal(h.calls.some(v=>v.includes('/payments/auto_')),false);
});
test('authorization webhook requires signature before GET and reads order only from verified contract',async t=>{
 const h=harness(t,{noPayment:true});const route=await load('webhook.js');
 const request=token=>new Request('https://site.example.invalid/api/checkout/webhook',{method:'POST',headers:{'content-type':'application/json',...(token?{'asaas-access-token':token}:{})},body:JSON.stringify({event:'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CREATED',authorization:{id:AUTH,contractId:'untrusted'}})});
 assert.equal((await route.onRequestPost({env,request:request(null)})).status,401);assert.equal(h.calls.length,0);
 const r=await route.onRequestPost({env,request:request('synthetic-hook')});assert.equal(r.status,200);assert.equal((await r.json()).checkoutOrderId,ORDER);
});
test('instruction lookup resolves its verified authorization without inherited references',async t=>{
 const instruction={id:INSTRUCTION,paymentId:'pay_synthetic',authorization:{id:AUTH,customerId:'cus_synthetic'},dueDate:'2026-11-06',status:'DONE'};
 const h=harness(t,{instruction,payment:{externalReference:'provider-generated'}});const m=await load('_community-orders.js'),a=await load('_pix-automatic.js');
 assert.equal((await a.resolvePixAutomaticPayment(m.communityConfig(env),h.payment)).id,ORDER);
 h.instruction.paymentId='pay_wrong';await assert.rejects(a.resolvePixAutomaticPayment(m.communityConfig(env),h.payment));
});
test('initial payment resolves by exact transaction conciliation and customer restricted scan',async t=>{
 const h=harness(t);const m=await load('_community-orders.js'),a=await load('_pix-automatic.js');
 assert.equal((await a.resolvePixAutomaticPayment(m.communityConfig(env),h.payment)).id,ORDER);
 const query=h.calls.find(c=>c.includes('provider_customer_id='));assert.ok(query.includes('cus_synthetic'));assert.ok(query.includes('limit=51'));assert.equal(query.includes('147'),false);
});
test('missing verified authorization QR is recoverable and never becomes a manual payment',async t=>{
 const h=harness(t,{noPayment:true,auth:{payload:null,encodedImage:null}});const m=await load('_community-orders.js'),p=await load('_community-payments.js');const r=await p.communityOrderStatus(m.communityConfig(env),h.order);
 assert.equal(r.pix,undefined);assert.equal(r.pixPending,true);assert.equal(r.paid,false);assert.equal(h.posts,0);assert.equal(h.calls.some(c=>c.includes('/pixQrCode')),false);
});
test('authorization mismatch cannot be converted to hosted URL or paid status',async t=>{
 const h=harness(t,{noPayment:true,auth:{contractId:'f'.repeat(32)}});const m=await load('_community-orders.js'),p=await load('_community-payments.js');
 await assert.rejects(p.communityOrderStatus(m.communityConfig(env),h.order));assert.equal(h.records.length,0);
});

test('paid first month exposes REFUSED consent and never claims an active recurrence',async t=>{
 const h=harness(t,{auth:{status:'REFUSED'}});const m=await load('_community-orders.js'),p=await load('_community-payments.js');
 const r=await p.communityOrderStatus(m.communityConfig(env),h.order);assert.equal(r.paid,true);assert.equal(r.pixAutomaticAuthorizationStatus,'REFUSED');assert.equal(r.subscriptionId,undefined);assert.equal(h.order.provider_subscription_id,null);
});

test('verified partial refund retains manual financial review without a paid month',async t=>{
 const h=harness(t,{payment:{refunds:[{status:'DONE',value:10}],subscription:'sub_generated'},auth:{subscriptionId:'sub_generated'}});
 const m=await load('_community-orders.js'),p=await load('_community-payments.js');
 const r=await p.recordCommunityPayment(m.communityConfig(env),h.order,h.payment);
 assert.equal(r.paid,false);assert.equal(r.fulfillment,'manual_financial_review');assert.equal(h.records.length,0);assert.equal(h.reviews.length,1);assert.equal(h.reviews[0].provider_subscription_id,null);
});
