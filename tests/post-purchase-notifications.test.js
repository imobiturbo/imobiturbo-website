const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const {
  formatPostPurchaseEmail,
  formatPostPurchaseWhatsApp,
  sendPostPurchaseNotifications,
} = require("../functions/api/checkout/_notifications.js");

test("formatPostPurchaseEmail generates complete 4-in-1 access kit and isolates Comunidade from Mentoria", () => {
  const emailData = formatPostPurchaseEmail({
    name: "Carlos Eduardo",
    email: "carlos@imobiliariaexemplo.com.br",
    plan: "anual",
  });

  assert.ok(emailData.subject.includes("Comunidade Imobiturbo"), "Subject must mention Comunidade Imobiturbo");
  assert.ok(emailData.subject.includes("4 acessos"), "Subject must mention 4 acessos");

  const html = emailData.html;
  // Personalization
  assert.ok(html.includes("Carlos Eduardo") || html.includes("Carlos"), "Must personalize with buyer's name");
  assert.ok(html.includes("carlos@imobiliariaexemplo.com.br"), "Must show the buyer's email for login instructions");

  // Rule: Comunidade is 1x weekly meeting, distinct from Mentoria (2x/week)
  assert.ok(html.includes("1 reunião por semana") || html.includes("1 encontro semanal") || html.includes("1 encontro por semana"), "Must specify 1 weekly meeting for Comunidade");
  assert.ok(!html.includes("2 reuniões por semana"), "Must NOT include 2 meetings/week (exclusive to VIP Mentoria)");

  // 4 Accesses present
  assert.ok(html.includes("radar.imobiturbo.com.br/?token=IMOBICLUB2026"), "Must contain direct unlocked Radar link with token");
  assert.ok(html.includes("sites.imobiturbo.com.br"), "Must contain Sites URL");
  assert.ok(html.includes("código") && html.includes("6 dígitos"), "Must instruct OTP code for Sites without password");
  assert.ok(html.includes("app.imobiturbo.com.br/onboarding"), "Must contain CRM Imobiturbo OS link");
  assert.ok(html.includes("5521983747796") || html.includes("98374-7796"), "Must contain official WhatsApp support number");
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

  // Param 2: content body with the 4 accesses and single weekly meeting
  const p2 = bodyComponent.parameters[1].text;
  assert.ok(p2.includes("Mariana"), "Param 2 must greet user");
  assert.ok(p2.includes("Comunidade & Clube") || p2.includes("Comunidade"), "Param 2 must mention Comunidade");
  assert.ok(p2.includes("1 encontro") || p2.includes("1 reunião"), "Param 2 must specify 1 meeting per week");
  assert.ok(p2.includes("Radar de Demanda"), "Param 2 must mention Radar");
  assert.ok(p2.includes("Criador de Sites") || p2.includes("Sites"), "Param 2 must mention Sites");
  assert.ok(p2.includes("CRM"), "Param 2 must mention CRM");
  assert.ok(p2.includes("mariana@gmail.com"), "Param 2 must mention buyer email");

  // Param 3: Central Link
  const p3 = bodyComponent.parameters[2].text;
  assert.ok(p3.startsWith("https://"), "Param 3 must be a valid URL link");
  assert.ok(p3.includes("radar.imobiturbo.com.br") || p3.includes("app.imobiturbo.com.br"), "Param 3 must link to Radar or App");
});

test("sendPostPurchaseNotifications executes Resend email, Meta WhatsApp and Sites sync", async () => {
  const calls = [];
  const mockFetch = async (url, options) => {
    calls.push({ url, method: options.method, headers: options.headers, body: JSON.parse(options.body || "{}") });
    if (url.includes("api.resend.com")) {
      return { ok: true, json: async () => ({ id: "email_mock_123" }) };
    }
    if (url.includes("graph.facebook.com")) {
      return { ok: true, json: async () => ({ messages: [{ id: "wam_mock_456" }] }) };
    }
    if (url.includes("sites.imobiturbo.com.br")) {
      return { ok: true, json: async () => ({ ok: true, message: "Acesso liberado" }) };
    }
    return { ok: true, json: async () => ({}) };
  };

  const result = await sendPostPurchaseNotifications({
    email: "teste@imobiturbo.com.br",
    name: "Teste Aluno",
    phone: "(21) 98374-7796",
    plan: "anual",
    paymentId: "pay_test_001",
    env: {
      RESEND_API_KEY: "re_mock_key",
      META_WHATSAPP_TOKEN: "meta_mock_token",
      META_PHONE_NUMBER_ID: "1066935829837217",
    },
    fetchFn: mockFetch,
  });

  assert.equal(result.emailSent, true, "Email must be sent");
  assert.equal(result.whatsappSent, true, "WhatsApp must be sent");
  assert.equal(result.sitesSynced, true, "Sites must be synced");

  // Check calls
  assert.equal(calls.length, 3, "Must trigger 3 API calls: Resend, Meta WhatsApp, Sites");
  assert.ok(calls.some((c) => c.url.includes("api.resend.com/emails")));
  assert.ok(calls.some((c) => c.url.includes("graph.facebook.com")));
  assert.ok(calls.some((c) => c.url.includes("sites.imobiturbo.com.br/api/webhook/checkout")));
});
