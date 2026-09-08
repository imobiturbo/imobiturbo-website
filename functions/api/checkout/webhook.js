// Cloudflare Pages Function: /api/checkout/webhook
// Processa webhooks de liquidação do AbacatePay e Asaas para Imobiturbo
// Dispara evento Purchase server-side garantido e idempotente para Meta CAPI (Graph API v25.0)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Asaas-Access-Token",
};

const DEFAULT_PIXEL_ID = "1025303472485246";
const DEFAULT_CAPI_TOKEN =
  "EABAV1IhEOAkBR1gBGluZBDvUnoGmnZC1s2EXMkQw8nX8m7jIYyf1BJ3MYW0Lg9bGEOB889r3nTrzZBowQPMCpVNfX4j9ZA7bWIegc4fNJdAIdEoIknVZB3PUmfxaz2UmI6JhyCUMU0RMknny3oqv5Ni1DNA19rVs6OAJGUS2M3kjri6nGKs9SpkcHrbO6Lm3nGQZDZD";

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

    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    const userAgent = request.headers.get("user-agent") || "";
    const cookies = parseCookies(request.headers.get("Cookie") || "");

    let isPaid = false;
    let paymentId = "";
    let amount = 0;
    let email = "";
    let phone = "";
    let name = "";
    let fbp = "";
    let fbc = "";
    let externalRef = "";
    let contentName = "Comunidade Imobiturbo";

    // 1. AbacatePay Webhook Detection
    if (
      payload.event === "billing.paid" ||
      (payload.data && (payload.data.status === "PAID" || payload.data.status === "APPROVED" || payload.data.status === "COMPLETED"))
    ) {
      isPaid = true;
      const data = payload.data || {};
      paymentId = data.id || payload.id || "";
      // AbacatePay amount em centavos -> converter para reais
      amount = typeof data.amount === "number" ? data.amount / 100 : 0;
      const cust = data.customer || payload.customer || {};
      email = cust.email || "";
      phone = cust.cellphone || cust.phone || "";
      name = cust.name || "";
      fbp = data.metadata?.fbp || cookies["_fbp"] || "";
      fbc = data.metadata?.fbc || cookies["_fbc"] || "";
      externalRef = data.metadata?.eventId || "";
      if (data.description) contentName = data.description;
    }
    // 2. Asaas Webhook Detection
    else if (
      ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "CHECKOUT_PAID", "PIX_CREDIT_RECEIVED"].includes(payload.event) ||
      (payload.payment && (payload.payment.status === "RECEIVED" || payload.payment.status === "CONFIRMED"))
    ) {
      isPaid = true;
      const payment = payload.payment || {};
      paymentId = payment.id || payload.id || "";
      amount = Number(payment.value || payment.netValue || 0);
      const cust = payload.customer || (typeof payment.customer === "object" ? payment.customer : {});
      email = cust.email || "";
      phone = cust.mobilePhone || cust.phone || "";
      name = cust.name || "";
      fbp = cookies["_fbp"] || "";
      fbc = cookies["_fbc"] || "";
      externalRef = payment.externalReference || "";
      if (payment.description) contentName = payment.description;
    } else {
      // Eventos não-financeiros (ex: PAYMENT_CREATED, PAYMENT_UPDATED) retornam 200 OK sem disparar compra
      return new Response(
        JSON.stringify({ ok: true, status: "ignored_event", event: payload.event || "unknown" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let metaResult = null;
    let eventId = null;

    if (isPaid && paymentId) {
      // Idempotência garantida: usa externalReference (eventId do checkout) ou purch_<paymentId>
      eventId = externalRef || `purch_${paymentId}`;
      const pixelId = (env && env.META_PIXEL_ID) || DEFAULT_PIXEL_ID;
      const token = (env && env.META_ACCESS_TOKEN) || DEFAULT_CAPI_TOKEN;

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
    }

    return new Response(
      JSON.stringify({
        ok: true,
        paid: isPaid,
        event_id: eventId,
        meta_result: metaResult,
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
