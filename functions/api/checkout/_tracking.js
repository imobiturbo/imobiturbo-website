const DEFAULT_HUB_COLLECT_URL = "https://track.nmidigital.tech/api/collect";
const DEFAULT_HUB_OPERATION_ID = "00000000-0000-0000-0000-000000000001";
const CONSULTING_PRODUCT_ID = "consultoria-individual-natan";
const CONSULTING_OFFER_ID = "12e90537-263d-4150-9757-52193187ffbd";

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
  productId = "comunidade-imobiturbo",
  orderId,
  offerId,
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
    url: productId === "consultoria-individual-natan" ? "https://www.imobiturbo.com.br/vagas-obrigado" : "https://www.imobiturbo.com.br/vagas/",
    landing: productId === "consultoria-individual-natan" ? "https://www.imobiturbo.com.br/vagas-obrigado" : "https://www.imobiturbo.com.br/vagas/",
    referrer: null,
    productId,
    orderId: orderId || paymentId,
    ...(offerId || productId === CONSULTING_PRODUCT_ID ? { offerId: offerId || CONSULTING_OFFER_ID } : {}),
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

export async function dispatchPendingPurchaseToHub({
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
  paymentMethod,
  productId = "comunidade-imobiturbo",
  orderId,
  offerId,
}) {
  const operationId = (env && env.HUB_TRACKING_OPERATION_ID) || DEFAULT_HUB_OPERATION_ID;
  const endpointBase = (env && env.HUB_TRACKING_COLLECT_URL) || DEFAULT_HUB_COLLECT_URL;
  if (!operationId || !paymentId) return false;

  const resolvedVisitorId = visitorId || `checkout-${paymentId}`;
  const resolvedSessionId = sessionId || visitorId || `checkout-${paymentId}`;

  const separator = endpointBase.includes("?") ? "&" : "?";
  const payload = {
    operationId,
    type: "InitiateCheckout",
    eventId: eventId || `pending_${paymentId}`,
    visitorId: resolvedVisitorId,
    sessionId: resolvedSessionId,
    url: productId === "consultoria-individual-natan" ? "https://www.imobiturbo.com.br/vagas-obrigado" : "https://www.imobiturbo.com.br/vagas/",
    landing: productId === "consultoria-individual-natan" ? "https://www.imobiturbo.com.br/vagas-obrigado" : "https://www.imobiturbo.com.br/vagas/",
    referrer: null,
    productId,
    orderId: orderId || paymentId,
    ...(offerId || productId === CONSULTING_PRODUCT_ID ? { offerId: offerId || CONSULTING_OFFER_ID } : {}),
    valueCents: Math.round((Number(amount) || 0) * 100),
    currency: "BRL",
    status: "pending",
    paymentMethod: paymentMethod || "unknown",
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
