// Cloudflare Pages Function: /api/lead
// Encaminha leads da Landing Page para o Imobiturbo OS e dispara mensagem personalizada via WAHA 7796
import { captureCommunityLead } from './checkout/_community-crm.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
};

const OS_FORM_ENDPOINT_DEFAULT =
  'https://os.imobiturbo.com.br/api/v1/public/form-sources/imt_lp_oficial_30e9db2c23e85e4915f76d8407f0d3f2';

const OS_FORM_ENDPOINT_IMOBICREATOR =
  'https://os.imobiturbo.com.br/api/v1/public/form-sources/imt_imobicreator_aicreators_lead';

const WAHA_SEND_TEXT_ENDPOINT = 'https://os.imobiturbo.com.br/api/waha/api/sendText';
const WAHA_SESSION_7796 = 'org_18b103e6_61d5ac43';
const WAHA_API_KEY = '4760f9bb95826976458859a4e41432dce511d72a1a646364685711ee3708bdf1';

function normalizeWahaChatId(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  // Se não tiver DDI 55 e tiver 10 ou 11 dígitos, adiciona 55
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = '55' + digits;
  }
  return `${digits}@c.us`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    let payload = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      payload = Object.fromEntries(new URLSearchParams(text));
    } else {
      payload = await request.json();
    }

    if (payload.source === 'vagas_modal') {
      const receipt = await captureCommunityLead(context.env || {}, payload);
      return Response.json({ ok: true, ...receipt }, { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } });
    }

    // Extração e normalização dos dados
    const nome = (payload.nome || payload.name || '').trim();
    const telefone = (payload.telefone || payload.phone || payload.whatsapp || '').trim();
    const email = (payload.email || '').trim();
    const cargo = (payload.cargo || payload.role || '').trim();
    const faturamento = (payload.faturamento || payload.revenue || '').trim();
    const isImobicreator = payload.project === 'imobicreator' || (!payload.project && Boolean(cargo));

    if (payload.project === 'organic_diagnostic') {
      const profiles = { corretores: 'Corretor autônomo', imobiliarias: 'Imobiliária', incorporadoras: 'Incorporadora', empreiteiras: 'Empreiteira', construtoras: 'Construtora' };
      payload.perfil = profiles[payload.seo_publico] || payload.perfil;
      payload.consentimento_versao = 'diagnostico-20261003';
    }

    if (!telefone && !email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Informe telefone ou e-mail para prosseguir.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.project === 'organic_diagnostic' && (!nome || !telefone || !email || !payload.perfil || !payload.gargalo || payload.consentimento_contato !== 'sim')) {
      return Response.json({ ok: false, error: 'Preencha os dados do diagnóstico e autorize o contato.' }, { status: 400, headers: CORS_HEADERS });
    }

    // Adiciona metadados de requisição da Cloudflare
    const clientIp = request.headers.get('cf-connecting-ip');
    const country = request.headers.get('cf-ipcountry');
    if (clientIp && !payload.client_ip) payload.client_ip = clientIp;
    if (country && !payload.client_country) payload.client_country = country;

    // Garante que campos ricos fiquem no custom_fields e no root do payload do OS
    if (isImobicreator) {
      payload.name = nome;
      payload.phone = telefone;
      payload.email = email;
      payload.custom_fields = {
        ...(payload.custom_fields || {}),
        cargo: cargo || 'Não informado',
        faturamento: faturamento || 'Não informado',
        origem: 'Landing Page Imobicreator (aicreators.imobiturbo.com.br)',
      };
    }

    // 1. Encaminha para o Imobiturbo OS
    const osEndpoint = isImobicreator ? OS_FORM_ENDPOINT_IMOBICREATOR : OS_FORM_ENDPOINT_DEFAULT;
    let osResult = null;
    let leadId = null;

    try {
      const osResponse = await fetch(osEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Imobiturbo-Website/1.0 (Imobicreator)',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });

      const responseText = await osResponse.text();
      try {
        osResult = JSON.parse(responseText);
        leadId = osResult?.data?.lead_id || null;
      } catch {
        osResult = { raw: responseText };
      }
      if (!osResponse.ok || osResult?.ok === false || osResult?.success === false || !leadId) {
        console.warn('[Lead OS Ingest Rejected]', osResponse.status);
        return Response.json({ ok: false, error: 'Não foi possível confirmar o cadastro. Tente novamente em instantes.' }, { status: 502, headers: CORS_HEADERS });
      }
    } catch (osErr) {
      console.error('[Lead OS Ingest Error]:', osErr.name);
      return Response.json({ ok: false, error: 'Não foi possível confirmar o cadastro. Tente novamente em instantes.' }, { status: 502, headers: CORS_HEADERS });
    }

    // 2. Se for lead do Imobicreator e tiver telefone válido, dispara mensagem personalizada via WAHA 7796
    let wahaDispatched = false;
    let wahaError = null;

    if (isImobicreator && telefone) {
      const chatId = normalizeWahaChatId(telefone);
      const primeiroNome = (nome.split(' ')[0] || 'Tudo bem').trim();

      const mensagemWhatsApp = 
`Olá, ${primeiroNome}! Aqui é o Natan Pimentel, fundador da Imobiturbo e criador do Imobicreator. 👋🏻

Recebi seus dados para o projeto de Real Estate AI Influencer da sua construtora:

- *Nome:* ${nome}
- *Cargo:* ${cargo || 'Diretoria'}
- *Faixa de Faturamento:* ${faturamento || 'Não informada'}
- *E-mail:* ${email || 'Não informado'}

> Já estou com o seu perfil aberto aqui para desenharmos o conceito sob medida do influenciador virtual de IA da sua empresa (rosto exclusivo, voz calibrada e cenas em canteiro de obras).

Estou à sua disposição aqui nesta conversa para tirar dúvidas técnicas e alinharmos o briefing executivo. Me diz: qual é o principal lançamento ou perfil de empreendimento que vocês têm em foco agora?`;

      try {
        const wahaRes = await fetch(WAHA_SEND_TEXT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': WAHA_API_KEY,
          },
          body: JSON.stringify({
            session: WAHA_SESSION_7796,
            chatId: chatId,
            text: mensagemWhatsApp,
          }),
        });

        if (wahaRes.ok) {
          wahaDispatched = true;
        } else {
          const wahaErrBody = await wahaRes.text().catch(() => '');
          wahaError = `status_${wahaRes.status}: ${wahaErrBody.slice(0, 150)}`;
          console.warn('[WAHA Dispatch Warn]:', wahaError);
        }
      } catch (wahaErr) {
        wahaError = wahaErr.message || 'waha_fetch_failed';
        console.error('[WAHA Dispatch Error]:', wahaErr);
      }
    }

    // 3. Monta a URL de redirecionamento para o WhatsApp do Natan
    const msgRedirect = encodeURIComponent(
      `Olá Natan! Sou ${nome || 'visitante'}${cargo ? ` (${cargo})` : ''}. Acabei de preencher o formulário no Imobicreator e quero desenhar o influenciador de IA para minha construtora.`
    );
    const redirectUrl = `https://wa.me/5521983747796?text=${msgRedirect}`;

    if (payload.project === 'organic_diagnostic' && contentType.includes('application/x-www-form-urlencoded')) {
      return new Response('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Diagnóstico registrado | Imobiturbo</title><link rel="stylesheet" href="/organic.css?v=20261003"></head><body class="seo-page"><main class="seo-shell seo-hero"><p class="seo-eyebrow">Imobiturbo</p><h1>Diagnóstico registrado</h1><p>Recebemos seus dados. A equipe entrará em contato pelos dados informados.</p><a class="seo-button" href="/servicos/">Voltar aos serviços →</a></main></body></html>', { headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        lead_id: leadId,
        waha_dispatched: wahaDispatched,
        waha_error: wahaError,
        redirect_url: redirectUrl,
        os_result: osResult,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Erro ao processar formulário' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
