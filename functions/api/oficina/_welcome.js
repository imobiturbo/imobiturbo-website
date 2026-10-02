import { updateWelcomeState } from "./_crm.js";
import { validOficinaPayment, paymentState } from "./_shared.js";

const MATERIAL_URL = "https://imobiturbo-plano-lancamento.imobiturbo.workers.dev/downloads/carteira-exemplo.csv";
const ROOM_E1 = "https://meet.google.com/tvd-sxie-voj";
const ROOM_E2 = "https://meet.google.com/oxg-oqro-upx";
const validEmail = value => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function welcomePayload(env, verifiedEmail, paymentId) {
  const from = env.ZEPTOMAIL_FROM_EMAIL?.trim();
  if (!validEmail(from) || !validEmail(verifiedEmail)) throw new Error("oficina_welcome_address_missing");
  // Text-only content avoids interpolating buyer data into HTML. No marketing,
  // community onboarding or sensitive customer records are included.
  const textbody = [
    "Sua inscrição na Oficina Imobiturbo: do lead ao próximo passo está confirmada após identificação do pagamento.",
    "", "Encontro 1: 9 de outubro de 2026, 19h30–21h30, horário de Brasília.", ROOM_E1,
    "", "Encontro 2: 10 de outubro de 2026, 19h30–21h30, horário de Brasília.", ROOM_E2,
    "", "Material editável para preparar os cinco contatos:", MATERIAL_URL,
    "Use contatos anonimizados ou os exemplos fictícios. Não envie dados de clientes na sala.",
    "", "Replay: acesso até 24 de outubro de 2026. O suporte informará o acesso às gravações após os encontros.",
    "", "Ajuda com acesso: responda a este email ou contate " + from + ".",
    "Guarde os links das salas para seu uso individual.", "", "Equipe Imobiturbo",
  ].join("\n");
  return { from: { address: from, name: "Imobiturbo" }, to: [{ email_address: { address: verifiedEmail } }],
    reply_to: [{ address: from }], subject: "Seu acesso à Oficina Imobiturbo — 9 e 10 de outubro",
    textbody, client_reference: "oficina-welcome-" + paymentId, track_opens: false, track_clicks: false };
}

export async function dispatchOficinaWelcome({ env, payment, leadId, config, customer, trustedPaymentLinkId }) {
  if (!validOficinaPayment(payment, { ...env, OFICINA_PAYMENT_LINK_ID: trustedPaymentLinkId }) || paymentState(payment) !== "pago") return { accepted: false, status: "not_paid" };
  const verifiedEmail = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  // Only the processor-verified buyer email is eligible. CRM contact email is
  // deliberately not a recipient fallback (it may belong to another owner).
  let payload;
  try { payload = welcomePayload(env, verifiedEmail, payment.id); }
  catch { payload = null; }
  const claimId = crypto.randomUUID();
  const leaseUntil = Date.now() + 120000;
  const claim = await updateWelcomeState(env, leadId, payment.id, config, saved => {
    if (saved.welcomeMailSent || saved.welcomeDelivery?.status === "sent") return { result: "sent" };
    if (saved.state !== "pago") return { result: "not_paid" };
    if (!payload || !env.ZEPTOMAIL_API_KEY?.trim()) return { result: "not_configured" };
    const welcome = saved.welcomeDelivery;
    if (welcome?.status === "uncertain") return { result: "uncertain" };
    if (welcome?.status === "sending") {
      if (welcome.leaseUntil > Date.now()) return { result: "leased" };
      // An expired send lease may have reached ZeptoMail. Never resend blindly:
      // client_reference is correlation, not provider idempotency.
      return { patch: { welcomeDelivery: { ...welcome, status: "uncertain" } }, result: "uncertain" };
    }
    return { patch: { welcomeDelivery: { status: "sending", claimId, leaseUntil,
      attempts: (welcome?.attempts || 0) + 1, clientReference: payload.client_reference } }, result: "claimed" };
  });
  if (claim !== "claimed") return { accepted: claim === "sent", status: claim };

  let status = "uncertain", requestId;
  try {
    const key = env.ZEPTOMAIL_API_KEY.trim();
    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json",
        Authorization: /^Zoho-enczapikey\s+/i.test(key) ? key : "Zoho-enczapikey " + key },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(7000),
    });
    const receipt = await response.json();
    if (response.ok && Array.isArray(receipt.data) && receipt.data.some(item => item.code === "EM_104") &&
        typeof receipt.request_id === "string" && receipt.request_id.length > 0 && receipt.request_id.length <= 500) {
      status = "sent"; requestId = receipt.request_id;
    } else if (!response.ok && receipt.data?.error_code && response.status >= 400 && response.status < 500) {
      // A structured rejection is safe to retry after configuration is fixed.
      status = "retry";
    }
  } catch { /* Timeout/invalid response cannot prove non-acceptance. Hold for reconciliation. */ }
  const persisted = await updateWelcomeState(env, leadId, payment.id, config, saved => {
    if (saved.welcomeMailSent || saved.welcomeDelivery?.status === "sent") return { result: true };
    if (saved.welcomeDelivery?.claimId !== claimId) return { result: false };
    return { patch: { welcomeMailSent: status === "sent", welcomeDelivery: { ...saved.welcomeDelivery,
      status, ...(requestId ? { requestId, acceptedAt: new Date().toISOString() } : {}),
    } }, result: status === "sent" };
  });
  return { accepted: persisted === true, status: persisted === true ? "sent" : status };
}
