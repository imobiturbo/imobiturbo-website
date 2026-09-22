// Cloudflare Pages Function: /api/checkout/webhook
// Processa webhooks de liquidação e cancelamento/reembolso: AbacatePay, Asaas e Hotmart para Imobiturbo
// Dispara evento Purchase server-side garantido e idempotente para Meta CAPI (Graph API v25.0)
// Dispara Kit de Boas-Vindas 4 em 1: CRM Lead (/0-funil-de-vendas) + E-mail ZeptoMail + WhatsApp Oficial + Sites D1
// Processa cancelamento/reembolso revogando acessos e marcando lead como lost

import {
  sendPostPurchaseNotifications,
  provisionCommunityMembership,
} from "./_notifications.js";
import { dispatchVerifiedPurchaseToHub } from "./_tracking.js";
import { authenticateHotmart, parseHotmartEvent } from "./_hotmart.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Asaas-Access-Token",
};

const DEFAULT_PIXEL_ID = "1025303472485246";
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "JSON inválido" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const isHotmart = Boolean(payload.data?.purchase || /^(PURCHASE_|SUBSCRIPTION_)/.test(payload.event || ''));
    let hotmart = null;
    if (isHotmart) {
      const authStatus = await authenticateHotmart(request, env);
      if (authStatus !== 200) return Response.json({ ok: false, error: 'hotmart_authentication_failed' }, { status: authStatus });
      try { hotmart = parseHotmartEvent(payload); }
      catch { return Response.json({ ok: false, error: 'hotmart_invalid_purchase' }, { status: 422 }); }
      if (hotmart.action === 'ignore') return Response.json({ ok: true, status: 'ignored_event' });
      // OS policy: refunds/chargebacks are reviewed manually; Hub records the reversal.
      if (hotmart.action === 'review') return Response.json({ ok: true, status: 'manual_review' });
    }

    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    const userAgent = request.headers.get("user-agent") || "";
    const cookies = parseCookies(request.headers.get("Cookie") || "");

    let isPaid = false;
    let isCanceled = false;
    let paymentId = "";
    let amount = 0;
    let email = "";
    let phone = "";
    let name = "";
    let fbp = "";
    let fbc = "";
    let externalRef = "";
    let contentName = "Comunidade Imobiturbo";
    let plan = "anual";

    // Hotmart is verified and mapped before any side effect.
    if (hotmart) {
      isPaid = hotmart.action === 'activate';
      isCanceled = hotmart.action === 'cancel';
      ({ paymentId, amount, email, phone, name, plan } = hotmart);
    }
    // 1. AbacatePay Webhook Detection (Pago)
    else if (
      payload.event === "billing.paid" ||
      (payload.data &&
        (payload.data.status === "PAID" ||
          payload.data.status === "APPROVED" ||
          payload.data.status === "COMPLETED"))
    ) {
      isPaid = true;
      const data = payload.data || {};
      paymentId = data.id || payload.id || "";
      // AbacatePay amount em centavos -> converter para reais
      amount = typeof data.amount === "number" ? data.amount / 100 : 0;
      const cust = data.customer || payload.customer || {};
      email = cust.email || data.metadata?.email || "";
      phone = cust.cellphone || cust.phone || data.metadata?.phone || "";
      name = cust.name || data.metadata?.name || "";
      fbp = data.metadata?.fbp || cookies["_fbp"] || "";
      fbc = data.metadata?.fbc || cookies["_fbc"] || "";
      externalRef = data.metadata?.eventId || "";
      if (data.metadata?.plan) plan = data.metadata.plan;
      if (data.description) contentName = data.description;
    }
    // 1.1 AbacatePay Reembolso / Chargeback / Cancelamento
    else if (
      ["billing.refunded", "billing.chargeback", "billing.canceled"].includes(payload.event) ||
      (payload.data && ["REFUNDED", "CHARGEBACK", "CANCELED"].includes(payload.data.status))
    ) {
      isCanceled = true;
      const data = payload.data || {};
      paymentId = data.id || payload.id || "";
      const cust = data.customer || payload.customer || {};
      email = cust.email || data.metadata?.email || "";
      phone = cust.cellphone || cust.phone || data.metadata?.phone || "";
      name = cust.name || data.metadata?.name || "";
    }
    // 2. Asaas Webhook Detection (Pago)
    else if (
      ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "CHECKOUT_PAID", "PIX_CREDIT_RECEIVED"].includes(
        payload.event
      ) ||
      (payload.payment &&
        (payload.payment.status === "RECEIVED" || payload.payment.status === "CONFIRMED"))
    ) {
      isPaid = true;
      const payment = payload.payment || {};
      paymentId = payment.id || payload.id || "";
      amount = Number(payment.value || payment.netValue || 0);
      const cust =
        payload.customer || (typeof payment.customer === "object" ? payment.customer : {});
      email = cust.email || "";
      phone = cust.mobilePhone || cust.phone || "";
      name = cust.name || "";
      fbp = cookies["_fbp"] || "";
      fbc = cookies["_fbc"] || "";
      externalRef = payment.externalReference || "";
      if (payment.description) {
        contentName = payment.description;
        const descLower = payment.description.toLowerCase();
        if (descLower.includes("trimestral")) plan = "trimestral";
        else if (descLower.includes("mensal")) plan = "mensal";
      }

      // Se o Asaas enviou apenas o customer ID, busca dados cadastrais diretamente na API
      if ((!email || !phone) && typeof payment.customer === "string") {
        const asaasKey = (env && env.ASAAS_API_KEY) || "";
        if (asaasKey) {
          try {
            const cusResp = await fetch(
              `https://api.asaas.com/v3/customers/${encodeURIComponent(payment.customer)}`,
              { headers: { access_token: asaasKey }, signal: AbortSignal.timeout(4000) }
            );
            if (cusResp.ok) {
              const cusData = await cusResp.json();
              if (!email) email = cusData.email || "";
              if (!phone) phone = cusData.mobilePhone || cusData.phone || "";
              if (!name) name = cusData.name || "";
            }
          } catch (err) {
            console.error("Asaas customer lookup fallback error:", err);
          }
        }
      }
    }
    // 2.1 Asaas Reembolso / Chargeback / Cancelamento
    else if (
      [
        "PAYMENT_REFUNDED",
        "PAYMENT_CHARGEBACK_REQUESTED",
        "PAYMENT_CHARGEBACK_DISPUTE",
        "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
        "PAYMENT_DELETED",
      ].includes(payload.event) ||
      (payload.payment && ["REFUNDED", "CHARGEBACK_REQUESTED"].includes(payload.payment.status))
    ) {
      isCanceled = true;
      const payment = payload.payment || {};
      paymentId = payment.id || payload.id || "";
      const cust =
        payload.customer || (typeof payment.customer === "object" ? payment.customer : {});
      email = cust.email || "";
      phone = cust.mobilePhone || cust.phone || "";
      name = cust.name || "";

      if ((!email || !phone) && typeof payment.customer === "string") {
        const asaasKey = (env && env.ASAAS_API_KEY) || "";
        if (asaasKey) {
          try {
            const cusResp = await fetch(
              `https://api.asaas.com/v3/customers/${encodeURIComponent(payment.customer)}`,
              { headers: { access_token: asaasKey }, signal: AbortSignal.timeout(4000) }
            );
            if (cusResp.ok) {
              const cusData = await cusResp.json();
              if (!email) email = cusData.email || "";
              if (!phone) phone = cusData.mobilePhone || cusData.phone || "";
              if (!name) name = cusData.name || "";
            }
          } catch (err) {
            console.error("Asaas customer lookup fallback error:", err);
          }
        }
      }
    }
    else {
      // Eventos não-financeiros retornam 200 OK sem disparar compra
      return new Response(
        JSON.stringify({ ok: true, status: "ignored_event", event: payload.event || "unknown" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Processamento de CANCELAMENTO / REEMBOLSO
    if (isCanceled && (email || phone)) {
      const cancelResult = await provisionCommunityMembership({
        email,
        phone,
        action: "cancel",
        transactionId: paymentId,
        source: "webhook_cancellation",
        env,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          canceled: true,
          event: payload.event || "canceled",
          email,
          paymentId,
          provision: cancelResult,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let metaResult = null;
    let eventId = null;

    if (isPaid && paymentId) {
      // Idempotência garantida: usa externalReference (eventId do checkout) ou purch_<paymentId>
      eventId = externalRef || `purch_${paymentId}`;
      const pixelId = (env && env.META_PIXEL_ID) || DEFAULT_PIXEL_ID;
      const token = (env && env.META_ACCESS_TOKEN) || "";

      const userData = {
        client_ip_address: clientIp,
        client_user_agent: userAgent,
      };
      if (isValidFbCookie(fbp)) userData.fbp = fbp;
      if (isValidFbCookie(fbc)) userData.fbc = fbc;
      if (email) userData.em = [await sha256(normalizeEmail(email))];
      if (phone) userData.ph = [await sha256(normalizePhone(phone))];
      if (name) {
        const normalized = normalizeName(name);
        const parts = normalized.split(" ");
        const fn = parts[0];
        const ln = parts.slice(1).join(" ");
        if (fn) userData.fn = [await sha256(fn)];
        if (ln) userData.ln = [await sha256(ln)];
      }

      const purchasePayload = {
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            event_source_url: "https://www.imobiturbo.com.br/vagas/",
            action_source: "website",
            user_data: userData,
            custom_data: {
              value: amount,
              currency: "BRL",
              content_name: contentName,
              content_type: "product",
              num_items: 1,
            },
          },
        ],
      };

      if (env && env.META_TEST_EVENT_CODE) {
        purchasePayload.test_event_code = env.META_TEST_EVENT_CODE;
      }

      if (!isHotmart && pixelId && token) {
        const metaResp = await fetch(
          `https://graph.facebook.com/v25.0/${pixelId}/events?access_token=${token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(purchasePayload),
            signal: AbortSignal.timeout(6000),
          }
        );
        metaResult = await metaResp.json().catch(() => ({}));
      } else {
        metaResult = { ok: false, error: "meta_capi_not_configured" };
      }

      if (!isHotmart) await dispatchVerifiedPurchaseToHub({
        env, request, paymentId, eventId, amount, contentName, email, phone, name, fbp, fbc,
      });

      // Disparo unificado do Kit de Boas-Vindas 4 em 1:
      // 1. Provisionamento no CRM / Supabase OS (/0-funil-de-vendas -> 0. Novo Lead + tags + acessos 30/90/365d)
      // 2. E-mail Único Completo via ZeptoMail ilimitado
      // 3. WhatsApp Oficial via Meta Cloud API
      // 4. Sincronização automática no banco D1 do Sites Imobiturbo
      let notifResult = null;
      if (email || phone) {
        try {
          const amountCents = Math.round(amount * 100);
          notifResult = await sendPostPurchaseNotifications({
            email,
            name,
            phone,
            plan: plan || "anual",
            paymentId,
            amountCents,
            env,
          });
        } catch (e) {
          console.error("Post-purchase notification error in webhook:", e);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          paid: isPaid,
          event_id: eventId,
          meta_result: metaResult,
          notifications: notifResult,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: "unhandled_or_incomplete",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

async function sha256(str) {
  if (!str || typeof str !== "string") return "";
  const trimmed = str.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(trimmed));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(em) {
  if (!em || typeof em !== "string") return "";
  return em.trim().toLowerCase();
}

function normalizePhone(ph) {
  if (!ph || typeof ph !== "string") return "";
  const digits = ph.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length >= 8 && digits.length <= 11) return "55" + digits;
  return digits;
}

function normalizeName(name) {
  if (!name || typeof name !== "string") return "";
  return name.trim().toLowerCase();
}

function parseCookies(header) {
  const map = {};
  if (!header) return map;
  header.split(";").forEach((c) => {
    const idx = c.indexOf("=");
    if (idx !== -1) {
      const k = c.slice(0, idx).trim();
      const v = c.slice(idx + 1).trim();
      if (k) map[k] = v;
    }
  });
  return map;
}

function isValidFbCookie(val) {
  if (!val || typeof val !== "string") return "";
  const p = val.split(".");
  return p.length >= 4 && p[0] === "fb" && /^\d+$/.test(p[1]) && /^\d+$/.test(p[2]) && Boolean(p[3]) ? val : "";
}
