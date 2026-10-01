// Hosted Asaas checkout for the fixed live bundle; annual fulfillment handles the community.
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
export function onRequestOptions(){return new Response(null,{status:204,headers});}
export async function onRequestPost({ request, env }) {
  if (!env.ASAAS_API_KEY) return Response.json({error:'Checkout indisponível.'},{status:503,headers});
  let body;
  try { body = await request.json(); } catch { return Response.json({error:'Dados inválidos.'},{status:400,headers}); }
  const name = String(body.name || '').trim().slice(0,100);
  const email = String(body.email || '').trim().toLowerCase().slice(0,150);
  const phone = String(body.phone || '').replace(/\D/g,'').slice(0,13);
  const cpfCnpj = String(body.cpfCnpj || '').replace(/\D/g,'');
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 10 || ![11,14].includes(cpfCnpj.length)) return Response.json({error:'Preencha nome, e-mail, WhatsApp e CPF/CNPJ.'},{status:400,headers});
  const installments = body.paymentOption === '12x' ? 12 : 1;
  const providerHeaders = {access_token:env.ASAAS_API_KEY,'Content-Type':'application/json','User-Agent':'Imobiturbo-Checkout/1.0'};
  const provider = async (path, init={}) => {
    const response = await fetch('https://api.asaas.com/v3/'+path,{...init,headers:providerHeaders,signal:AbortSignal.timeout(8000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.[0]?.description || 'Não foi possível abrir o pagamento.');
    return data;
  };
  try {
    const found = await provider('customers?cpfCnpj='+encodeURIComponent(cpfCnpj)+'&limit=1');
    const existing = found.data?.[0];
    const customer = await provider(existing ? 'customers/'+encodeURIComponent(existing.id) : 'customers',{method:existing?'PUT':'POST',body:JSON.stringify({name,email,mobilePhone:phone,cpfCnpj,notificationDisabled:true})});
    const payment = await provider('payments',{method:'POST',body:JSON.stringify({customer:customer.id,billingType:installments===12?'CREDIT_CARD':'UNDEFINED',...(installments===12?{installmentCount:12,installmentValue:99.70}:{value:997}),dueDate:new Date(Date.now()+86400000).toISOString().slice(0,10),description:'Oferta da Live Imobiturbo — Comunidade Anual + CRM IA + Consultoria Individual 60min',externalReference:JSON.stringify({plan:'anual',offer_code:'live997',i:installments,eid:crypto.randomUUID().slice(0,11)}),fine:{value:0,type:'FIXED'},interest:{value:0},callback:{successUrl:'https://www.imobiturbo.com.br/live/',autoRedirect:true}})});
    if (!payment.id || !payment.invoiceUrl) throw new Error('Pagamento sem link. Entre em contato com o suporte.');
    return Response.json({success:true,paymentId:payment.id,invoiceUrl:payment.invoiceUrl,amount:installments===12?1196.40:997,installmentCount:installments},{headers});
  } catch (error) { return Response.json({error:error.message},{status:502,headers}); }
}
