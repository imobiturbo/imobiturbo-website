import test from "node:test";
import assert from "node:assert/strict";
import {
  checkoutUrl,
  trackingFrom,
  loadConfig,
  registerLead,
  type Lead,
} from "../src/lib/registration.ts";
const lead: Lead = {
  name: " Participante ",
  email: "p@example.com",
  phone: "(21) 99999-0000",
  profile: "corretor",
  consent: true,
  tracking: { utm_source: "organico" },
};
const response = (body: unknown, status = 200) =>
  (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

test("registro usa o endpoint e contrato sem CPF/cartão; só retorna checkout após ok", async () => {
  let request: { url: unknown; init?: RequestInit } | undefined;
  const mock = (async (url, init) => {
    request = { url, init };
    return new Response(
      JSON.stringify({
        ok: true,
        checkoutUrl: "https://www.asaas.com/c/exemplo",
      }),
    );
  }) as typeof fetch;
  assert.equal(
    await registerLead(lead, mock),
    "https://www.asaas.com/c/exemplo",
  );
  assert.equal(request!.url, "/api/oficina/lead");
  const payload = JSON.parse(request!.init!.body as string);
  assert.deepEqual(payload, {
    ...lead,
    name: "Participante",
    phone: "21999990000",
  });
  assert.equal(request!.init!.method, "POST");
});
test("erro HTTP, ok falso, JSON inválido ou checkout inválido não liberam redirecionamento", async () => {
  await assert.rejects(
    registerLead(
      lead,
      response(
        { ok: true, checkoutUrl: "https://www.asaas.com/c/exemplo" },
        500,
      ),
    ),
    /Tente novamente/,
  );
  await assert.rejects(
    registerLead(
      lead,
      response({ ok: false, checkoutUrl: "https://www.asaas.com/c/exemplo" }),
    ),
    /registro não foi confirmado/,
  );
  await assert.rejects(
    registerLead(
      lead,
      (async () => new Response("invalid-json")) as typeof fetch,
    ),
    /Tente novamente/,
  );
  await assert.rejects(
    registerLead(
      lead,
      response({ ok: true, checkoutUrl: "https://evil.example/" }),
    ),
    /validar o checkout/,
  );
});
test("config só abre pagamento para preço e datas confirmados, checkout válido", async () => {
  assert.equal(
    (
      await loadConfig(
        response({
          checkoutUrl: "https://asaas.com/c/test",
          price: 47,
          datesConfirmed: true,
        }),
      )
    ).price,
    47,
  );
  for (const patch of [
    { price: 997 },
    { datesConfirmed: false },
    { checkoutUrl: null },
  ])
    await assert.rejects(
      loadConfig(
        response({
          checkoutUrl: "https://asaas.com/c/test",
          price: 47,
          datesConfirmed: true,
          ...patch,
        }),
      ),
      /preparação/,
    );
});
test("somente atribuição permitida é enviada, sem parâmetros pessoais e sem persistência", () => {
  assert.deepEqual(
    trackingFrom(
      "?utm_source=base&utm_campaign=oficina&email=p@example.com&token=secret",
    ),
    { utm_source: "base", utm_campaign: "oficina" },
  );
  assert.equal(
    trackingFrom("?utm_term=" + "a".repeat(400)).utm_term.length,
    300,
  );
});
test("consentimento, perfil, e-mail e telefone inválidos bloqueiam registro", async () => {
  for (const patch of [
    { consent: false },
    { profile: "admin" },
    { email: "invalido" },
    { phone: "123" },
    { name: "" },
  ])
    await assert.rejects(
      registerLead(
        { ...lead, ...patch },
        response({ ok: true, checkoutUrl: "https://asaas.com/c/test" }),
      ),
    );
});
test("checkout rejeita protocolo, domínio ou credenciais inesperados", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://asaas.com/c/test",
    "https://asaas.com.evil.test",
    "https://user:pass@asaas.com/",
  ])
    assert.throws(() => checkoutUrl(url));
});

test("Lead é confirmado após ok da API, mesmo se faltar URL; erro de API não confirma", async () => {
  let confirmed = 0;
  const callback = () => {
    confirmed++;
  };
  await assert.rejects(registerLead(lead, response({ ok: false }), callback));
  assert.equal(confirmed, 0);
  await assert.rejects(
    registerLead(lead, response({ ok: true, checkoutUrl: null }), callback),
  );
  assert.equal(confirmed, 1);
});
test("source/campaign/adset/ad e atribuição Meta são preservados", () => {
  assert.deepEqual(
    trackingFrom(
      "?source=meta&campaign=oficina&adset=corretores&ad=criativo1&imt_adset_id=123&imt_ad_id=456&cpf=ignore",
    ),
    {
      source: "meta",
      campaign: "oficina",
      adset: "corretores",
      ad: "criativo1",
      imt_adset_id: "123",
      imt_ad_id: "456",
    },
  );
});
