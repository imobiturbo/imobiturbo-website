// Cloudflare Pages Function: /api/checkout/status
// Consulta status de aprovação de pagamentos no AbacatePay ou Asaas
// Dispara evento Purchase server-side para Meta CAPI (Graph API v25.0) quando pago

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const DEFAULT_PIXEL_ID = "1025303472485246";
const DEFAULT_CAPI_TOKEN =
  "EABAV1IhEOAkBR1gBGluZBDvUnoGmnZC1s2EXMkQw8nX8m7jIYyf1BJ3MYW0Lg9bGEOB889r3nTrzZBowQPMCpVNfX4j9ZA7bWIegc4fNJdAIdEoIknVZB3PUmfxaz2UmI6JhyCUMU0RMknny3oqv5Ni1DNA19rVs6OAJGUS2M3kjri6nGKs9SpkcHrbO6Lm3nGQZDZD";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const gateway = url.searchParams.get("gateway") || "abacatepay";
  const paymentId = url.searchParams.get("paymentId");

  if (!paymentId) {
    return new Response(JSON.stringify({ success: false, error: "paymentId obrigatório" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const abacateKey = (env && env.ABACATEPAY_API_KEY) || "";
  const asaasKey = (env && env.ASAAS_API_KEY) || "";

  try {
    if (gateway === "abacatepay") {
      const resp = await fetch(
        `https://api.abacatepay.com/v2/transparents/check?id=${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: `Bearer ${abacateKey}` },
          signal: AbortSignal.timeout(5000),
        }
      );
      const json = await resp.json();

      if (resp.ok && json.success && json.data) {
        const status = json.data.status || "PENDING";
        const isPaid = status === "PAID" || status === "COMPLETED";

        if (isPaid) {
          const promise = dispatchPurchaseToMetaCapi({
            env,
            request,
            paymentId,
            eventId: json.data?.metadata?.eventId || url.searchParams.get("eventId") || `purch_${paymentId}`,
            amount: typeof json.data.amount === "number" ? json.data.amount / 100 : 957,
            contentName: json.data.description || "Comunidade Imobiturbo",
            email: json.data?.metadata?.email || "",
            phone: json.data?.metadata?.phone || "",
            name: json.data?.metadata?.name || "",
            fbp: json.data?.metadata?.fbp || "",
            fbc: json.data?.metadata?.fbc || "",
          });
          if (context.waitUntil) {
            context.waitUntil(promise);
          } else {
            await promise;
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            gateway: "abacatepay",
            paymentId,
            status,
            paid: isPaid,
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, gateway: "abacatepay", error: json.error || "Erro ao consultar status" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    } else if (gateway === "asaas") {
      const resp = await fetch(
        `https://api.asaas.com/v3/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: { access_token: asaasKey },
          signal: AbortSignal.timeout(5000),
        }
      );
      const data = await resp.json();

      if (resp.ok && data.id) {
        const isPaid =
          data.status === "CONFIRMED" ||
          data.status === "RECEIVED" ||
          data.status === "RECEIVED_IN_CASH";

        if (isPaid) {
          const promise = dispatchPurchaseToMetaCapi({
            env,
            request,
            paymentId,
            eventId: data.externalReference || url.searchParams.get("eventId") || `purch_${paymentId}`,
            amount: Number(data.value || 957),
            contentName: data.description || "Comunidade Imobiturbo",
            email: "",
            phone: "",
            name: "",
          });
          if (context.waitUntil) {
            context.waitUntil(promise);
          } else {
            await promise;
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            gateway: "asaas",
            paymentId,
            status: data.status,
            paid: isPaid,
            invoiceUrl: data.invoiceUrl,
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          gateway: "asaas",
          error: (data.errors && data.errors[0]?.description) || "Erro ao consultar status no Asaas",
        }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Gateway desconhecido" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

async function dispatchPurchaseToMetaCapi({
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
}) {
  try {
    const pixelId = (env && env.META_PIXEL_ID) || DEFAULT_PIXEL_ID;
    const token = (env && env.META_ACCESS_TOKEN) || DEFAULT_CAPI_TOKEN;

    const cookies = parseCookies(request.headers.get("Cookie") || "");
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    const userAgent = request.headers.get("user-agent") || "";

    const resolvedFbp = isValidFbCookie(fbp) ? fbp : (isValidFbCookie(cookies["_fbp"]) ? cookies["_fbp"] : "");
    const resolvedFbc = isValidFbCookie(fbc) ? fbc : (isValidFbCookie(cookies["_fbc"]) ? cookies["_fbc"] : "");

    const userData = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };
    if (resolvedFbp) userData.fbp = resolvedFbp;
    if (resolvedFbc) userData.fbc = resolvedFbc;
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

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || `purch_${paymentId}`,
          event_source_url: "https://www.imobiturbo.com.br/vagas/",
          action_source: "website",
          user_data: userData,
          custom_data: {
            value: Number(amount) || 0,
            currency: "BRL",
            content_name: contentName || "Comunidade Imobiturbo",
            content_type: "product",
            num_items: 1,
          },
        },
      ],
    };

    if (env && env.META_TEST_EVENT_CODE) {
      payload.test_event_code = env.META_TEST_EVENT_CODE;
    }

    await fetch(
      `https://graph.facebook.com/v25.0/${pixelId}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      }
    );
  } catch (err) {
    console.error("Failed to dispatch Purchase to Meta CAPI from status.js:", err);
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
