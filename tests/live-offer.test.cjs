const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function load(path){return import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path,'utf8')).toString('base64'));}
test('live checkout fixes the price and annual entitlement despite buyer-supplied price/plan',async()=>{
 const {onRequestPost}=await load('functions/api/live.js');const original=global.fetch;const calls=[];
 global.fetch=async(url,init)=>{calls.push({url,init});return Response.json(url.includes('?')?{data:[]} : url.endsWith('/customers')?{id:'cus_test'}:{id:'pay_test',invoiceUrl:'https://www.asaas.com/i/test'});};
 try{const response=await onRequestPost({env:{ASAAS_API_KEY:'test'},request:new Request('https://example.com/api/live',{method:'POST',body:JSON.stringify({name:'Teste',email:'teste@example.com',phone:'21999999999',cpfCnpj:'12345678901',value:1,plan:'mensal'})})});assert.equal(response.status,200);const payment=JSON.parse(calls.at(-1).init.body);assert.equal(payment.value,997);assert.equal(payment.billingType,'PIX');assert.deepEqual(JSON.parse(payment.externalReference).plan,'anual');assert.equal(JSON.parse(payment.externalReference).offer_code,'live997');assert.ok(payment.externalReference.length<=100);}finally{global.fetch=original;}
});
test('provider-owned live metadata preserves community annual entitlement',async()=>{
 const {checkoutDetails}=await load('functions/api/checkout/_products.js');
 const live=checkoutDetails({id:'pay_live',value:997,externalReference:JSON.stringify({plan:'anual',offer_code:'live997'})});assert.equal(live.plan,'anual');assert.equal(live.productId,'comunidade-imobiturbo');assert.equal(live.offerCode,'live997');
 assert.equal(checkoutDetails({id:'ordinary',externalReference:'{"plan":"anual"}'}).offerCode,undefined);
});
test('live checkout rejects incomplete buyer information before contacting provider',async()=>{
 const {onRequestPost}=await load('functions/api/live.js');const response=await onRequestPost({env:{ASAAS_API_KEY:'test'},request:new Request('https://example.com/api/live',{method:'POST',body:'{}'})});assert.equal(response.status,400);
});
test('live purchase delivers annual access and included consultation in the welcome email',async()=>{
 const {sendPostPurchaseNotifications}=require('../functions/api/checkout/_notifications.js');const calls=[];
 const fetchFn=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return Response.json(url.includes('/rpc/')?{success:true}:{});};
 const result=await sendPostPurchaseNotifications({email:'buyer@example.com',name:'Comprador',plan:'anual',paymentId:'pay_live',amountCents:99700,purchaseProof:{approvedAt:'2026-10-01T12:00:00Z'},liveOffer:true,env:{SUPABASE_SERVICE_ROLE_KEY:'test',COMMUNITY_ORGANIZATION_ID:'org',ZEPTOMAIL_API_KEY:'test',ZEPTOMAIL_FROM_EMAIL:'sender@example.com'},fetchFn});
 assert.equal(result.crmProvisioned,true);const rpc=calls.find(call=>call.url.includes('/rpc/'));assert.equal(rpc.body.p_plan,'anual');assert.equal(rpc.body.p_amount_cents,99700);const email=calls.find(call=>call.url==='https://cpaas.zoho.com/v1.1/email');assert.ok(email.body.htmlbody.includes('live-997-consultoria-incluida-20261001'));assert.ok(email.body.textbody.includes('sem pagamento adicional'));assert.ok(email.body.htmlbody.includes('club.imobiturbo.com.br/login'));
});
test('live installments charge exactly 12 x 99.70 and all installments share one annual entitlement',async()=>{
 const {onRequestPost}=await load('functions/api/live.js');const original=global.fetch;const calls=[];
 global.fetch=async(url,init)=>{calls.push({url,init});return Response.json(url.includes('?')?{data:[]} : url.endsWith('/customers')?{id:'cus_test'}:{id:'pay_test',invoiceUrl:'https://www.asaas.com/i/test'});};
 try{const response=await onRequestPost({env:{ASAAS_API_KEY:'test'},request:new Request('https://example.com/api/live',{method:'POST',body:JSON.stringify({name:'Teste',email:'teste@example.com',phone:'21999999999',cpfCnpj:'12345678901',paymentOption:'12x'})})});assert.equal(response.status,200);const payment=JSON.parse(calls.at(-1).init.body);assert.equal(payment.installmentValue,99.7);assert.equal(payment.installmentCount,12);assert.equal(payment.value,undefined);assert.equal(payment.billingType,'CREDIT_CARD');const {checkoutDetails}=await load('functions/api/checkout/_products.js');const a=checkoutDetails({id:'pay_first',externalReference:payment.externalReference});const b=checkoutDetails({id:'pay_second',externalReference:payment.externalReference});assert.equal(a.orderAmount,1196.4);assert.equal(a.orderId,b.orderId);assert.equal(a.plan,'anual');}finally{global.fetch=original;}
});
