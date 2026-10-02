export interface OficinaConfig {
  checkoutUrl: string | null;
  price: number;
  datesConfirmed: boolean;
}
export interface Lead {
  name: string;
  email: string;
  phone: string;
  profile: string;
  consent: boolean;
  tracking: Record<string, string>;
}
export function checkoutUrl(value: unknown): string {
  if (typeof value !== "string")
    throw new Error(
      "O checkout ainda não está disponível. Tente novamente ou fale com o suporte.",
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Não foi possível validar o checkout. Tente novamente ou fale com o suporte.",
    );
  }
  if (
    url.protocol !== "https:" ||
    !(url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com")) ||
    url.username ||
    url.password
  )
    throw new Error("Não foi possível validar o checkout. Fale com o suporte.");
  return url.href;
}
export function trackingFrom(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  return Object.fromEntries(
    [
      "source",
      "campaign",
      "adset",
      "ad",
      "src",
      "sck",
      "utm_id",
      "imt_adset_name",
      "imt_adset_id",
      "imt_ad_id",
      "imt_placement",
      "utm_adset",
      "utm_ad",
      "gbraid",
      "wbraid",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
      "fbclid",
      "msclkid",
      "ttclid",
    ].flatMap((key) => {
      const value = params.get(key);
      return value ? [[key, value.slice(0, 300)]] : [];
    }),
  );
}
export function validateLead(lead: Lead): void {
  if (lead.name.trim().length < 2)
    throw new Error("Informe seu nome para continuar.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim()))
    throw new Error("Confira o e-mail informado.");
  if (!/^\d{10,13}$/.test(lead.phone.replace(/\D/g, "")))
    throw new Error("Informe seu telefone com DDD.");
  if (!["corretor", "gestor", "cliente_atual"].includes(lead.profile))
    throw new Error("Selecione seu perfil.");
  if (lead.consent !== true)
    throw new Error(
      "Confirme que leu as condições e a política de privacidade.",
    );
}
async function request(
  url: string,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<unknown> {
  try {
    const response = await fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new Error(
        "Não foi possível concluir agora. Tente novamente ou fale com o suporte.",
      );
    return await response.json();
  } catch (e) {
    if (e instanceof Error && /Tente novamente/.test(e.message)) throw e;
    throw new Error(
      "Não foi possível conectar ao serviço. Tente novamente ou fale com o suporte.",
    );
  }
}
export async function loadConfig(
  fetcher: typeof fetch = fetch,
): Promise<OficinaConfig> {
  const result = (await request(
    "/api/oficina/config",
    { method: "GET", cache: "no-store" },
    fetcher,
  )) as OficinaConfig;
  if (
    !result ||
    result.price !== 47 ||
    result.datesConfirmed !== true ||
    !result.checkoutUrl
  )
    throw new Error(
      "As inscrições estão em preparação. Tente novamente mais tarde ou fale com o suporte.",
    );
  return { ...result, checkoutUrl: checkoutUrl(result.checkoutUrl) };
}
export async function registerLead(
  lead: Lead,
  fetcher: typeof fetch = fetch,
  onConfirmed?: () => void,
): Promise<string> {
  validateLead(lead);
  const result = (await request(
    "/api/oficina/lead",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lead,
        name: lead.name.trim(),
        email: lead.email.trim(),
        phone: lead.phone.replace(/\D/g, ""),
      }),
    },
    fetcher,
  )) as { ok?: boolean; checkoutUrl?: string };
  if (result?.ok !== true)
    throw new Error(
      "Seu registro não foi confirmado. Tente novamente ou fale com o suporte.",
    );
  onConfirmed?.();
  return checkoutUrl(result.checkoutUrl);
}
