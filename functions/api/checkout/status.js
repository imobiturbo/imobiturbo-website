// Cloudflare Pages Function: /api/checkout/status
// Consulta status de aprovação de pagamentos no AbacatePay ou Asaas

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
