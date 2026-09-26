const DEFAULT_HUB_COLLECT_URL = "https://track.nmidigital.tech/api/collect";
const DEFAULT_HUB_OPERATION_ID = "00000000-0000-0000-0000-000000000001";

function readCookie(request, name) {
  const header = request && request.headers ? request.headers.get("Cookie") || "" : "";
  const match = header.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}

export async function dispatchVerifiedPurchaseToHub({
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
  sessionId,
}) {
  const operationId = (env && env.HUB_TRACKING_OPERATION_ID) || DEFAULT_HUB_OPERATION_ID;
  const endpointBase = (env && env.HUB_TRACKING_COLLECT_URL) || DEFAULT_HUB_COLLECT_URL;
  if (!operationId || !paymentId) return false;

  const resolvedVisitorId = visitorId || `checkout-${paymentId}`;
  const resolvedSessionId = sessionId || visitorId || `checkout-${paymentId}`;

  const separator = endpointBase.includes("?") ? "&" : "?";
  const payload = {
    operationId,
    type: "Purchase",
    eventId: eventId || `purch_${paymentId}`,
    visitorId: resolvedVisitorId,
    sessionId: resolvedSessionId,
    url: "https://www.imobiturbo.com.br/vagas/",
    landing: "https://www.imobiturbo.com.br/vagas/",
    referrer: null,
    productId: "comunidade-imobiturbo",
    orderId: paymentId,
    valueCents: Math.round((Number(amount) || 0) * 100),
    currency: "BRL",
    ...(contentName ? { contentName } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(name ? { name } : {}),
    ...(fbp || readCookie(request, "_fbp") ? { fbp: fbp || readCookie(request, "_fbp") } : {}),
    ...(fbc || readCookie(request, "_fbc") ? { fbc: fbc || readCookie(request, "_fbc") } : {}),
  };

  try {
    const response = await fetch(`${endpointBase}${separator}operation=${encodeURIComponent(operationId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://www.imobiturbo.com.br" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
