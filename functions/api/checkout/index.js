// Cloudflare Pages Function: /api/checkout
// Primary Gateway: AbacatePay (Pix transparente)
// Fallback Gateway: Asaas (Pix e Cartão de Crédito até 12x)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

  const {
    plan = "anual",
    paymentMethod = "PIX",
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

  // Tabela canônica de planos
  const PLAN_DETAILS = {
    anual: {
      title: "Comunidade Imobiturbo - Plano Anual",
      pixCents: 95700,
      pixReais: 957.0,
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
    mensal: {
      title: "Comunidade Imobiturbo - Plano Mensal",
      pixCents: 14700,
      pixReais: 147.0,
      cardInstallmentCount: 1,
      cardInstallmentValue: 147.0,
      cardTotalValue: 147.0,
    },
  };

  const selectedPlan = PLAN_DETAILS[plan] || PLAN_DETAILS.anual;
  const todayStr = new Date().toISOString().split("T")[0];

  // ==========================================
  // ESTRATÉGIA 1: ABACATEPAY (GATEWAY PRINCIPAL)
  // ==========================================
  let abacateError = null;

  if (paymentMethod === "PIX") {
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
            metadata: {
              plan,
              name,
              email,
              phone: cleanPhone,
              cpfCnpj: cleanCpf,
              eventId,
              ...tracking,
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
        signal: AbortSignal.timeout(5000), // Timeout rígido de 5s para auto-failover
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
        externalReference: eventId,
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
        postalCode: "20050005",
        addressNumber: "1",
        phone: cleanPhone,
        mobilePhone: cleanPhone,
      };

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
        externalReference: eventId,
      };

      if (selectedPlan.cardInstallmentCount > 1) {
        cardPayload.installmentCount = selectedPlan.cardInstallmentCount;
        cardPayload.installmentValue = selectedPlan.cardInstallmentValue;
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
          amount: payment.value,
          plan,
          invoiceUrl: payment.invoiceUrl,
          eventId,
          clientIp: request.headers.get("cf-connecting-ip") || null,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
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
