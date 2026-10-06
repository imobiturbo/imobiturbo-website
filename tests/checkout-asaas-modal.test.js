const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("vagas/index.html and vagas-v2/index.html contain payment selection with hosted card checkout and legacy recovery", () => {
  for (const page of ["vagas/index.html", "vagas-v2/index.html"]) {
    const htmlPath = path.join(root, page);
    const html = fs.readFileSync(htmlPath, "utf8");

    // Modal Step 4: Payment Tabs
    assert.ok(html.includes('id="chkTabCard"'), `${page} must contain #chkTabCard`);
    assert.ok(html.includes('id="chkTabPix"'), `${page} must contain #chkTabPix`);
    assert.ok(html.includes('id="chkCardView"'), `${page} must contain #chkCardView`);
    assert.ok(html.includes('id="chkPixView"'), `${page} must contain #chkPixView`);

    // The primary landing delegates sensitive card fields to Asaas.
    for (const id of ['chkCardNumber', 'chkCardHolder', 'chkCardExpiry', 'chkCardCvv']) {
      assert.equal(html.includes('id="' + id + '"'), page === 'vagas-v2/index.html');
    }
    assert.ok(html.includes('id="chkCardCpf"'), `${page} must contain #chkCardCpf`);
    assert.ok(html.includes('id="chkInstallments"'), `${page} must contain #chkInstallments`);
    assert.ok(html.includes('id="chkContinuePaymentBtn"'), `${page} must contain #chkContinuePaymentBtn`);

    // Pix Fields
    assert.ok(html.includes('id="chkPixCpf"'), `${page} must contain #chkPixCpf`);
    assert.ok(html.includes('id="chkGeneratePixBtn"'), `${page} must contain #chkGeneratePixBtn`);
    assert.ok(html.includes('id="chkPixResultBlock"'), `${page} must contain #chkPixResultBlock`);
    assert.ok(html.includes('id="chkPixQrImg"'), `${page} must contain #chkPixQrImg`);
    assert.ok(html.includes('id="chkPixCopiaCola"'), `${page} must contain #chkPixCopiaCola`);
    assert.ok(html.includes('id="chkCopyPixBtn"'), `${page} must contain #chkCopyPixBtn`);
    assert.ok(html.includes('id="chkPixTimer"'), `${page} must contain #chkPixTimer`);
    assert.ok(html.indexOf('id="chkCopyPixBtn"') < html.indexOf('id="chkPixQrImg"'), `${page} must place #chkCopyPixBtn above #chkPixQrImg for mobile speed`);

    // CPF do pagador label format
    assert.ok(html.includes(page === 'vagas/index.html' ? 'for="chkPixCpf">CPF do comprador</label>' : 'for="chkPixCpf">CPF do pagador:</label>'), `${page} must identify the buyer CPF`);

    // Pix Tab Icon and Card Tab Subtitle
    assert.ok(html.includes('class="chk-icon-pix"'), `${page} must set class chk-icon-pix on Pix SVG`);
    assert.ok(html.includes('id="chkCardTabDesc"'), `${page} must contain #chkCardTabDesc`);

    // Asaas Processing Footer
    assert.ok(html.includes("Pagamento Processado via"), `${page} must display Pagamento Processado via`);
    assert.ok(html.includes("assets/thesvg/asaas.svg"), `${page} must display Asaas logo`);

    // Standardized Price Layout and Clean Summary
    assert.ok(html.includes('<span class="chk-plan-compact-pill">Selecionado</span>'), `${page} must display Selecionado badge`);
    if (page === 'vagas/index.html') {
      const summary = html.match(/<div[^>]*id="chkModalPlanPrice"[^>]*>([\s\S]*?)<\/div>/);
      assert.ok(summary, 'checkout must have a visible plan price');
      assert.match(summary[1], /12 × R\$ 97/);
      assert.match(summary[1], /Total R\$ 1\.164/, 'annual card summary must disclose the total');
    } else {
      assert.ok(html.includes('<b>R$ 97</b><small>/mês</small>'), 'legacy v2 keeps its price presentation');
    }
    assert.ok(html.includes('id="chkModalPlanEco"'), `${page} must contain #chkModalPlanEco tag`);
    if (page === 'vagas-v2/index.html') assert.ok(html.includes("Economize R$ 767"), 'legacy v2 keeps its savings presentation');
    assert.equal(html.includes('id="chkPaymentTerms"'), page === 'vagas/index.html', `${page} compact disclosure follows the current checkout contract`);
    assert.ok(!html.includes('class="chk-plan-pill-tag">Plano Selecionado'), `${page} must NOT contain Plano Selecionado tag`);

    // Installments: All 12 options without "(Recomendado)"
    assert.ok(!html.includes("(Recomendado)"), `${page} must NOT contain "(Recomendado)" in any installment option`);
    for (let i = 1; i <= 12; i++) {
      assert.ok(html.includes(`value="${i}"`), `${page} must offer installment option value="${i}"`);
    }

    // Step 5: Success Screen & VIP WhatsApp Button
    assert.ok(html.includes('id="chkStepPane5"'), `${page} must contain #chkStepPane5`);
    assert.ok(html.includes('id="chkSuccessPlanTitle"'), `${page} must contain #chkSuccessPlanTitle`);
    assert.ok(html.includes('id="chkSuccessEmail"'), `${page} must contain #chkSuccessEmail`);
    assert.ok(html.includes('id="chkWhatsAppGroupBtn"'), `${page} must contain #chkWhatsAppGroupBtn`);
    assert.ok(
      html.includes("https://chat.whatsapp.com/JAtPjAn0sAVEvhnsCocyzB"),
      `${page} must link directly to the VIP WhatsApp group https://chat.whatsapp.com/JAtPjAn0sAVEvhnsCocyzB`
    );

    // Brand SVG Icons
    assert.ok(html.includes("assets/thesvg/visa.svg"), `${page} must reference thesvg visa icon`);
    assert.ok(html.includes("assets/thesvg/mastercard.svg"), `${page} must reference thesvg mastercard icon`);
    assert.ok(html.includes("assets/thesvg/american-express.svg"), `${page} must reference thesvg amex icon`);
  }
});

test("vagas/vagas.css contains complete styles for transparent checkout, badges and VIP box", () => {
  for (const cssFile of ["vagas/vagas.css", "vagas-v2/vagas.css"]) {
    const cssPath = path.join(root, cssFile);
    const css = fs.readFileSync(cssPath, "utf8");

    assert.ok(css.includes(".chk-tabs"), `${cssFile} must define .chk-tabs`);
    assert.ok(css.includes(".chk-tab"), `${cssFile} must define .chk-tab`);
    assert.ok(css.includes(".chk-input-card-wrap"), `${cssFile} must define .chk-input-card-wrap`);
    assert.ok(css.includes(".chk-card-brand-badge"), `${cssFile} must define .chk-card-brand-badge`);
    assert.ok(css.includes(".chk-select"), `${cssFile} must define .chk-select`);
    assert.ok(css.includes(".chk-asaas-footer"), `${cssFile} must define .chk-asaas-footer`);
    assert.ok(css.includes(".chk-asaas-logo"), `${cssFile} must define .chk-asaas-logo`);
    assert.ok(css.includes(".chk-plan-title-row"), `${cssFile} must define .chk-plan-title-row`);
    assert.ok(css.includes(".chk-plan-eco-tag"), `${cssFile} must define .chk-plan-eco-tag`);
    assert.ok(css.includes(".chk-success-vip-box"), `${cssFile} must define .chk-success-vip-box`);
    assert.ok(css.includes(".chk-btn-whatsapp"), `${cssFile} must define .chk-btn-whatsapp`);
    assert.ok(css.includes(".chk-next-steps"), `${cssFile} must define .chk-next-steps`);
    assert.ok(css.includes(".chk-tab-label svg.chk-icon-pix"), `${cssFile} must define .chk-tab-label svg.chk-icon-pix`);
  }
});

test("consulting upsell embeds Cal payment and resumes by payment UID without creating another checkout", () => {
  const html = fs.readFileSync(path.join(root, "vagas-obrigado/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "vagas-obrigado/upsell.css"), "utf8");
  const script = fs.readFileSync(path.join(root, "vagas-obrigado/upsell.js"), "utf8");

  assert.ok(html.includes('id="consultingCheckoutModal"'), "upsell must use a focused checkout dialog");
  assert.ok(html.includes('id="calBookingWidget"'), "slot selection and payment share one inline widget");
  assert.ok(html.includes('id="consultingBooked"'), "new Cal bookings have a dedicated confirmation screen");
  assert.ok(html.includes('class="chk-asaas-footer"'), "upsell must identify the Asaas processor");
  assert.ok(html.includes("Escolha seu horário e conclua o pagamento na mesma agenda."));
  assert.ok(css.includes("width: min(100%, 1120px)"), "Cal modal gives the native checkout enough responsive space");
  assert.ok(css.includes(".cal-inline-widget iframe"), "Cal iframe has an explicit responsive viewport");
  assert.ok(css.includes("@media (max-width: 768px)"), "upsell modal must retain the landing modal mobile treatment");
  assert.ok(script.includes("sessions.getUpsellBuyer?.()"), "buyer prefill reuses the existing upsell profile");
  assert.ok(script.includes("cal.ns = {}") && script.includes("cal.q = cal.q || []"), "Cal uses its official SDK queue bootstrap");
  assert.ok(script.includes("whatsapp: config.phone"), "the required WhatsApp field receives the saved buyer phone");
  assert.ok(script.includes("attendeePhoneNumber: config.phone"), "Cal attendee phone receives the saved buyer phone");
  assert.ok(script.includes("event.source !== calFrame.contentWindow"), "Cal messages must come from the owned iframe");
  assert.ok(script.includes("event.origin !== CAL_ORIGIN"), "Cal messages must use the configured agenda origin");
  assert.ok(script.includes("CAL_BOOKING_UID.test(data.bookingUid)"), "native Cal short booking UIDs are valid confirmation identifiers");
  assert.ok(script.includes("?embed=${encodeURIComponent(CAL_NAMESPACE)}"), "payment recovery keeps the Cal embed namespace");
  assert.ok(script.includes("sessionStorage.setItem(CAL_PAYMENT_KEY, JSON.stringify(record))"), "only a short-lived payment UID record is persisted for resume");
  assert.ok(script.includes("type: 'imobiturbo:buyer'"), "CPF and cardholder details are sent to the owned iframe by message");
  assert.ok(!script.includes("fetch('/api/checkout'"), "the new consulting flow must not create an Asaas payment on the website");
  assert.ok(!script.includes("type: 'Purchase'"), "an iframe message must not trigger purchase tracking");
  assert.ok(html.includes("https://wa.me/5521969516183?text="), "legacy verified buyers are sent to support instead of the new paid event");
});

test("functions/api/checkout/index.js supports Asaas subscriptions for mensal and installments for other plans", () => {
  const code = fs.readFileSync(path.join(root, "functions/api/checkout/index.js"), "utf8");

  // Asaas Subscription for mensal
  assert.ok(code.includes("https://api.asaas.com/v3/subscriptions"), "Must call Asaas subscriptions API for mensal");
  assert.ok(code.includes('cycle: "MONTHLY"'), "Must configure monthly cycle");

  // Asaas Payments for installment / single
  assert.ok(code.includes('installmentCount = plan === "consultoria" ? requestedInstallments : selectedPlan.cardInstallmentCount'), "Must retain plan installments and honor the consulting selection");

  // Asaas Pix
  assert.ok(code.includes("billingType: \"PIX\""), "Must support billingType PIX");
  assert.ok(code.includes("/pixQrCode"), "Must fetch pixQrCode");
});

test("functions/api/checkout/status.js supports subscription polling and payment polling", () => {
  const code = fs.readFileSync(path.join(root, "functions/api/checkout/status.js"), "utf8");

  assert.ok(code.includes("sub_"), "Must handle subscription ID polling");
  assert.ok(code.includes("asaasConnection(env).base") && code.includes("/subscriptions/"), "Must query subscription payments in the configured provider namespace");
  assert.ok(code.includes("asaasConnection(env).base") && code.includes("/payments/"), "Must query payment status in the configured provider namespace");
  assert.ok(code.includes("sendPostPurchaseNotifications"), "Must dispatch post purchase notifications on paid status");
});

test("functions/api/checkout/index.js syncs latest customer contact details to Asaas", () => {
  const code = fs.readFileSync(path.join(root, "functions/api/checkout/index.js"), "utf8");

  assert.ok(code.includes("method: \"PUT\""), "Must update existing Asaas customer with current contact details");
  assert.ok(code.includes("mobilePhone: cleanPhone"), "Must update mobilePhone on Asaas customer");
});

test("functions/api/checkout/status.js and webhook.js enforce notification idempotency via purchaseProof", () => {
  const statusCode = fs.readFileSync(path.join(root, "functions/api/checkout/status.js"), "utf8");
  const webhookCode = fs.readFileSync(path.join(root, "functions/api/checkout/webhook.js"), "utf8");

  assert.ok(statusCode.includes("purchaseProof: { approvedAt:"), "status.js must pass purchaseProof for idempotency");
  assert.ok(statusCode.includes("COMMUNITY_ORGANIZATION_ID:"), "status.js must provide COMMUNITY_ORGANIZATION_ID");
  assert.ok(webhookCode.includes("purchaseProof: { approvedAt:"), "webhook.js must pass purchaseProof for idempotency");
});

test("vagas/checkout-session.js persists paid state and short-circuits polling on approved payments", () => {
  const sessionCode = fs.readFileSync(path.join(root, "vagas/checkout-session.js"), "utf8");
  const upsellCode = fs.readFileSync(path.join(root, "vagas-obrigado/upsell.js"), "utf8");

  assert.ok(sessionCode.includes("paid: value.paid === true"), "Session must persist paid boolean");
  assert.ok(sessionCode.includes("if (record.paid === true) {"), "check() and start() must short-circuit if already paid");
  assert.ok(upsellCode.includes("if (comm && !comm.paid) community.start()"), "upsell resume must not poll paid community");
});
