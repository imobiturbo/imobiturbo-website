(() => {
  const API='https://www.imobiturbo.com.br';
  // O Hub envia PageView automaticamente e roteia as conversões ao Pixel configurado.
  // Tracking atrasado ou bloqueado nunca impede a abertura do pagamento.
  const trackingQueue=[];
  let trackingAttempts=0, trackingTimer=false;
  function flushTracking(){
    trackingTimer=false;
    try {
      const tracker=window.HubTracker;
      if(tracker?.config().enabled===true){
        while(trackingQueue.length){
          const [type,payload]=trackingQueue[0];
          if(tracker.track(type,payload)===false)break;
          trackingQueue.shift();
        }
      }
    }catch(_){}
    if(trackingQueue.length && trackingAttempts++<120){trackingTimer=true;setTimeout(flushTracking,250);}
  }
  function track(type,extra={}){
    try {
      trackingQueue.push([type,{productId:'comunidade-imobiturbo',offerId:'4242c673-131d-4fb2-b297-8e6a5f155133',offer_code:'live997',currency:'BRL',...extra}]);
      if(!trackingTimer){trackingAttempts=0;flushTracking();}
    }catch(_){}
  }
  async function readResponse(response){
    if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('Não foi possível abrir o pagamento. Recarregue a página e tente novamente.');
    return response.json();
  }
  const get=id=>document.getElementById(id), key='imobiturbo-live997-payment';
  let order=null, checking=false;
  try { order=JSON.parse(localStorage.getItem(key)); } catch (_) {}
  const feedback=text=>{get('feedback').textContent=text;};
  function showPending(){get('checkout').hidden=true;get('pending').hidden=false;get('invoice').href=order.invoiceUrl;get('invoice').textContent=order.amount===1196.4?'Pagar no Asaas — 12x de R$99,70':'Pagar no Asaas — R$997 à vista';feedback('Pagamento aguardando confirmação.');}
  async function check(){
    if(!order || checking)return;checking=true;
    try {
      const response=await fetch(API+'/api/checkout/status?gateway=asaas&paymentId='+encodeURIComponent(order.paymentId));
      const status=await readResponse(response);
      if(status.success && status.paid && status.offerCode==='live997' && [997,1196.4].includes(status.amount)){
        get('pending').hidden=true;get('checkout').hidden=true;get('confirmed').hidden=false;
        get('booking').href='https://agenda.imobiturbo.com.br/natanpimentel/live-997-consultoria-incluida-20261001';
        feedback('Compra confirmada. Seu combo anual e sua consultoria estão incluídos.');
      } else if(status.success && status.deleted){order=null;localStorage.removeItem(key);get('pending').hidden=true;get('checkout').hidden=false;feedback('Cobrança cancelada. Você pode iniciar um novo pagamento.');}
      else feedback('Aguardando confirmação do pagamento.');
    }catch(_){feedback('Não foi possível verificar agora. Seu pagamento foi preservado; tente novamente.');}
    finally{checking=false;}
  }
  get('checkout').addEventListener('submit',async event=>{
    event.preventDefault();get('submit').disabled=true;feedback('Preparando seu pagamento seguro…');
    const paymentOption=get('paymentOption').value;
    track('InitiateCheckout',{value:paymentOption==='12x'?1196.4:997,paymentMethod:paymentOption==='12x'?'CREDIT_CARD':'PIX',installmentCount:paymentOption==='12x'?12:1});
    try {
      const response=await fetch(API+'/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.target)))});
      const result=await readResponse(response);
      if(!response.ok || !result.success)throw new Error(result.error || 'Falha ao abrir pagamento.');
      order={paymentId:result.paymentId,invoiceUrl:result.invoiceUrl,amount:result.amount};
      try{localStorage.setItem(key,JSON.stringify(order));}catch(_){}
      track('checkout_created',{value:order.amount});
      showPending();window.location.assign(order.invoiceUrl);
    }catch(error){track('checkout_error',{stage:'create_payment'});feedback(error.message);}finally{get('submit').disabled=false;}
  });
  let formStarted=false;
  get('checkout').addEventListener('input',()=>{if(!formStarted){formStarted=true;track('form_start');}});
  get('check').addEventListener('click',check);
  if(order?.paymentId && order?.invoiceUrl){showPending();check();}
  setInterval(()=>{if(!get('confirmed').hidden)return;check();},7000);
})();
