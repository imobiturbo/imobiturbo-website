// Cloudflare Pages Function: /api/checkout/webhook
// Processa webhooks de liquidação e cancelamento/reembolso: AbacatePay, Asaas e Hotmart para Imobiturbo
// Purchase é enviado pelo Hub após webhook financeiro autenticado; esta rota enriquece contexto.
// Dispara Kit de Boas-Vindas 4 em 1: CRM Lead (/0-funil-de-vendas) + E-mail ZeptoMail + WhatsApp Oficial + Sites D1
// Processa cancelamento/reembolso revogando acessos e marcando lead como lost

import {
  sendPostPurchaseNotifications,
  provisionCommunityMembership,
} from "./_notifications.js";
import { dispatchVerifiedPurchaseToHub, dispatchPendingPurchaseToHub } from "./_tracking.js";
import { authenticateHotmart, parseHotmartEvent } from "./_hotmart.js";
import { checkoutDetails, CONSULTING_PRODUCT_ID } from "./_products.js";
import { handleConsultingWebhook } from "./_consulting.js";
import { CAL_ASAAS_REFERENCE_PREFIX, parseCalAsaasReference, resolveCalAsaasConsultingPayment } from "./_cal-asaas.js";

import { identifyOficinaPayment } from "../oficina/_checkout.js";
import { tryCommunityPayment, communityAutomaticWebhook, communityErrorResponse } from "./_community-payments.js";
import { asaasConnection } from "./_community-orders.js";

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

    if (String(payload.event || '').startsWith('PIX_AUTOMATIC_RECURRING_AUTHORIZATION_')) {
      try {
        const managed = await communityAutomaticWebhook(env,request,payload);
        return Response.json({ ok:true,...managed },{ headers:CORS_HEADERS });
      } catch (error) { return communityErrorResponse(error,CORS_HEADERS); }
    }
    // Resolve the product before any membership side effects, including partial
    // metadata, deletion, refund and out-of-order Asaas notifications.
    if (payload.payment?.id) {
      if (env?.ASAAS_WEBHOOK_TOKEN && request.headers.get("asaas-access-token") !== env.ASAAS_WEBHOOK_TOKEN) {
        return Response.json({ ok: false, error: "asaas_unauthorized" }, { status: 401 });
      }
      if (!env?.ASAAS_API_KEY) return Response.json({ ok: false, error: "asaas_verification_unavailable" }, { status: 503 });
      const providerResponse = await fetch(`${asaasConnection(env).base}/payments/${encodeURIComponent(payload.payment.id)}`, {
        headers: { access_token: env.ASAAS_API_KEY, "User-Agent": "Imobiturbo-Checkout/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!providerResponse.ok) return Response.json({ ok: false, error: "asaas_verification_pending" }, { status: 503 });
      const verifiedPayment = await providerResponse.json();
      if (verifiedPayment.id !== payload.payment.id) return Response.json({ ok: false, error: "asaas_payment_mismatch" }, { status: 422 });
      if (await identifyOficinaPayment(verifiedPayment, env)) {
        return Response.json({ ok: true, status: "delegated_oficina" });
      }
      if (!env?.ASAAS_WEBHOOK_TOKEN || request.headers.get("asaas-access-token") !== env.ASAAS_WEBHOOK_TOKEN) {
        return Response.json({ ok: false, error: "asaas_unauthorized" }, { status: env?.ASAAS_WEBHOOK_TOKEN ? 401 : 503 });
      }
      try {
        const managed = await tryCommunityPayment({ env, request, webhook: true, payment: verifiedPayment, eventId: payload.id });
        if (managed) {
          if (managed.orderStatus !== "created") return Response.json({ ok: false, error: "community_order_reconciliation_pending" }, { status: 503 });
          if (managed.paid) {
            const delivery = dispatchVerifiedPurchaseToHub({ env, request, paymentId: managed.paymentId,
              eventId: managed.eventId, orderId: managed.orderId, amount: managed.amount,
              productId: managed.productId, contentName: "Comunidade Imobiturbo", ...managed.trackingBuyer });
            if (context.waitUntil) context.waitUntil(delivery); else await delivery;
          }
          return Response.json({ ok: true, ...managed }, { headers: CORS_HEADERS });
        }
      } catch (error) { return communityErrorResponse(error, CORS_HEADERS); }
      // Cal order references must be resolved before checkoutDetails() can
      // apply the community default. The provider-owned reference stays intact.
      if (typeof verifiedPayment.externalReference === "string" &&
          verifiedPayment.externalReference.startsWith(CAL_ASAAS_REFERENCE_PREFIX)) {
        const reference = parseCalAsaasReference(verifiedPayment.externalReference);
        if (!reference?.valid) return Response.json({ ok: false, error: "cal_asaas_invalid_reference" }, { status: 422 });
        let resolved;
        try {
          resolved = await resolveCalAsaasConsultingPayment({
            env, uid: reference.uid, payment: verifiedPayment,
          });
        } catch {
          return Response.json({ ok: false, error: "cal_asaas_order_lookup_unavailable" }, { status: 503 });
        }
        if (resolved.kind === "ignored_product") {
          return Response.json({ ok: true, status: "ignored_product" }, { status: 200 });
        }
        if (resolved.kind !== "consulting") {
          return Response.json({ ok: false, error: "cal_asaas_payment_mismatch" }, { status: 422 });
        }
        return await handleConsultingWebhook({
          request, env, paymentId: verifiedPayment.id, verifiedPayment,
          trustedDetails: resolved.details,
        });
      }
      if (checkoutDetails(verifiedPayment).productId === CONSULTING_PRODUCT_ID) {
        return await handleConsultingWebhook({ request, env, paymentId: verifiedPayment.id, verifiedPayment });
      }
      // An unknown provider-owned reference never inherits Community by name.
      if (checkoutDetails(verifiedPayment).productId === "unknown") return Response.json({ ok: true, status: "ignored_product" });
      payload.payment = verifiedPayment;
      delete payload.customer;
      // Status from the provider wins over an old notification event.
      payload.event = verifiedPayment.deleted ? "PAYMENT_DELETED" : ({
        RECEIVED: "PAYMENT_RECEIVED", CONFIRMED: "PAYMENT_CONFIRMED",
        RECEIVED_IN_CASH: "PAYMENT_RECEIVED", PENDING: "PAYMENT_CREATED",
        AWAITING_PAYMENT: "PAYMENT_AWAITING_PAYMENT", REFUNDED: "PAYMENT_REFUNDED",
        CHARGEBACK_REQUESTED: "PAYMENT_CHARGEBACK_REQUESTED",
        CHARGEBACK_DISPUTE: "PAYMENT_CHARGEBACK_DISPUTE",
        AWAITING_CHARGEBACK_REVERSAL: "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
      }[verifiedPayment.status] || "ASAAS_STATUS_IGNORED");
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
      const notifications = await sendPostPurchaseNotifications({
        ...hotmart, amountCents: Math.round(hotmart.amount * 100),
        purchaseProof: { approvedAt: hotmart.approvedAt }, env,
      });
      if (!notifications?.crmProvisioned) return Response.json({ ok: false, error: 'community_provisioning_pending' }, { status: 503 });
      return Response.json({ ok: true, paid: true, duplicate: Boolean(notifications.duplicate) });
    }

    let clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    let userAgent = request.headers.get("user-agent") || "";
    const cookies = parseCookies(request.headers.get("Cookie") || "");

    let isPaid = false;
    let isPending = false;
    let isCanceled = false;
    let paymentId = "";
    let amount = 0;
    let email = "";
    let phone = "";
    let name = "";
    let fbp = "";
    let fbc = "";
    let externalRef = "";
    let visitorId = "";
    let contentName = "Comunidade Imobiturbo";
    let plan = "anual";
    let paymentMethod = "";

    // 0. Hubla Webhook Detection
    const isHubla = Boolean(
      request.headers.get("x-hubla-token") ||
      request.headers.get("x-hubla-idempotency") ||
      (typeof payload.type === "string" && /^(invoice\.|subscription\.|membro\.|member\.|lead\.)/.test(payload.type)) ||
      Boolean(payload.event?.invoice || payload.event?.product)
    );

    if (isHubla) {
      if (env?.HUBLA_WEBHOOK_TOKEN) {
        const headerToken = request.headers.get("x-hubla-token");
        if (headerToken && headerToken !== env.HUBLA_WEBHOOK_TOKEN) {
          return new Response(JSON.stringify({ ok: false, error: "hubla_unauthorized" }), {
            status: 401,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }
      }

      const eventType = payload.type || "";
      const inv = payload.event?.invoice || {};
      const payer = inv.payer || payload.event?.user || {};
      const session = inv.paymentSession || {};
      const sessionCookies = session.cookies || {};
      const sessionParams = session.params || {};
      const subscriptions = payload.event?.subscriptions || [];
      const invoiceStatus = (inv.status || "").toLowerCase();

      if (
        eventType === "invoice.payment_succeeded" ||
        (eventType === "invoice.status_updated" && invoiceStatus === "paid") ||
        invoiceStatus === "paid"
      ) {
        isPaid = true;
        paymentId = inv.id || inv.orderId || payload.id || "";
        if (typeof inv.amount?.total === "number") {
          amount = inv.amount.total;
        } else if (typeof inv.amount?.totalCents === "number") {
          amount = inv.amount.totalCents / 100;
        } else if (typeof inv.amount?.subtotal === "number") {
          amount = inv.amount.subtotal;
        } else {
          amount = 0;
        }
        email = (payer.email || "").trim();
        phone = (payer.phone || "").trim();
        name = [payer.firstName, payer.lastName].filter(Boolean).join(" ").trim() || payer.name || "";
        fbp = sessionCookies.fbp || sessionParams.fbp || cookies["_fbp"] || "";
        fbc = sessionCookies.fbc || sessionParams.fbc || (sessionCookies.fbclid ? `fb.1.${Date.now()}.${sessionCookies.fbclid}` : "") || cookies["_fbc"] || "";
        if (session.ip) clientIp = session.ip;
        if (session.userAgent) userAgent = session.userAgent;
        externalRef = request.headers.get("x-hubla-idempotency") || sessionParams.visitorId || "";
        visitorId = sessionParams.visitorId || sessionParams.rt_vid || "";
        contentName = payload.event?.product?.name || "Comunidade Imobiturbo";
        paymentMethod = inv.paymentMethod || inv.method || payload.event?.paymentMethod || "";

        const urlPlan = (sessionParams.plan || "").toLowerCase();
        if (urlPlan === "annually" || urlPlan === "anual") {
          plan = "anual";
        } else if (urlPlan === "quarterly" || urlPlan === "trimestral") {
          plan = "trimestral";
        } else if (urlPlan === "monthly" || urlPlan === "mensal") {
          plan = "mensal";
        } else if (subscriptions[0]?.billingCycleMonths === 12) {
          plan = "anual";
        } else if (subscriptions[0]?.billingCycleMonths === 3) {
          plan = "trimestral";
        } else if (subscriptions[0]?.billingCycleMonths === 1) {
          plan = "mensal";
        } else if (amount >= 800) {
          plan = "anual";
        } else if (amount >= 300) {
          plan = "trimestral";
        } else {
          plan = "mensal";
        }
      } else if (
        eventType === "invoice.created" ||
        (eventType === "invoice.status_updated" && (invoiceStatus === "pending" || invoiceStatus === "waiting_payment")) ||
        invoiceStatus === "pending" ||
        invoiceStatus === "waiting_payment"
      ) {
        isPending = true;
        paymentId = inv.id || inv.orderId || payload.id || "";
        if (typeof inv.amount?.total === "number") {
          amount = inv.amount.total;
        } else if (typeof inv.amount?.totalCents === "number") {
          amount = inv.amount.totalCents / 100;
        } else if (typeof inv.amount?.subtotal === "number") {
          amount = inv.amount.subtotal;
        } else {
          amount = 0;
        }
        email = (payer.email || "").trim();
        phone = (payer.phone || "").trim();
        name = [payer.firstName, payer.lastName].filter(Boolean).join(" ").trim() || payer.name || "";
        fbp = sessionCookies.fbp || sessionParams.fbp || cookies["_fbp"] || "";
        fbc = sessionCookies.fbc || sessionParams.fbc || (sessionCookies.fbclid ? `fb.1.${Date.now()}.${sessionCookies.fbclid}` : "") || cookies["_fbc"] || "";
        if (session.ip) clientIp = session.ip;
        if (session.userAgent) userAgent = session.userAgent;
        externalRef = request.headers.get("x-hubla-idempotency") || sessionParams.visitorId || "";
        visitorId = sessionParams.visitorId || sessionParams.rt_vid || "";
        contentName = payload.event?.product?.name || "Comunidade Imobiturbo";
        paymentMethod = inv.paymentMethod || inv.method || payload.event?.paymentMethod || "";

        const urlPlan = (sessionParams.plan || "").toLowerCase();
        if (urlPlan === "annually" || urlPlan === "anual") {
          plan = "anual";
        } else if (urlPlan === "quarterly" || urlPlan === "trimestral") {
          plan = "trimestral";
        } else if (urlPlan === "monthly" || urlPlan === "mensal") {
          plan = "mensal";
        } else if (subscriptions[0]?.billingCycleMonths === 12) {
          plan = "anual";
        } else if (subscriptions[0]?.billingCycleMonths === 3) {
          plan = "trimestral";
        } else if (subscriptions[0]?.billingCycleMonths === 1) {
          plan = "mensal";
        } else if (amount >= 800) {
          plan = "anual";
        } else if (amount >= 300) {
          plan = "trimestral";
        } else {
          plan = "mensal";
        }
      } else if (
        ["invoice.refunded", "invoice.disputed", "invoice.chargeback", "subscription.deactivated", "membro.acesso_removido"].includes(eventType) ||
        ["refunded", "disputed", "chargeback", "canceled"].includes(invoiceStatus)
      ) {
        isCanceled = true;
        paymentId = inv.id || inv.orderId || payload.id || "";
        email = (payer.email || "").trim();
        phone = (payer.phone || "").trim();
        name = [payer.firstName, payer.lastName].filter(Boolean).join(" ").trim() || payer.name || "";
      } else {
        return new Response(
          JSON.stringify({ ok: true, status: "ignored_event", provider: "hubla", event: eventType }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
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
      paymentMethod = data.methods ? data.methods.join(",") : "pix";
    }
    // 1.05 AbacatePay Webhook Detection (Pendente)
    else if (
      payload.event === "billing.created" ||
      (payload.data && payload.data.status === "PENDING")
    ) {
      isPending = true;
      const data = payload.data || {};
      paymentId = data.id || payload.id || "";
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
      paymentMethod = data.methods ? data.methods.join(",") : "pix";
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
    // 2.05 Asaas Webhook Detection (Pendente)
    else if (
      ["PAYMENT_CREATED", "PAYMENT_AWAITING_PAYMENT"].includes(payload.event) ||
      (payload.payment && (payload.payment.status === "PENDING" || payload.payment.status === "AWAITING_PAYMENT"))
    ) {
      isPending = true;
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
      paymentMethod = payment.billingType || "";
      if (payment.description) {
        contentName = payment.description;
        const descLower = payment.description.toLowerCase();
        if (descLower.includes("trimestral")) plan = "trimestral";
        else if (descLower.includes("mensal")) plan = "mensal";
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

    if (payload.payment) {
      const details = checkoutDetails(payload.payment);
      externalRef = details.eventId;
      plan = details.plan;
      if (details.offerCode === "live997") amount = details.orderAmount;
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

    if (isPending && paymentId) {
      eventId = externalRef || `pending_${paymentId}`;
      await dispatchPendingPurchaseToHub({
        env,
        request,
        paymentId,
        eventId,
        amount,
        contentName,
        email,
        phone,
        name,
        fbp,
        fbc,
        visitorId,
        paymentMethod,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          pending: true,
          paymentId,
          amount,
          plan,
          event_id: eventId,
          provider: isHubla ? "hubla" : isHotmart ? "hotmart" : "gateway",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (isPaid && paymentId) {
      // Idempotência garantida: usa externalReference (eventId do checkout) ou purch_<paymentId>
      eventId = externalRef || `purch_${paymentId}`;
      // The authenticated Asaas webhook in Hub owns Purchase delivery and retries.
      // Browser polling and this product-delivery webhook only provide context.
      metaResult = { delegated: true, authority: "hub_financial_webhook", eventId, orderId: paymentId };

      await dispatchVerifiedPurchaseToHub({
        env, request, paymentId, eventId, amount, contentName, email, phone, name, fbp, fbc, visitorId,
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
          const approvedAt = payload.payment?.paymentDate || payload.payment?.confirmedDate || payload.payment?.clientPaymentDate || payload.payment?.dateCreated || new Date().toISOString();
          notifResult = await sendPostPurchaseNotifications({
            email,
            name,
            phone,
            plan: plan || "anual",
            liveOffer: payload.payment && checkoutDetails(payload.payment).offerCode === "live997",
            paymentId: payload.payment && checkoutDetails(payload.payment).offerCode === "live997" ? checkoutDetails(payload.payment).orderId : paymentId,
            amountCents,
            purchaseProof: { approvedAt: new Date(approvedAt).toISOString() },
            env: { COMMUNITY_ORGANIZATION_ID: (env && env.COMMUNITY_ORGANIZATION_ID) || "18b103e6-a006-45ac-84d5-62312f45ba77", ...env },
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
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
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
