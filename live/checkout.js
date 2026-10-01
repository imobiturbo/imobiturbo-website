(() => {
  const get=id=>document.getElementById(id), key='imobiturbo-live997-payment';
  let order=null, checking=false;
  try { order=JSON.parse(localStorage.getItem(key)); } catch (_) {}
  const feedback=text=>{get('feedback').textContent=text;};
  function showPending(){get('checkout').hidden=true;get('pending').hidden=false;get('invoice').href=order.invoiceUrl;feedback('Seu pagamento de R$997 está aguardando confirmação.');}
  async function check(){
    if(!order || checking)return;checking=true;
    try {
      const response=await fetch('/api/checkout/status?gateway=asaas&paymentId='+encodeURIComponent(order.paymentId));
      const status=await response.json();
      if(status.success && status.paid && status.offerCode==='live997' && status.amount===997){
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
    try {
      const response=await fetch('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.target)))});
      const result=await response.json();
      if(!response.ok || !result.success)throw new Error(result.error || 'Falha ao abrir pagamento.');
      order={paymentId:result.paymentId,invoiceUrl:result.invoiceUrl};
      try{localStorage.setItem(key,JSON.stringify(order));}catch(_){}
      showPending();window.open(order.invoiceUrl,'_blank','noopener');
    }catch(error){feedback(error.message);}finally{get('submit').disabled=false;}
  });
  get('check').addEventListener('click',check);
  if(order?.paymentId && order?.invoiceUrl){showPending();check();}
  setInterval(()=>{if(!get('confirmed').hidden)return;check();},7000);
})();
