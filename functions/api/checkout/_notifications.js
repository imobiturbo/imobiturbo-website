// functions/api/checkout/_notifications.js
// Disparo pós-compra unificado para Comunidade Imobiturbo (LP /vagas)
// 1. E-mail Único Completo via Resend (Central de 4 Acessos)
// 2. WhatsApp Oficial via Meta Cloud API (Template status_confirmado_120626)
// 3. Sincronização automática no Sites Imobiturbo (Cloudflare D1)

const FALLBACK_RESEND_KEY_ENC = "cmVfVXRFSnBRVTFfQlBKUWVXdWNkQnM3OWl5eFVOY0FCOWUy";
const DEFAULT_RESEND_FROM = "Imobiturbo Comunidade <noreply@imobiturbo.com.br>";

const DEFAULT_META_PHONE_NUMBER_ID = "1066935829837217";
const FALLBACK_META_TOKEN_ENC =
  "RUFBUHNkYWgzM1g0QlNGbjIxSTRoSWlVNDQ0R3pKbjdzT3l4RWhXTlk1b0lkOGZWaDhvajdCUUZYRmM3cmpLMDFNb2w5cVZlcjBMQWE3WGRWdmdaQU95QTVCU3BibWJveVJnclNkZnpCMjc0OEFxeXY2Z0x0QjhOV3JKOW9nSXdNY24wNG9zdE5hNWFaQmNpaHE1WkFUdTF0WkNmSjF2MjduWTBkRk1lNkNqUTNUcG5iWkFmcmZCNWZlc2lmY3lRWkRaRA==";
const DEFAULT_META_GRAPH_VERSION = "v22.0";
const DEFAULT_TEMPLATE_NAME = "status_confirmado_120626";

function decodeSecret(b64) {
  try {
    if (typeof atob === "function") return atob(b64);
    if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return "";
  }
  return "";
}

function cleanPhoneNumber(ph) {
  if (!ph || typeof ph !== "string") return "";
  const digits = ph.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
}

function extractFirstName(name) {
  if (!name || typeof name !== "string") return "Membro";
  const trimmed = name.trim();
  if (!trimmed) return "Membro";
  const first = trimmed.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function formatPostPurchaseEmail({ name, email, plan = "anual" }) {
  const firstName = extractFirstName(name);
  const planDisplay = plan === "trimestral" ? "Trimestral" : plan === "mensal" ? "Mensal" : "Anual";
  const safeEmail = (email || "").trim().toLowerCase();

  const subject = `🎉 Sua vaga na Comunidade Imobiturbo está confirmada! Aqui estão seus 4 acessos`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAF9;
      margin: 0;
      padding: 32px 16px;
      color: #10130C;
    }
    .wrapper {
      max-width: 620px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      border: 1px solid #E5E7EB;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    .header {
      background: #0A0A0A;
      padding: 36px 32px 32px;
      text-align: center;
      border-bottom: 3px solid #6CA438;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #17250A;
      border: 1px solid #6CA438;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: #C5FF5E;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .header-title {
      font-size: 24px;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0 0 8px;
      letter-spacing: -0.02em;
    }
    .header-sub {
      font-size: 14px;
      color: #A3A3A3;
      margin: 0;
    }
    .content {
      padding: 36px 32px;
    }
    .intro {
      font-size: 16px;
      line-height: 1.6;
      color: #262626;
      margin: 0 0 28px;
    }
    .access-card {
      background: #FFFFFF;
      border: 1.5px solid #E5E7EB;
      border-radius: 14px;
      padding: 22px 20px;
      margin-bottom: 20px;
      transition: border-color 0.2s;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .card-icon {
      font-size: 20px;
      line-height: 1;
    }
    .card-title {
      font-size: 17px;
      font-weight: 800;
      color: #0A0A0A;
      margin: 0;
    }
    .card-desc {
      font-size: 14px;
      line-height: 1.55;
      color: #525252;
      margin: 0 0 14px;
    }
    .btn {
      display: inline-block;
      background: #10130C;
      color: #C5FF5E !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      padding: 10px 18px;
      border-radius: 8px;
      letter-spacing: 0.01em;
    }
    .badge-highlight {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      color: #166534;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: #F0F0F0;
      margin: 32px 0;
    }
    .footer {
      background: #FAFAFA;
      padding: 24px 32px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 12px;
      color: #737373;
      line-height: 1.6;
    }
    .footer a {
      color: #6CA438;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">Inscrição Confirmada · Plano ${planDisplay}</div>
      <h1 class="header-title">Bem-vindo(a) à Comunidade Imobiturbo!</h1>
      <p class="header-sub">Aqui está sua central definitiva com todos os seus 4 acessos liberados.</p>
    </div>

    <div class="content">
      <p class="intro">
        Olá, <strong>${firstName}</strong>! Parabéns pela decisão.<br>
        Sua vaga na Comunidade Imobiturbo está oficialmente ativa. 
        Guarde este e-mail nos seus favoritos para consultar seus acessos e ferramentas sempre que precisar.
      </p>

      <!-- ACESSO 1: COMUNIDADE & CLUBE -->
      <div class="access-card" style="border-left: 4px solid #6CA438;">
        <div class="card-header">
          <span class="card-icon">1️⃣</span>
          <h3 class="card-title">Comunidade & Área de Membros (Clube)</h3>
        </div>
        <div class="badge-highlight">
          🗓️ Encontros ao Vivo: 1 reunião por semana da Comunidade
        </div>
        <p class="card-desc">
          Acesso completo às aulas gravadas, esteiras de vendas e comunidade exclusiva de corretores e imobiliárias.
          Nosso encontro ao vivo acontece <strong>1 vez por semana</strong> com tira-dúvidas e alinhamento de campanhas.
        </p>
        <a href="https://hub.imobiturbo.com.br" class="btn" target="_blank">Acessar Área de Membros & Comunidade →</a>
      </div>

      <!-- ACESSO 2: RADAR DE DEMANDA -->
      <div class="access-card" style="border-left: 4px solid #3B82F6;">
        <div class="card-header">
          <span class="card-icon">2️⃣</span>
          <h3 class="card-title">Radar de Demanda Imobiliária</h3>
        </div>
        <p class="card-desc">
          Ferramenta exclusiva para minerar condomínios, proprietários e buscas em tempo real em todas as capitais do Brasil.
          Seu acesso VIP com chave de liberação já está aplicado:
        </p>
        <a href="https://radar.imobiturbo.com.br/?token=IMOBICLUB2026" class="btn" target="_blank" style="background: #1E3A8A; color: #FFFFFF !important;">
          Entrar no Radar de Demanda (Acesso Liberado) →
        </a>
      </div>

      <!-- ACESSO 3: SITES IMOBITURBO -->
      <div class="access-card" style="border-left: 4px solid #10B981;">
        <div class="card-header">
          <span class="card-icon">3️⃣</span>
          <h3 class="card-title">Criador de Sites Imobiliários (12 Templates)</h3>
        </div>
        <p class="card-desc">
          Plataforma para colocar landing pages de imóveis no ar em menos de 3 minutos.
          <br><br>
          🔑 <strong>Como acessar:</strong><br>
          Acesse o link abaixo e digite exatamente o seu e-mail cadastrado na compra (<strong>${safeEmail}</strong>).
          Você receberá um código de 6 dígitos instantâneo na sua caixa de entrada para entrar sem precisar criar senha.
        </p>
        <a href="https://sites.imobiturbo.com.br/" class="btn" target="_blank" style="background: #064E3B; color: #6EE7B7 !important;">
          Acessar Gerador de Sites →
        </a>
      </div>

      <!-- ACESSO 4: CRM COM IA -->
      <div class="access-card" style="border-left: 4px solid #8B5CF6;">
        <div class="card-header">
          <span class="card-icon">4️⃣</span>
          <h3 class="card-title">CRM com IA (Imobiturbo OS)</h3>
        </div>
        <p class="card-desc">
          Seu sistema operacional com IA para atendimento automático e triagem de leads no WhatsApp.
          Inicie seu setup e conexão:
        </p>
        <a href="https://app.imobiturbo.com.br/onboarding" class="btn" target="_blank" style="background: #4C1D95; color: #DDD6FE !important;">
          Iniciar Configuração do CRM →
        </a>
      </div>

      <div class="divider"></div>

      <div style="background: #F9FAFB; border-radius: 12px; padding: 18px 20px; text-align: center;">
        <h4 style="margin: 0 0 6px; font-size: 15px; color: #0A0A0A;">Precisa de Ajuda ou Suporte?</h4>
        <p style="margin: 0 0 12px; font-size: 13px; color: #525252;">
          Nosso time oficial de suporte está à sua disposição no WhatsApp para tirar dúvidas.
        </p>
        <a href="https://wa.me/5521983747796" style="color: #6CA438; font-weight: 700; text-decoration: none; font-size: 14px;">
          Falar com Suporte Oficial: (21) 98374-7796 →
        </a>
      </div>
    </div>

    <div class="footer">
      © 2026 Imobiturbo Tecnologia & Soluções Imobiliárias Ltda.<br>
      E-mail cadastrado: ${safeEmail}
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Bem-vindo(a) à Comunidade Imobiturbo!

Olá, ${firstName}!
Sua vaga na Comunidade Imobiturbo está oficialmente ativa (Plano ${planDisplay}).

Aqui estão seus 4 acessos liberados:

1. COMUNIDADE & CLUBE (ÁREA DE MEMBROS)
- Encontros ao Vivo: 1 reunião por semana da Comunidade (alinhamento e dúvidas)
- Acesso: https://hub.imobiturbo.com.br

2. RADAR DE DEMANDA IMOBILIÁRIA
- Mineração de imóveis, proprietários e compradores liberada
- Acesso direto com token: https://radar.imobiturbo.com.br/?token=IMOBICLUB2026

3. CRIADOR DE SITES IMOBILIÁRIOS (12 TEMPLATES)
- Crie landing pages em minutos
- Acesso: https://sites.imobiturbo.com.br/
- Como entrar: Digite seu e-mail (${safeEmail}) para receber o código OTP de 6 dígitos

4. CRM COM IA (IMOBITURBO OS)
- Configuração do sistema operacional com IA: https://app.imobiturbo.com.br/onboarding

Suporte Oficial no WhatsApp: (21) 98374-7796 ou https://wa.me/5521983747796
  `.trim();

  return { subject, html, text };
}

function formatPostPurchaseWhatsApp({ name, email, phone, plan = "anual" }) {
  const firstName = extractFirstName(name);
  const safePhone = cleanPhoneNumber(phone);
  const safeEmail = (email || "").trim().toLowerCase();

  const param1 = "sua vaga na Comunidade Imobiturbo foi confirmada com";

  const param2 = `Olá, ${firstName}! Seja muito bem-vindo(a) à Comunidade Imobiturbo.

Seus 4 acessos já foram liberados:

1️⃣ *Comunidade & Clube:* Área de membros liberada + 1 encontro ao vivo por semana exclusivo da Comunidade (o link e dia da nossa reunião semanal estão no seu e-mail).
2️⃣ *Radar de Demanda:* Mineração de condomínios e clientes liberada pelo link abaixo.
3️⃣ *Criador de Sites:* 12 templates prontos (acesse sites.imobiturbo.com.br e digite seu e-mail para receber o código de 6 dígitos).
4️⃣ *CRM com IA:* Sistema operacional pronto para ativação.

📬 *Importante:* Acabamos de enviar um e-mail completo para ${safeEmail} com todos os seus links diretos e orientações detalhadas. Confira sua caixa de entrada e spam!`;

  const param3 = "https://radar.imobiturbo.com.br/?token=IMOBICLUB2026";

  return {
    messaging_product: "whatsapp",
    to: safePhone,
    type: "template",
    template: {
      name: DEFAULT_TEMPLATE_NAME,
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: param1 },
            { type: "text", text: param2 },
            { type: "text", text: param3 },
          ],
        },
      ],
    },
  };
}

async function sendPostPurchaseNotifications({
  email,
  name,
  phone,
  plan = "anual",
  paymentId,
  env = {},
  fetchFn = fetch,
}) {
  const resendApiKey = (env && env.RESEND_API_KEY) || decodeSecret(FALLBACK_RESEND_KEY_ENC);
  const resendFrom = (env && env.RESEND_FROM_EMAIL) || DEFAULT_RESEND_FROM;

  const metaPhoneId = (env && env.META_PHONE_NUMBER_ID) || DEFAULT_META_PHONE_NUMBER_ID;
  const metaToken = (env && env.META_WHATSAPP_TOKEN) || decodeSecret(FALLBACK_META_TOKEN_ENC);
  const metaVersion = (env && env.META_GRAPH_VERSION) || DEFAULT_META_GRAPH_VERSION;

  const errors = [];
  let emailSent = false;
  let whatsappSent = false;
  let sitesSynced = false;

  const safeEmail = (email || "").trim().toLowerCase();
  const safePhone = cleanPhoneNumber(phone);

  // 1. Envio do E-mail Completo via Resend
  if (safeEmail && resendApiKey) {
    try {
      const emailPayload = formatPostPurchaseEmail({ name, email: safeEmail, plan });
      const emailResp = await fetchFn("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [safeEmail],
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text,
        }),
        signal: AbortSignal.timeout(6000),
      });
      const emailJson = await emailResp.json().catch(() => ({}));
      if (emailResp.ok && emailJson.id) {
        emailSent = true;
      } else {
        errors.push(`Resend error: ${JSON.stringify(emailJson)}`);
      }
    } catch (err) {
      errors.push(`Resend exception: ${err.message}`);
    }
  }

  // 2. Envio do WhatsApp Oficial via Meta Cloud API
  if (safePhone && metaToken && metaPhoneId) {
    try {
      const waPayload = formatPostPurchaseWhatsApp({ name, email: safeEmail, phone: safePhone, plan });
      const metaResp = await fetchFn(
        `https://graph.facebook.com/${metaVersion}/${metaPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(waPayload),
          signal: AbortSignal.timeout(6000),
        }
      );
      const metaJson = await metaResp.json().catch(() => ({}));
      if (metaResp.ok && metaJson.messages) {
        whatsappSent = true;
      } else {
        errors.push(`Meta WhatsApp error: ${JSON.stringify(metaJson)}`);
      }
    } catch (err) {
      errors.push(`Meta WhatsApp exception: ${err.message}`);
    }
  }

  // 3. Sincronização automática no banco D1 do Sites Imobiturbo
  if (safeEmail) {
    try {
      const sitesResp = await fetchFn("https://sites.imobiturbo.com.br/api/webhook/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: safeEmail, nome: name, telefone: safePhone }),
        signal: AbortSignal.timeout(5000),
      });
      const sitesJson = await sitesResp.json().catch(() => ({}));
      if (sitesResp.ok && sitesJson.ok) {
        sitesSynced = true;
      } else {
        errors.push(`Sites sync error: ${JSON.stringify(sitesJson)}`);
      }
    } catch (err) {
      errors.push(`Sites sync exception: ${err.message}`);
    }
  }

  return {
    emailSent,
    whatsappSent,
    sitesSynced,
    errors: errors.length > 0 ? errors : undefined,
  };
}

module.exports = {
  formatPostPurchaseEmail,
  formatPostPurchaseWhatsApp,
  sendPostPurchaseNotifications,
  cleanPhoneNumber,
  extractFirstName,
};
