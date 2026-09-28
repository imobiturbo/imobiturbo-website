const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const {
  formatPostPurchaseEmail,
  formatPostPurchaseWhatsApp,
  provisionCommunityMembership,
  sendPostPurchaseNotifications,
} = require("../functions/api/checkout/_notifications.js");

test("formatPostPurchaseEmail generates complete access kit (Club + OS + WhatsApp Community) and isolates Comunidade from Mentoria", () => {
  const emailData = formatPostPurchaseEmail({
    name: "Carlos Eduardo",
    email: "carlos@imobiliariaexemplo.com.br",
    plan: "anual",
  });

  assert.ok(emailData.subject.includes("Comunidade Imobiturbo"), "Subject must mention Comunidade Imobiturbo");
  assert.ok(emailData.subject.includes("acessos"), "Subject must mention acessos");

  const html = emailData.html;
  // Personalization
  assert.ok(html.includes("Carlos Eduardo") || html.includes("Carlos"), "Must personalize with buyer's name");
  assert.ok(html.includes("carlos@imobiliariaexemplo.com.br"), "Must show the buyer's email for login instructions");

  // Rule: Comunidade has training tracks & recorded mentoria meetings, NO live meetings
  assert.ok(html.includes("gravações") && html.includes("mentoria"), "Must mention mentoria recordings");
  assert.ok(html.includes("trilhas de treinamento"), "Must mention training tracks");
  assert.ok(!html.includes("1 reunião por semana") && !html.includes("encontro ao vivo"), "Must NOT promise live meetings for Comunidade");

  // Active Accesses present
  assert.ok(html.includes("club.imobiturbo.com.br/login"), "Must contain direct Club login link");
  assert.ok(html.includes("os.imobiturbo.com.br/login"), "Must contain CRM Imobiturbo OS login link");
  assert.ok(html.includes("chat.whatsapp.com/Iy4Uiw5t0630oK4MgZarFj"), "Must contain WhatsApp Community link");
  assert.ok(!html.includes("radar.imobiturbo.com.br"), "Must NOT contain deactivated Radar link");
  assert.ok(!html.includes("sites.imobiturbo.com.br"), "Must NOT contain deactivated Sites link");
  assert.ok(html.includes("5521969516183") || html.includes("96951-6183"), "Must contain official WhatsApp support number");
});

test("formatPostPurchaseWhatsApp formats template status_confirmado_120626 with 3 parameters", () => {
  const waPayload = formatPostPurchaseWhatsApp({
    name: "Mariana Souza",
    email: "mariana@gmail.com",
    phone: "21999998888",
    plan: "anual",
  });

  assert.equal(waPayload.messaging_product, "whatsapp");
  assert.equal(waPayload.type, "template");
  assert.equal(waPayload.template.name, "status_confirmado_120626");
  assert.equal(waPayload.template.language.code, "pt_BR");
  assert.equal(waPayload.to, "5521999998888", "Must format phone to E.164 with 55 country code");

  const bodyComponent = waPayload.template.components.find((c) => c.type === "body");
  assert.ok(bodyComponent, "Must contain body component");
  assert.equal(bodyComponent.parameters.length, 3, "Template must have exactly 3 parameters");

  // Param 1: fits 'A {{1}} sucesso!'
  const p1 = bodyComponent.parameters[0].text;
  assert.ok(p1.includes("sua vaga") || p1.includes("sua inscrição") || p1.includes("sua matrícula"), "Param 1 must grammatically complete 'A [p1] sucesso!'");
  assert.ok(p1.endsWith(" com"), "Param 1 must end with 'com' to flow into 'sucesso!'");

  // Param 2: content body with Club (recordings) + OS + WhatsApp Community
  const p2 = bodyComponent.parameters[1].text;
  assert.ok(p2.includes("Mariana"), "Param 2 must greet user");
  assert.ok(p2.includes("Imobiturbo Club") || p2.includes("Comunidade"), "Param 2 must mention Club or Comunidade");
  assert.ok(p2.includes("gravações") || p2.includes("trilhas"), "Param 2 must mention recordings/tracks");
  assert.ok(!p2.includes("encontro ao vivo"), "Param 2 must NOT promise live meetings");
  assert.ok(!p2.includes("Radar de Demanda"), "Param 2 must NOT mention deactivated Radar");
  assert.ok(!p2.includes("Criador de Sites"), "Param 2 must NOT mention deactivated Sites");
  assert.ok(p2.includes("os.imobiturbo.com.br/login"), "Param 2 must mention OS login URL");
  assert.ok(p2.includes("WhatsApp"), "Param 2 must mention WhatsApp");
  assert.ok(p2.includes("mariana@gmail.com"), "Param 2 must mention buyer email");

  // Param 3: Central Link -> WhatsApp Community
  const p3 = bodyComponent.parameters[2].text;
  assert.equal(p3, "https://chat.whatsapp.com/Iy4Uiw5t0630oK4MgZarFj", "Param 3 must be the official WhatsApp community link");
});

test("provisionCommunityMembership calls Supabase RPC with proper parameters for activation and cancellation", async () => {
  const calls = [];
  const mockFetch = async (url, options) => {
    calls.push({ url, method: options.method, headers: options.headers, body: JSON.parse(options.body || "{}") });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, email: "cliente@imobiturbo.com.br", action: options.body.includes("cancel") ? "cancel" : "activate" }),
    };
  };

  // Test 1: Activate
  const actResult = await provisionCommunityMembership({
    email: "cliente@imobiturbo.com.br",
    name: "Cliente Teste",
    phone: "21999998888",
    plan: "anual",
    action: "activate",
    source: "checkout_vagas",
    transactionId: "pay_act_001",
    amountCents: 99700,
    fetchFn: mockFetch,
  });
  assert.equal(actResult.ok, true);
  assert.equal(calls[0].url, "https://api.os.imobiturbo.com.br/rest/v1/rpc/provision_community_membership");
  assert.equal(calls[0].body.p_action, "activate");
  assert.equal(calls[0].body.p_plan, "anual");
  assert.equal(calls[0].body.p_amount_cents, 99700);

  // Test 2: Cancel (Refund)
  const cancelResult = await provisionCommunityMembership({
    email: "cliente@imobiturbo.com.br",
    action: "cancel",
    transactionId: "pay_act_001",
    fetchFn: mockFetch,
  });
  assert.equal(cancelResult.ok, true);
  assert.equal(calls[1].body.p_action, "cancel");
});

test("sendPostPurchaseNotifications executes CRM provisioning, ZeptoMail email, Meta WhatsApp (Sites deactivated)", async () => {
  const calls = [];
  const mockFetch = async (url, options) => {
    calls.push({ url, method: options.method, headers: options.headers, body: JSON.parse(options.body || "{}") });
    if (url.includes("/rest/v1/rpc/provision_community_membership")) {
      return { ok: true, status: 200, json: async () => ({ success: true, lead_id: "lead_mock_123" }) };
    }
    if (url.includes("api.zeptomail.com")) {
      return { ok: true, json: async () => ({ message: "OK", code: "EM_104" }) };
    }
    if (url.includes("graph.facebook.com")) {
      return { ok: true, json: async () => ({ messages: [{ id: "wam_mock_456" }] }) };
    }
    return { ok: true, json: async () => ({}) };
  };

  const result = await sendPostPurchaseNotifications({
    email: "teste@imobiturbo.com.br",
    name: "Teste Aluno",
    phone: "(21) 98374-7796",
    plan: "anual",
    paymentId: "pay_test_001",
    amountCents: 99700,
    env: {
      ZEPTOMAIL_TOKEN: "zepto_mock_token",
      META_WHATSAPP_TOKEN: "meta_mock_token",
      META_PHONE_NUMBER_ID: "1066935829837217",
    },
    fetchFn: mockFetch,
  });

  assert.equal(result.crmProvisioned, true, "CRM must be provisioned");
  assert.equal(result.emailSent, true, "Email must be sent via ZeptoMail");
  assert.equal(result.whatsappSent, true, "WhatsApp must be sent");
  assert.equal(result.sitesSynced, false, "Sites sync must be skipped when deactivated");

  // Check calls
  assert.equal(calls.length, 3, "Must trigger 3 API calls: CRM RPC, ZeptoMail, Meta WhatsApp");
  assert.ok(calls.some((c) => c.url.includes("/rest/v1/rpc/provision_community_membership")));
  assert.ok(calls.some((c) => c.url.includes("api.zeptomail.com/v1.1/email")));
  assert.ok(calls.some((c) => c.url.includes("graph.facebook.com")));
  assert.ok(!calls.some((c) => c.url.includes("sites.imobiturbo.com.br")));

  // Verify ZeptoMail auth header
  const zeptoCall = calls.find((c) => c.url.includes("api.zeptomail.com"));
  assert.ok(zeptoCall.headers.Authorization.startsWith("Zoho-enczapikey "));
  assert.equal(zeptoCall.body.bounce_address, "bounce@bounce-zem.imobiturbo.com.br");
  assert.equal(zeptoCall.body.from.address, "noreply@imobiturbo.com.br");
});
