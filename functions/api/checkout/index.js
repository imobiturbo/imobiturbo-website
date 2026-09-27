// Cloudflare Pages Function: /api/checkout
// Checkout transparente: Asaas quando solicitado; Pix AbacatePay legado.
// Preços e identificação do produto são definidos exclusivamente no servidor.

import { dispatchConsultingCashflowToHub } from "./_cashflow.js";

const CORS_HEADERS = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function buildAsaasExternalReference({ productId, plan, eventId, checkoutExpiresAt, offerCode }) {
  // Asaas strictly enforces externalReference <= 100 characters.
  // Keep the consultant's Hub source mapping and one order id shared by every installment.
  if (productId === "consultoria-individual-natan") {
    const compact = JSON.stringify({
      product_id: productId,
      offer_code: offerCode || "consultoria-a-vista",
      eid: String(eventId || "").slice(0, 11),
    });
    if (compact.length > 100) throw new Error("Consultoria externalReference exceeds Asaas limit");
    return compact;
  }

  // For other plans, productId defaults to 'comunidade-imobiturbo' in checkoutDetails().
  const ref = {};
  ref.plan = plan;
  if (eventId) {
    ref.eid = eventId;
  }
  if (checkoutExpiresAt) {
    const expMs = typeof checkoutExpiresAt === "number" ? checkoutExpiresAt : Date.parse(checkoutExpiresAt);
    if (Number.isFinite(expMs)) ref.exp = expMs;
  }

  let str = JSON.stringify(ref);
  if (str.length <= 100) return str;

  // Drop expiration timestamp to save ~25 chars while preserving plan and eventId
  delete ref.exp;
  str = JSON.stringify(ref);
  if (str.length <= 100) return str;

  // Trim eventId while keeping valid JSON structure
  if (ref.eid) {
    while (str.length > 100 && ref.eid.length > 1) {
      const excess = str.length - 100;
      ref.eid = ref.eid.slice(0, Math.max(1, ref.eid.length - excess));
      str = JSON.stringify(ref);
    }
  }

  return str;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const abacateKey = (env && env.ABACATEPAY_API_KEY) || "";
  const asaasKey = (env && env.ASAAS_API_KEY) || "";

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "JSON inválido" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const rawPlan = body.plan || body.planId || "anual";
  const plan = rawPlan.toString().toLowerCase();
  const rawPaymentMethod = body.paymentMethod || "PIX";
  const paymentMethod = rawPaymentMethod.toString().toUpperCase();

  const {
    name = "",
    email = "",
    phone = "",
    cpfCnpj = "",
    creditCard = null,
    tracking = {},
    eventId = `vagas_evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  } = body;

  const cleanPhone = (phone || "").replace(/\D/g, "");
  const cleanCpf = (cpfCnpj || "").replace(/\D/g, "");

  // Tabela canônica de planos (Alinhada com a Landing Page Vagas e Hub Tracker)
  const PLAN_DETAILS = {
    anual: {
      title: "Comunidade Imobiturbo - Plano Anual",
      pixCents: 99700,
      pixReais: 997.0,
      cardInstallmentCount: 12,
      cardInstallmentValue: 97.0,
      cardTotalValue: 1164.0,
    },
    trimestral: {
      title: "Comunidade Imobiturbo - Plano Trimestral",
      pixCents: 35700,
      pixReais: 357.0,
      cardInstallmentCount: 3,
      cardInstallmentValue: 127.0,
      cardTotalValue: 381.0,
    },
    semestral: {
      title: "Comunidade Imobiturbo - Plano Semestral",
      pixCents: 74700,
      pixReais: 747.0,
      cardInstallmentCount: 6,
      cardInstallmentValue: 147.0,
      cardTotalValue: 882.0,
    },
    mensal: {
      title: "Comunidade Imobiturbo - Plano Mensal",
      pixCents: 14700,
      pixReais: 147.0,
      cardInstallmentCount: 1,
      cardInstallmentValue: 147.0,
      cardTotalValue: 147.0,
    },
    consultoria: {
      title: "Consultoria Individual de 1h com Natan Pimentel",
      pixCents: 49700,
      pixReais: 497,
      cardInstallmentCount: 12,
      cardInstallmentValue: 49,
      cardTotalValue: 588,
    },
  };

  if (!Object.hasOwn(PLAN_DETAILS, plan)) {
    return Response.json({ success: false, error: "Selecione um plano válido." }, { status: 400, headers: CORS_HEADERS });
  }
  const selectedPlan = PLAN_DETAILS[plan];
  const todayStr = new Date().toISOString().split("T")[0];
  const productId = plan === "consultoria" ? "consultoria-individual-natan" : "comunidade-imobiturbo";
  const checkoutExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const requestedInstallments = body.installments == null || body.installments === "" ? 1 : Number(body.installments);
  if (plan === "consultoria" && paymentMethod === "CREDIT_CARD" && ![1, 12].includes(requestedInstallments)) {
    return Response.json({ success: false, error: "Escolha pagamento à vista ou em 12 parcelas." }, { status: 400, headers: CORS_HEADERS });
  }
  const installmentCount = plan === "consultoria" && paymentMethod === "CREDIT_CARD" ? requestedInstallments : 1;
  const offerCode = plan === "consultoria" ? (installmentCount === 12 ? "consultoria-12x49" : "consultoria-a-vista") : undefined;
  const checkoutEventId = plan === "consultoria" ? crypto.randomUUID().replaceAll("-", "").slice(0, 11) : eventId;
  const externalReference = buildAsaasExternalReference({ productId, plan, eventId: checkoutEventId, checkoutExpiresAt, offerCode });

  // ==========================================
  // ESTRATÉGIA 1: PIX VIA ASAAS (QUANDO SOLICITADO OU DEFAULT)
  // ==========================================
  const requestedGateway = plan === "consultoria" ? "asaas" : (body.gateway || "").toString().toLowerCase();

  if (paymentMethod === "PIX" && requestedGateway === "asaas") {
    if (!asaasKey) {
      return Response.json({ success: false, error: "Pix via Asaas temporariamente indisponível." }, { status: 503, headers: CORS_HEADERS });
    }
    try {
      const asaasHeaders = {
        access_token: asaasKey,
        "Content-Type": "application/json",
        "User-Agent": "Imobiturbo-Checkout/1.0",
      };

      // Localizar ou Criar Cliente no Asaas
      let asaasCustomerId = null;
      if (cleanCpf && cleanCpf.length >= 11) {
        try {
          const searchCpf = await fetch(
            `https://api.asaas.com/v3/customers?cpfCnpj=${encodeURIComponent(cleanCpf)}&limit=1`,
            { headers: asaasHeaders, signal: AbortSignal.timeout(4000) }
          );
          const searchData = await searchCpf.json();
          if (searchData.data && searchData.data.length > 0) {
            asaasCustomerId = searchData.data[0].id;
          }
        } catch {}
      }

      if (!asaasCustomerId && email && email.includes("@")) {
        try {
          const searchEmail = await fetch(
            `https://api.asaas.com/v3/customers?email=${encodeURIComponent(email.trim().toLowerCase())}&limit=1`,
            { headers: asaasHeaders, signal: AbortSignal.timeout(4000) }
          );
          const searchData = await searchEmail.json();
          if (searchData.data && searchData.data.length > 0) {
            asaasCustomerId = searchData.data[0].id;
          }
        } catch {}
      }

      if (!asaasCustomerId) {
        const custResp = await fetch("https://api.asaas.com/v3/customers", {
          method: "POST",
          headers: asaasHeaders,
          body: JSON.stringify({
            name: name.trim() || "Lead Comunidade",
            email: email.trim().toLowerCase(),
            mobilePhone: cleanPhone,
            phone: cleanPhone,
            cpfCnpj: cleanCpf,
            notificationDisabled: true,
          }),
          signal: AbortSignal.timeout(5000),
        });
        const custData = await custResp.json();
        if (custData.id) {
          asaasCustomerId = custData.id;
        } else {
          const msg = (custData.errors && custData.errors[0]?.description) || "Erro ao registrar cliente no Asaas";
          return Response.json({ success: false, gateway: "asaas", error: msg }, { status: 422, headers: CORS_HEADERS });
        }
      }

      const paymentPayload = {
        customer: asaasCustomerId,
        billingType: "PIX",
        value: selectedPlan.pixReais,
        dueDate: todayStr,
        description: selectedPlan.title,
        fine: { value: 0, type: "FIXED" },
        interest: { value: 0 },
        externalReference,
      };

      const payResp = await fetch("https://api.asaas.com/v3/payments", {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(paymentPayload),
        signal: AbortSignal.timeout(5000),
      });
      const payment = await payResp.json();

      if (!payment.id) {
        const errMsg = (payment.errors && payment.errors[0]?.description) || "Falha ao gerar cobrança Asaas";
        return Response.json({ success: false, gateway: "asaas", error: errMsg }, { status: 422, headers: CORS_HEADERS });
      }

      if (plan === "consultoria") {
        const delivery = dispatchConsultingCashflowToHub({ env, payment });
        if (context.waitUntil) context.waitUntil(delivery); else await delivery;
      }

      // A cobrança já existe: recuperar o QR nunca deve criar outra cobrança.
      let qrData = {};
      try {
        const qrResp = await fetch(`https://api.asaas.com/v3/payments/${payment.id}/pixQrCode`, {
          headers: asaasHeaders,
          signal: AbortSignal.timeout(4000),
        });
        if (qrResp.ok) qrData = await qrResp.json();
      } catch (_) { /* /status recupera o QR da mesma cobrança. */ }

      return new Response(
        JSON.stringify({
          success: true,
          gateway: "asaas",
          paymentId: payment.id,
          billingType: "PIX",
          status: payment.status || "PENDING",
          amount: plan === "consultoria" ? 497 : payment.value,
          chargeAmount: payment.value,
          installmentCount: 1,
          installmentValue: 497,
          offerCode,
          plan,
          productId,
          pixPending: !qrData.payload || !qrData.encodedImage,
          pix: {
            copyPaste: qrData.payload || null,
            qrCodeBase64: qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : null,
            // Janela de retomada do checkout; não altera o vencimento bancário.
            expiresAt: checkoutExpiresAt,
          },
          invoiceUrl: payment.invoiceUrl,
          eventId: checkoutEventId,
          clientIp: request.headers.get("cf-connecting-ip") || null,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      return Response.json({ success: false, gateway: "asaas", error: `Erro ao gerar Pix no Asaas: ${err.message}` }, { status: 502, headers: CORS_HEADERS });
    }
  }

  // ==========================================
  // ESTRATÉGIA 2: ABACATEPAY PIX (FALLBACK/PADRÃO)
  // ==========================================
  let abacateError = null;

  if (paymentMethod === "PIX") {
    if (!abacateKey) {
      return Response.json({ success: false, error: "Pix temporariamente indisponível. Tente novamente em instantes." }, { status: 503, headers: CORS_HEADERS });
    }
    try {
      const abacateResp = await fetch("https://api.abacatepay.com/v2/transparents/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${abacateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "PIX",
          data: {
            amount: selectedPlan.pixCents,
            expiresIn: 1800, // 30 minutos
            description: selectedPlan.title,
            externalId: `${plan}-${eventId}`,
            customer: cleanCpf ? {
              name: name.trim() || "Cliente Imobiturbo",
              cellphone: cleanPhone ? (cleanPhone.startsWith("55") ? `+${cleanPhone}` : `+55${cleanPhone}`) : undefined,
              email: email.trim() || undefined,
              taxId: cleanCpf,
            } : undefined,
            metadata: {
              ...tracking,
              product_id: "comunidade-imobiturbo",
              offer_key: "comunidade-imobiturbo",
              plan,
              name,
              email,
              phone: cleanPhone,
              cpfCnpj: cleanCpf,
              eventId,
            },
            utm: {
              source: tracking.utm_source || "vagas_direct",
              medium: tracking.utm_medium || "landing_page",
              campaign: tracking.utm_campaign || "comunidade_vagas",
              term: tracking.utm_term || "",
              content: tracking.utm_content || "",
            },
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      const abacateJson = await abacateResp.json();

      if (abacateResp.ok && abacateJson.success && abacateJson.data) {
        return new Response(
          JSON.stringify({
            success: true,
            gateway: "abacatepay",
            paymentId: abacateJson.data.id,
            billingType: "PIX",
            status: abacateJson.data.status || "PENDING",
            amount: selectedPlan.pixReais,
            plan,
            pix: {
              copyPaste: abacateJson.data.brCode,
              qrCodeBase64: abacateJson.data.brCodeBase64,
              expiresAt: abacateJson.data.expiresAt,
            },
            eventId,
            clientIp: request.headers.get("cf-connecting-ip") || null,
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      } else {
        abacateError = abacateJson.error || "Falha na criação do PIX no AbacatePay";
      }
    } catch (err) {
      abacateError = err.message || "Timeout / Falha de rede no AbacatePay";
    }
    // Um timeout pode acontecer depois de o provedor criar o Pix.
    // Nunca criar uma segunda cobrança em outro gateway nessa situação.
    return Response.json({ success: false, error: "Não foi possível gerar o Pix agora. Tente novamente em instantes." }, { status: 502, headers: CORS_HEADERS });
  } else {
    // Para Cartão de Crédito, AbacatePay ainda não tem cartão liberado na loja.
    abacateError = "Cartão de Crédito roteado via Asaas";
  }

  // ==========================================
  // ESTRATÉGIA 2: ASAAS (GATEWAY FALLBACK / CARTÃO)
  // ==========================================
  try {
    const asaasHeaders = {
      access_token: asaasKey,
      "Content-Type": "application/json",
      "User-Agent": "Imobiturbo-Checkout/1.0",
    };

    // 1. Localizar ou Criar Cliente no Asaas
    let asaasCustomerId = null;
    if (cleanCpf && cleanCpf.length >= 11) {
      try {
        const searchCpf = await fetch(
          `https://api.asaas.com/v3/customers?cpfCnpj=${encodeURIComponent(cleanCpf)}&limit=1`,
          { headers: asaasHeaders, signal: AbortSignal.timeout(4000) }
        );
        const searchData = await searchCpf.json();
        if (searchData.data && searchData.data.length > 0) {
          asaasCustomerId = searchData.data[0].id;
        }
      } catch {
        // continua para busca por email
      }
    }

    if (!asaasCustomerId && email && email.includes("@")) {
      try {
        const searchEmail = await fetch(
          `https://api.asaas.com/v3/customers?email=${encodeURIComponent(email.trim().toLowerCase())}&limit=1`,
          { headers: asaasHeaders, signal: AbortSignal.timeout(4000) }
        );
        const searchData = await searchEmail.json();
        if (searchData.data && searchData.data.length > 0) {
          asaasCustomerId = searchData.data[0].id;
        }
      } catch {
        // continua para criação
      }
    }

    if (!asaasCustomerId) {
      const custResp = await fetch("https://api.asaas.com/v3/customers", {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name: name.trim() || "Lead Comunidade",
          email: email.trim().toLowerCase(),
          mobilePhone: cleanPhone,
          phone: cleanPhone,
          cpfCnpj: cleanCpf,
          notificationDisabled: true, // SILENCIA o Asaas 100%: nunca envia email, SMS ou menção a Imobiturbo para o cliente
        }),
        signal: AbortSignal.timeout(5000),
      });
      const custData = await custResp.json();
      if (custData.id) {
        asaasCustomerId = custData.id;
      } else {
        throw new Error(
          (custData.errors && custData.errors[0]?.description) || "Erro ao registrar cliente no Asaas"
        );
      }
    }

    // 2. Criar Cobrança no Asaas
    if (paymentMethod === "PIX") {
      const paymentPayload = {
        customer: asaasCustomerId,
        billingType: "PIX",
        value: selectedPlan.pixReais,
        dueDate: todayStr,
        description: `${selectedPlan.title} (Fallback Asaas)`,
        fine: { value: 0, type: "FIXED" },
        interest: { value: 0 },
        externalReference,
      };

      const payResp = await fetch("https://api.asaas.com/v3/payments", {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(paymentPayload),
        signal: AbortSignal.timeout(5000),
      });
      const payment = await payResp.json();

      if (!payment.id) {
        throw new Error(
          (payment.errors && payment.errors[0]?.description) || "Falha ao gerar cobrança Asaas"
        );
      }

      // Buscar QR Code Pix do Asaas
      const qrResp = await fetch(`https://api.asaas.com/v3/payments/${payment.id}/pixQrCode`, {
        headers: asaasHeaders,
        signal: AbortSignal.timeout(4000),
      });
      const qrData = await qrResp.json();

      return new Response(
        JSON.stringify({
          success: true,
          gateway: "asaas",
          fallbackReason: abacateError,
          paymentId: payment.id,
          billingType: "PIX",
          status: payment.status,
          amount: payment.value,
          plan,
          pix: {
            copyPaste: qrData.payload,
            qrCodeBase64: `data:image/png;base64,${qrData.encodedImage}`,
            expiresAt: qrData.expirationDate,
          },
          invoiceUrl: payment.invoiceUrl,
          eventId,
          clientIp: request.headers.get("cf-connecting-ip") || null,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    } else if (paymentMethod === "CREDIT_CARD") {
      if (!creditCard) {
        return new Response(
          JSON.stringify({ success: false, error: "Dados do cartão são obrigatórios" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      const holderInfo = {
        name: creditCard.holderName || name,
        email: email.trim().toLowerCase(),
        cpfCnpj: cleanCpf,
        postalCode: creditCard.postalCode || "20050005",
        addressNumber: creditCard.addressNumber || "1",
        phone: cleanPhone,
        mobilePhone: cleanPhone,
      };

      if (plan === "mensal") {
        // ASSINATURA RECORRENTE MENSAL VIA ASAAS (/v3/subscriptions)
        const subPayload = {
          customer: asaasCustomerId,
          billingType: "CREDIT_CARD",
          value: selectedPlan.pixReais,
          nextDueDate: todayStr,
          cycle: "MONTHLY",
          description: selectedPlan.title,
          creditCard: {
            holderName: creditCard.holderName || name,
            number: (creditCard.number || "").replace(/\D/g, ""),
            expiryMonth: creditCard.expiryMonth,
            expiryYear: creditCard.expiryYear,
            ccv: creditCard.ccv,
          },
          creditCardHolderInfo: holderInfo,
          externalReference,
        };

        const subResp = await fetch("https://api.asaas.com/v3/subscriptions", {
          method: "POST",
          headers: asaasHeaders,
          body: JSON.stringify(subPayload),
          signal: AbortSignal.timeout(8000),
        });
        const subData = await subResp.json();

        if (!subData.id) {
          const errMsg =
            (subData.errors && subData.errors.map((e) => e.description).join(" | ")) ||
            "Erro ao processar assinatura no cartão de crédito";
          return new Response(
            JSON.stringify({ success: false, gateway: "asaas", error: errMsg }),
            { status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }

        let paymentId = null;
        let paymentStatus = subData.status || "ACTIVE";
        let isApproved = false;
        let invoiceUrl = subData.paymentLink || null;

        try {
          const payListResp = await fetch(
            `https://api.asaas.com/v3/subscriptions/${subData.id}/payments?limit=1`,
            { headers: asaasHeaders, signal: AbortSignal.timeout(4000) }
          );
          const payListData = await payListResp.json();
          if (payListData.data && payListData.data.length > 0) {
            const firstPayment = payListData.data[0];
            paymentId = firstPayment.id;
            paymentStatus = firstPayment.status;
            invoiceUrl = firstPayment.invoiceUrl || invoiceUrl;
            isApproved =
              firstPayment.status === "CONFIRMED" ||
              firstPayment.status === "RECEIVED" ||
              firstPayment.status === "RECEIVED_IN_CASH";
          }
        } catch (_) {}

        return new Response(
          JSON.stringify({
            success: true,
            gateway: "asaas",
            subscriptionId: subData.id,
            paymentId: paymentId || subData.id,
            billingType: "CREDIT_CARD",
            status: paymentStatus,
            isApproved,
            amount: selectedPlan.pixReais,
            plan,
            productId,
            expiresAt: checkoutExpiresAt,
            invoiceUrl,
            eventId,
            clientIp: request.headers.get("cf-connecting-ip") || null,
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      } else {
        const cardPayload = {
          customer: asaasCustomerId,
          billingType: "CREDIT_CARD",
          dueDate: todayStr,
          description: selectedPlan.title,
          creditCard: {
            holderName: creditCard.holderName || name,
            number: (creditCard.number || "").replace(/\D/g, ""),
            expiryMonth: creditCard.expiryMonth,
            expiryYear: creditCard.expiryYear,
            ccv: creditCard.ccv,
          },
          creditCardHolderInfo: holderInfo,
          externalReference,
        };

        const reqInstallments = parseInt(body.installments, 10);
        let installmentCount = plan === "consultoria" ? requestedInstallments : selectedPlan.cardInstallmentCount;
        if (plan !== "consultoria" && Number.isInteger(reqInstallments) && reqInstallments >= 1 && reqInstallments <= 12) {
          installmentCount = reqInstallments;
        }

        if (plan === "consultoria") {
          cardPayload.fine = { value: 0, type: "FIXED" };
          cardPayload.interest = { value: 0 };
        }

        if (installmentCount > 1 && plan === "consultoria") {
          cardPayload.installmentCount = installmentCount;
          cardPayload.installmentValue = selectedPlan.cardInstallmentValue;
        } else if (installmentCount > 1) {
          cardPayload.installmentCount = installmentCount;
          cardPayload.totalValue = selectedPlan.cardTotalValue;
        } else {
          cardPayload.value = selectedPlan.pixReais;
        }

        const payResp = await fetch("https://api.asaas.com/v3/payments", {
          method: "POST",
          headers: asaasHeaders,
          body: JSON.stringify(cardPayload),
          signal: AbortSignal.timeout(8000),
        });
        const payment = await payResp.json();

        if (!payment.id) {
          const errMsg =
            (payment.errors && payment.errors.map((e) => e.description).join(" | ")) ||
            "Erro ao processar cartão de crédito";
          return new Response(
            JSON.stringify({ success: false, gateway: "asaas", error: errMsg }),
            { status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }

        if (plan === "consultoria") {
          const delivery = dispatchConsultingCashflowToHub({ env, payment });
          if (context.waitUntil) context.waitUntil(delivery); else await delivery;
        }

        const isApproved =
          payment.status === "CONFIRMED" ||
          payment.status === "RECEIVED" ||
          payment.status === "RECEIVED_IN_CASH";

        return new Response(
          JSON.stringify({
            success: true,
            gateway: "asaas",
            paymentId: payment.id,
            billingType: "CREDIT_CARD",
            status: payment.status,
            isApproved,
            amount: plan === "consultoria" ? (installmentCount === 12 ? 588 : 497) : payment.value,
            chargeAmount: payment.value,
            installmentCount: plan === "consultoria" ? installmentCount : payment.installmentCount || installmentCount,
            installmentValue: plan === "consultoria" ? (installmentCount === 12 ? 49 : 497) : payment.installmentValue || undefined,
            offerCode,
            plan,
            productId,
            expiresAt: checkoutExpiresAt,
            invoiceUrl: payment.invoiceUrl,
            eventId: checkoutEventId,
            clientIp: request.headers.get("cf-connecting-ip") || null,
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Método de pagamento inválido" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Falha ao processar checkout: ${err.message}`,
        primaryGatewayError: abacateError,
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}
