// functions/api/checkout/_notifications.js
// Disparo pós-compra unificado para Comunidade Imobiturbo (LP /vagas)
// 1. Provisionamento Central no CRM / Supabase OS (/0-funil-de-vendas -> 0. Novo Lead + tags + acessos 30/90/365d)
// 2. E-mail Completo via ZeptoMail ilimitado (Club + OS + Grupo VIP no WhatsApp)
// 3. WhatsApp Oficial via Meta Cloud API (Template status_confirmado_120626 com link do Grupo VIP)
// Radar e Sites desativados operacionalmente.

const DEFAULT_ZEPTOMAIL_URL = "https://cpaas.zoho.com/v1.1/email";
const DEFAULT_ZEPTOMAIL_BOUNCE = "bounce@bounce-zem.imobiturbo.com.br";
const DEFAULT_ZEPTOMAIL_FROM_NAME = "Imobiturbo Comunidade";

const DEFAULT_SUPABASE_URL = "https://api.os.imobiturbo.com.br";

const DEFAULT_META_PHONE_NUMBER_ID = "1066935829837217";
const DEFAULT_META_GRAPH_VERSION = "v22.0";
const DEFAULT_TEMPLATE_NAME = "status_confirmado_120626";


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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function communitySummary({ products, duration_months, period_end, club_enrollment }) {
  if (![1,3,12].includes(duration_months) || !Array.isArray(products) || !products.length ||
      products.some(p => !['os','club'].includes(p)) || !Number.isFinite(Date.parse(period_end))) throw new Error('community_message_contract_invalid');
  const plan = {1:'Mensal',3:'Trimestral',12:'Anual'}[duration_months];
  const parts = [`Plano ${plan}, ${duration_months} ${duration_months === 1 ? 'mês' : 'meses'}, válido até ${new Date(period_end).toISOString().slice(0,10)}. Recursos ilimitados.`];
  if (products.includes('os')) parts.push('Imobiturbo OS: https://os.imobiturbo.com.br/login.');
  if (products.includes('club')) {
    parts.push('Imobiturbo Club: todos os cursos e trilhas de treinamento e gravações da mentoria em https://club.imobiturbo.com.br/login.');
    if (club_enrollment?.origin !== 'preexisting_verified' && club_enrollment?.protected_content_allowed !== true)
      parts.push(`Conteúdos-chave, guia completo de links/ferramentas e gravações de Hot Seats têm liberação após sete dias da nova matrícula comercial. ${club_enrollment?.protected_release_at ? 'Data prevista: '+new Date(club_enrollment.protected_release_at).toISOString().slice(0,10)+'.' : 'Consulte a data disponível no Club; a confirmação temporal está em reconciliação.'} Login e conteúdos comuns já estão disponíveis.`);
  }
  if (products.length === 2) parts.push('Grupo de Alunos: https://chat.whatsapp.com/Iy4Uiw5t0630oK4MgZarFj.');
  return parts.join(' ');
}

function formatPostPurchaseEmail({ name, email, plan = "anual", community }) {
  const firstName = extractFirstName(name);
  const planDisplay = plan === "trimestral" ? "Trimestral" : plan === "mensal" ? "Mensal" : "Anual";
  const safeEmail = (email || "").trim().toLowerCase();

  const subject = `🎉 Sua vaga na Comunidade Imobiturbo está confirmada! Aqui estão seus acessos`;

  let html = `
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
      <p class="header-sub">Aqui está sua central definitiva com seus acessos liberados.</p>
    </div>

    <div class="content">
      <p class="intro">
        Olá, <strong>${escapeHtml(firstName)}</strong>! Parabéns pela decisão.<br>
        Sua vaga na Comunidade Imobiturbo está oficialmente ativa. 
        Guarde este e-mail nos seus favoritos para consultar seus acessos e comunidade sempre que precisar.
      </p>

      <!-- ACESSO 1: COMUNIDADE & CLUBE -->
      <div class="access-card" style="border-left: 4px solid #6CA438;">
        <div class="card-header">
          <span class="card-icon">1️⃣</span>
          <h3 class="card-title">Comunidade & Área de Membros (Clube)</h3>
        </div>
        <div class="badge-highlight">
          📚 Trilhas de Treinamento & Gravações da Mentoria
        </div>
        <p class="card-desc">
          Acesso completo a todas as trilhas de treinamento, aulas práticas e a todas as <strong>gravações dos encontros da mentoria</strong>. Tudo organizado para você estudar e implementar no seu ritmo.
        </p>
        <div style="background: #F3F4F6; border-radius: 8px; padding: 10px 14px; margin: 12px 0; font-size: 13px; color: #1F2937;">
          🔑 <strong>Seu e-mail de acesso:</strong> <span style="font-family: monospace; font-weight: 700; color: #111827;">${escapeHtml(safeEmail)}</span><br>
          <span style="color: #6B7280; font-size: 12px;">Use exatamente este e-mail para fazer login na plataforma.</span>
        </div>
        <a href="https://club.imobiturbo.com.br/login" class="btn" target="_blank">Acessar Imobiturbo Club →</a>
      </div>

      <!-- ACESSO 2: CRM COM IA (IMOBITURBO OS) -->
      <div class="access-card" style="border-left: 4px solid #8B5CF6;">
        <div class="card-header">
          <span class="card-icon">2️⃣</span>
          <h3 class="card-title">CRM com IA (Imobiturbo OS)</h3>
        </div>
        <div class="badge-highlight" style="background: #FAF5FF; border-color: #E9D5FF; color: #6B21A8;">
          ⚡ Sistema Operacional com IA
        </div>
        <p class="card-desc">
          Seu sistema operacional completo com IA para triagem automática de leads, organização de funil e follow-up no WhatsApp.
        </p>
        <div style="background: #F3F4F6; border-radius: 8px; padding: 10px 14px; margin: 12px 0; font-size: 13px; color: #1F2937;">
          🔑 <strong>Seu e-mail de acesso:</strong> <span style="font-family: monospace; font-weight: 700; color: #111827;">${escapeHtml(safeEmail)}</span><br>
          <span style="color: #6B7280; font-size: 12px;">Use este e-mail para entrar e iniciar suas conexões.</span>
        </div>
        <a href="https://os.imobiturbo.com.br/login" class="btn" target="_blank" style="background: #4C1D95; color: #DDD6FE !important;">
          Entrar no Imobiturbo OS →
        </a>
      </div>

      <!-- ACESSO 3: GRUPO VIP NO WHATSAPP -->
      <div class="access-card" style="border-left: 4px solid #25D366;">
        <div class="card-header">
          <span class="card-icon">3️⃣</span>
          <h3 class="card-title">Comunidade de Alunos no WhatsApp</h3>
        </div>
        <div class="badge-highlight" style="background: #F0FDF4; border-color: #86EFAC; color: #166534;">
          💬 Grupo VIP Oficial de Membros
        </div>
        <p class="card-desc">
          Entre no grupo exclusivo de alunos no WhatsApp para networking, avisos importantes e troca de experiências diretamente com outros membros e nossa equipe.
        </p>
        <a href="https://chat.whatsapp.com/Iy4Uiw5t0630oK4MgZarFj" class="btn" target="_blank" style="background: #075E54; color: #FFFFFF !important;">
          Entrar no Grupo da Comunidade no WhatsApp →
        </a>
      </div>

      <div class="divider"></div>

      <div style="background: #F9FAFB; border-radius: 12px; padding: 18px 20px; text-align: center;">
        <h4 style="margin: 0 0 6px; font-size: 15px; color: #0A0A0A;">Precisa de Ajuda ou Suporte?</h4>
        <p style="margin: 0 0 12px; font-size: 13px; color: #525252;">
          Nosso time oficial de suporte está à sua disposição no WhatsApp para tirar dúvidas.
        </p>
        <a href="https://wa.me/5521969516183" style="color: #6CA438; font-weight: 700; text-decoration: none; font-size: 14px;">
          Falar com Suporte Oficial: (21) 96951-6183 →
        </a>
      </div>
    </div>

    <div class="footer">
      © 2026 Imobiturbo Tecnologia & Soluções Imobiliárias Ltda.<br>
      E-mail cadastrado: ${escapeHtml(safeEmail)}
    </div>
  </div>
</body>
</html>
  `.trim();

  let text = `
Bem-vindo(a) à Comunidade Imobiturbo!

Olá, ${firstName}!
Sua vaga na Comunidade Imobiturbo está oficialmente ativa (Plano ${planDisplay}).

Aqui estão seus acessos liberados:

1. COMUNIDADE & CLUBE (ÁREA DE MEMBROS)
- Trilhas completas de treinamento e gravações de todos os encontros da mentoria
- Seu e-mail de login: ${safeEmail}
- Acesso: https://club.imobiturbo.com.br/login

2. CRM COM IA (IMOBITURBO OS)
- Atendimento com IA, gestão de leads e follow-up
- Seu e-mail de login: ${safeEmail}
- Acesso: https://os.imobiturbo.com.br/login

3. GRUPO VIP NO WHATSAPP (COMUNIDADE)
- Entre no grupo oficial de membros: https://chat.whatsapp.com/Iy4Uiw5t0630oK4MgZarFj

Suporte Oficial no WhatsApp: (21) 96951-6183 ou https://wa.me/5521969516183
  `.trim();

  if (community) {
    const note = communitySummary(community);
    if (!community.products.includes("club")) {
      html = html.replace(/<!-- ACESSO 1:[\s\S]*?(?=<!-- ACESSO 2:)/, "");
      // Text is rebuilt from the same sold-product summary to avoid legacy promises.
    }
    if (!community.products.includes("os")) html = html.replace(/<!-- ACESSO 2:[\s\S]*?(?=<!-- ACESSO 3:)/, "");
    if (community.products.length !== 2) html = html.replace(/<!-- ACESSO 3:[\s\S]*?(?=<div class="divider">)/, "");
    html = html.replace('Acesso completo a todas as trilhas de treinamento, aulas práticas e a todas as <strong>gravações dos encontros da mentoria</strong>. Tudo organizado para você estudar e implementar no seu ritmo.', 'Direito a todos os cursos e trilhas do Club. A liberação de conteúdos protegidos segue a política da sua matrícula, informada abaixo.');
    html = html.replace('</body>',  `<p style="padding:24px">${escapeHtml(note)}</p></body>`);
    text = `Olá, ${extractFirstName(name)}! Seus acessos contratados estão prontos. E-mail: ${safeEmail}. ${note} Suporte: https://wa.me/5521969516183.`;
  }
  return { subject, html, text };
}

function formatPostPurchaseWhatsApp({ name, email, phone, plan = "anual", community }) {
  const firstName = extractFirstName(name);
  const safePhone = cleanPhoneNumber(phone);
  const safeEmail = (email || "").trim().toLowerCase();

  const param1 = "sua vaga na Comunidade Imobiturbo foi confirmada com";

  let param2 = `Olá, ${firstName}! Seja muito bem-vindo(a) à Comunidade Imobiturbo. Seus acessos já estão liberados usando seu e-mail (${safeEmail}): 1️⃣ Imobiturbo Club: trilhas e gravações da mentoria em club.imobiturbo.com.br/login · 2️⃣ CRM com IA (Imobiturbo OS): os.imobiturbo.com.br/login · 3️⃣ Grupo de Alunos no WhatsApp: toque no link abaixo para entrar. Enviamos também o e-mail completo de boas-vindas.`;

  if (community) param2 = `Olá, ${firstName}! Seus acessos contratados estão prontos usando ${safeEmail}. ${communitySummary(community)}`;
  const param3 = community && community.products.length !== 2 ?
    (community.products.includes("os") ? "https://os.imobiturbo.com.br/login" : "https://club.imobiturbo.com.br/login") : "https://chat.whatsapp.com/Iy4Uiw5t0630oK4MgZarFj";

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

async function provisionCommunityMembership({
  email,
  name,
  phone,
  plan = "anual",
  action = "activate",
  source = "checkout_vagas",
  transactionId,
  amountCents,
  purchaseProof,
  env = {},
  fetchFn = fetch,
}) {
  const supabaseUrl = (env && env.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const serviceKey =
    (env && env.SUPABASE_SERVICE_ROLE_KEY) || "";
  const safeEmail = (email || "").trim().toLowerCase();

  if (!serviceKey) return { ok: false, error: "community_provisioning_not_configured" };
  if (!safeEmail) {
    return { ok: false, error: "email_required" };
  }

  try {
    const payload = {
      p_email: safeEmail,
      p_name: name || undefined,
      p_phone: phone || undefined,
      p_plan: plan || "anual",
      p_action: action || "activate",
      p_source: source || "checkout_vagas",
      p_transaction_id: transactionId || undefined,
      p_amount_cents: typeof amountCents === "number" ? amountCents : undefined,
    };

    let rpc = 'provision_community_membership';
    if (purchaseProof) {
      if (!env.COMMUNITY_ORGANIZATION_ID || !purchaseProof.approvedAt || !transactionId) {
        return { ok: false, error: 'community_purchase_not_configured' };
      }
      rpc = 'provision_community_purchase';
      delete payload.p_action;
      delete payload.p_source;
      payload.p_name = name || null;
      payload.p_phone = phone || null;
      payload.p_organization_id = env.COMMUNITY_ORGANIZATION_ID;
      payload.p_approved_at = purchaseProof.approvedAt;
    }
    const resp = await fetchFn(`${supabaseUrl}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data && data.success) {
      return { ok: true, data };
    }
    return { ok: false, status: resp.status, data, error: data?.message || "provisioning_failed" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function sendPostPurchaseNotifications({
  email,
  name,
  phone,
  plan = "anual",
  paymentId,
  amountCents,
  purchaseProof,
  liveOffer = false,
  env = {},
  fetchFn = fetch,
}) {
  if (purchaseProof && !liveOffer) return { crmProvisioned: false, errors: ["community_durable_notifications_required"] };
  const zeptoUrl = (env && env.ZEPTOMAIL_API_URL) || DEFAULT_ZEPTOMAIL_URL;
  const zeptoToken = String((env && (env.ZEPTOMAIL_API_KEY ?? env.ZEPTOMAIL_TOKEN)) || "")
    .trim().replace(/^(?:Zoho-enczapikey\s*)+/i, "").trim();
  const zeptoBounce = (env && env.ZEPTOMAIL_BOUNCE_ADDRESS) || DEFAULT_ZEPTOMAIL_BOUNCE;
  const zeptoFromAddr = String((env && (env.ZEPTOMAIL_FROM_EMAIL ?? env.ZEPTOMAIL_FROM_ADDRESS)) || "").trim();
  const zeptoFromName = (env && env.ZEPTOMAIL_FROM_NAME) || DEFAULT_ZEPTOMAIL_FROM_NAME;

  const metaPhoneId = (env && env.META_PHONE_NUMBER_ID) || DEFAULT_META_PHONE_NUMBER_ID;
  const metaToken = (env && env.META_WHATSAPP_TOKEN) || "";
  const metaVersion = (env && env.META_GRAPH_VERSION) || DEFAULT_META_GRAPH_VERSION;

  const errors = [];
  let emailSent = false;
  let whatsappSent = false;
  let sitesSynced = false;
  let crmProvisioned = false;

  const safeEmail = (email || "").trim().toLowerCase();
  const safePhone = cleanPhoneNumber(phone);

  // 1. Provisionamento Central no CRM / Supabase OS (Lead etapa 0 no /0-funil-de-vendas + tags + acessos 30/90/365d)
  if (safeEmail) {
    try {
      const provResult = await provisionCommunityMembership({
        email: safeEmail,
        name,
        phone: safePhone,
        plan,
        action: "activate",
        source: "checkout_vagas",
        transactionId: paymentId,
        amountCents,
        purchaseProof,
        env,
        fetchFn,
      });
      if (provResult.ok) {
        crmProvisioned = true;
        if (purchaseProof && provResult.data?.duplicate) {
          return { crmProvisioned: true, duplicate: true, emailSent: false, whatsappSent: false, sitesSynced: false, errors: [] };
        }
      } else {
        if (purchaseProof) return { crmProvisioned: false, errors: ['community_provisioning_failed'] };
        errors.push(`CRM provisioning error: ${provResult.error || JSON.stringify(provResult.data)}`);
      }
    } catch (err) {
      errors.push(`CRM provisioning exception: ${err.message}`);
    }
  }

  if (purchaseProof && !crmProvisioned) {
    return { crmProvisioned: false, errors: ['community_provisioning_failed'] };
  }

  // 2. Envio do E-mail Completo via ZeptoMail (Zoho) Ilimitado
  if (safeEmail && (!zeptoToken || !zeptoFromAddr)) {
    errors.push("zeptomail_not_configured");
  }
  if (safeEmail && zeptoToken && zeptoFromAddr) {
    try {
      const emailPayload = formatPostPurchaseEmail({ name, email: safeEmail, plan });
      if (liveOffer) {
        const bookingUrl = "https://agenda.imobiturbo.com.br/natanpimentel/live-997-consultoria-incluida-20261001";
        emailPayload.html = emailPayload.html.replace("</body>", `<h2>Sua consultoria individual está incluída</h2><p>Oferta da live: Comunidade anual + CRM com IA + consultoria individual de 60 minutos. Sem pagamento adicional.</p><p><a href="${bookingUrl}">Agendar minha consultoria com Natan</a></p></body>`);
        emailPayload.text += `\n\nSua consultoria individual de 60 minutos está incluída na oferta da live. Agende sem pagamento adicional: ${bookingUrl}`;
      }
      const emailResp = await fetchFn(zeptoUrl, {
        method: "POST",
        headers: {
          Authorization: `Zoho-enczapikey ${zeptoToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          bounce_address: zeptoBounce,
          from: { address: zeptoFromAddr, name: zeptoFromName },
          to: [
            {
              email_address: {
                address: safeEmail,
                name: name || extractFirstName(name),
              },
            },
          ],
          subject: emailPayload.subject,
          htmlbody: emailPayload.html,
          textbody: emailPayload.text,
        }),
        signal: AbortSignal.timeout(7000),
      });
      const emailJson = await emailResp.json().catch(() => ({}));
      if (emailResp.ok && (emailJson.message === "OK" || emailJson.data || emailJson.code === "EM_104")) {
        emailSent = true;
      } else {
        errors.push(`ZeptoMail error: ${JSON.stringify(emailJson)}`);
      }
    } catch (err) {
      errors.push(`ZeptoMail exception: ${err.message}`);
    }
  }

  // 3. Envio do WhatsApp Oficial via Meta Cloud API
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

  // 4. Sites e Radar desativados operacionalmente — sync ignorado
  sitesSynced = false;

  return {
    crmProvisioned,
    emailSent,
    whatsappSent,
    sitesSynced,
    errors: errors.length > 0 ? errors : undefined,
  };
}

module.exports = {
  formatPostPurchaseEmail,
  formatPostPurchaseWhatsApp,
  provisionCommunityMembership,
  sendPostPurchaseNotifications,
  cleanPhoneNumber,
  extractFirstName,
};
