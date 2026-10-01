const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');

function browser(tracker) {
  const elements = Object.fromEntries(['checkout','submit','feedback','pending','invoice','check','confirmed','booking','paymentOption'].map(id => [id, {hidden:true, value:'avista', listeners:{}, addEventListener(type, fn){this.listeners[type]=fn;}}]));
  const timers=[], calls=[];
  const window={HubTracker:tracker, location:{assign(){}}};
  const context={window, document:{getElementById:id=>elements[id]}, localStorage:{getItem:()=>null}, setInterval:()=>0, setTimeout:fn=>timers.push(fn), FormData:class{*[Symbol.iterator](){yield ['paymentOption',elements.paymentOption.value];}}, fetch:async(url,options)=>{calls.push({url,options});return {ok:false,headers:{get:()=> 'application/json'},json:async()=>({error:'Falha simulada'})};}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'live/checkout.js'),'utf8'),context);
  return {elements,timers,calls,window, submit:()=>elements.checkout.listeners.submit({preventDefault(){},target:elements.checkout})};
}

test('live instala o Hub com oferta, produto e operação da Comunidade',()=>{
  const html=fs.readFileSync(path.join(root,'live/index.html'),'utf8');
  assert.match(html,/id="hub-tracker"/);
  assert.match(html,/data-offer-id="4242c673-131d-4fb2-b297-8e6a5f155133"/);
  assert.match(html,/data-product-id="comunidade-imobiturbo"/);
});

test('checkout envia InitiateCheckout sem dados pessoais nos dois valores',async()=>{
  for(const [option,value] of [['avista',997],['12x',1196.4]]){
    const events=[];
    const b=browser({config:()=>({enabled:true}),track:(type,payload)=>{events.push({type,payload});return true;}});
    b.elements.paymentOption.value=option;
    await b.submit();
    const e=events.find(e=>e.type==='InitiateCheckout');
    assert.ok(e);assert.equal(e.payload.value,value);assert.equal(e.payload.currency,'BRL');assert.equal(e.payload.offer_code,'live997');
    assert.equal('email' in e.payload,false);assert.equal('cpfCnpj' in e.payload,false);
    assert.equal(b.calls.length,1);assert.equal(b.elements.submit.disabled,false);
  }
});

test('tracker atrasado não bloqueia checkout e recebe o evento quando fica pronto',async()=>{
  const b=browser();await b.submit();assert.equal(b.calls.length,1);
  const events=[];b.window.HubTracker={config:()=>({enabled:true}),track:(type)=>{events.push(type);return true;}};
  for(const timer of b.timers.splice(0))timer();
  assert.equal(events.filter(type=>type==='InitiateCheckout').length,1);
});

test('falha do tracker preserva pagamento e reabilita o botão',async()=>{
  const b=browser({config:()=>{throw new Error('tracker bloqueado');}});
  await b.submit();assert.equal(b.calls.length,1);assert.equal(b.elements.submit.disabled,false);
});
