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
    env: { SUPABASE_SERVICE_ROLE_KEY: "synthetic-service" },
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
    env: { SUPABASE_SERVICE_ROLE_KEY: "synthetic-service" },
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
    if (url.includes("cpaas.zoho.com")) {
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
      SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
      ZEPTOMAIL_TOKEN: "zepto_mock_token",
      ZEPTOMAIL_FROM_ADDRESS: "noreply@imobiturbo.com.br",
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
  assert.ok(calls.some((c) => c.url.includes("cpaas.zoho.com/v1.1/email")));
  assert.ok(calls.some((c) => c.url.includes("graph.facebook.com")));
  assert.ok(!calls.some((c) => c.url.includes("sites.imobiturbo.com.br")));

  // Verify ZeptoMail auth header
  const zeptoCall = calls.find((c) => c.url.includes("cpaas.zoho.com"));
  assert.ok(zeptoCall.headers.Authorization.startsWith("Zoho-enczapikey "));
  assert.equal(zeptoCall.body.bounce_address, "bounce@bounce-zem.imobiturbo.com.br");
  assert.equal(zeptoCall.body.from.address, "noreply@imobiturbo.com.br");
});

// All provider calls are intercepted; these tests never send email.
async function captureEmail(env) {
  const calls = [];
  const result = await sendPostPurchaseNotifications({
    email: "buyer@example.com", name: "Buyer", env: { SUPABASE_SERVICE_ROLE_KEY: "synthetic-service", ...env },
    fetchFn: async (url, options) => {
      calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ success: true, message: "OK" }) };
    },
  });
  return { result, emails: calls.filter((call) => !call.url.includes("/rest/v1/rpc/")) };
}

test("transactional email prefers production CPaaS variables and prefixes authorization once", async () => {
  for (const key of ["canonical_test_key", "Zoho-enczapikey canonical_test_key"]) {
    const { result, emails } = await captureEmail({
      ZEPTOMAIL_API_KEY: key,
      SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
      ZEPTOMAIL_TOKEN: "unused_alias_key",
      ZEPTOMAIL_FROM_EMAIL: "production@example.com",
      ZEPTOMAIL_FROM_ADDRESS: "alias@example.com",
    });
    assert.equal(result.emailSent, true);
    assert.equal(emails.length, 1);
    assert.equal(emails[0].url, "https://cpaas.zoho.com/v1.1/email");
    assert.equal(emails[0].headers.Authorization, "Zoho-enczapikey canonical_test_key");
    assert.equal(emails[0].body.from.address, "production@example.com");
  }
});

test("transactional email supports legacy environment aliases without embedded credentials", async () => {
  const { result, emails } = await captureEmail({
    ZEPTOMAIL_TOKEN: "Zoho-enczapikey alias_test_key",
    ZEPTOMAIL_FROM_ADDRESS: "alias@example.com",
  });
  assert.equal(result.emailSent, true);
  assert.equal(emails[0].headers.Authorization, "Zoho-enczapikey alias_test_key");
  assert.equal(emails[0].body.from.address, "alias@example.com");
});

test("missing CPaaS credentials fail closed even with Resend configured", async () => {
  for (const key of [undefined, "", "   ", "Zoho-enczapikey "]) {
    const { result, emails } = await captureEmail({
      ZEPTOMAIL_API_KEY: key, ZEPTOMAIL_FROM_EMAIL: "production@example.com",
      RESEND_API_KEY: "marketing_only_test_key",
    });
    assert.equal(result.crmProvisioned, true);
    assert.equal(result.emailSent, false);
    assert.deepEqual(emails, []);
    assert.ok(result.errors.includes("zeptomail_not_configured"));
  }
});

test("missing CPaaS sender fails closed", async () => {
  const { result, emails } = await captureEmail({ ZEPTOMAIL_API_KEY: "test_key" });
  assert.equal(result.emailSent, false);
  assert.deepEqual(emails, []);
  assert.ok(result.errors.includes("zeptomail_not_configured"));
});

for (const months of [1,3,12]) test(`community messages preserve ${months} calendar months, unlimited and drip`, () => {
  const data={name:'Synthetic',email:'buyer@example.invalid',phone:'11999998888',community:{products:['os','club'],duration_months:months,period_end:'2027-10-03T00:00:00Z',club_enrollment:{origin:'new_paid',protected_release_at:'2026-10-10T00:00:00Z'}}};
  const email=formatPostPurchaseEmail(data),wa=formatPostPurchaseWhatsApp(data);
  assert.ok(email.text.includes(`${months} ${months===1?'mês':'meses'}`));
  assert.ok(email.text.includes('ilimitados'));assert.ok(email.text.includes('sete dias'));
  assert.equal(wa.template.components[0].parameters.length,3);
  assert.ok(!wa.template.components[0].parameters[1].text.includes('Enviamos também'));
});
for (const product of ['os','club']) test(`sold ${product} alone does not promise the other product`, () => {
  const data={email:'buyer@example.invalid',community:{products:[product],duration_months:1,period_end:'2026-11-03T00:00:00Z',club_enrollment:{origin:'preexisting_verified'}}};
  const email=formatPostPurchaseEmail(data);
  assert.ok(!email.html.includes(product==='os'?'club.imobiturbo.com.br/login':'os.imobiturbo.com.br/login'));
  assert.ok(!email.text.includes('sete dias'));
});
test('missing credentials never invoke encoded secret fallback',async()=>{
  let calls=0;
  assert.equal((await provisionCommunityMembership({email:'buyer@example.invalid',fetchFn:async()=>{calls++;}})).ok,false);
  assert.equal(calls,0);
});
test('unconfigured purchase proof cannot call provisioning or send',async()=>{
  let calls=0;
  const result=await sendPostPurchaseNotifications({purchaseProof:{approvedAt:'2026-10-03T00:00:00Z'},fetchFn:async()=>{calls++;}});
  assert.equal(calls,0);assert.deepEqual(result.errors,['community_provisioning_failed']);
});
