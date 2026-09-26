const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("vagas/index.html and vagas-v2/index.html contain Option #1 transparent checkout popup with Card, Pix and VIP WhatsApp", () => {
  for (const page of ["vagas/index.html", "vagas-v2/index.html"]) {
    const htmlPath = path.join(root, page);
    const html = fs.readFileSync(htmlPath, "utf8");

    // Modal Step 4: Payment Tabs
    assert.ok(html.includes('id="chkTabCard"'), `${page} must contain #chkTabCard`);
    assert.ok(html.includes('id="chkTabPix"'), `${page} must contain #chkTabPix`);
    assert.ok(html.includes('id="chkCardView"'), `${page} must contain #chkCardView`);
    assert.ok(html.includes('id="chkPixView"'), `${page} must contain #chkPixView`);

    // Credit Card Fields
    assert.ok(html.includes('id="chkCardNumber"'), `${page} must contain #chkCardNumber`);
    assert.ok(html.includes('id="chkCardBrandBadge"'), `${page} must contain #chkCardBrandBadge`);
    assert.ok(html.includes('id="chkCardHolder"'), `${page} must contain #chkCardHolder`);
    assert.ok(html.includes('id="chkCardExpiry"'), `${page} must contain #chkCardExpiry`);
    assert.ok(html.includes('id="chkCardCvv"'), `${page} must contain #chkCardCvv`);
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

    // CPF do pagador label format
    assert.ok(html.includes('for="chkPixCpf">CPF do pagador:</label>'), `${page} must label CPF do pagador:`);

    // Pix Tab Icon and Card Tab Subtitle
    assert.ok(html.includes('class="chk-icon-pix"'), `${page} must set class chk-icon-pix on Pix SVG`);
    assert.ok(html.includes('id="chkCardTabDesc"'), `${page} must contain #chkCardTabDesc`);

    // Asaas Processing Footer
    assert.ok(html.includes("Pagamento Processado via"), `${page} must display Pagamento Processado via`);
    assert.ok(html.includes("assets/thesvg/asaas.svg"), `${page} must display Asaas logo`);

    // Standardized Price Layout and Clean Summary
    assert.ok(html.includes('<span class="chk-plan-compact-pill">Selecionado</span>'), `${page} must display Selecionado badge`);
    assert.ok(html.includes('<b>R$ 97</b><small>/mês</small>'), `${page} must format anual price standard as R$ 97/mês`);
    assert.ok(html.includes('id="chkModalPlanEco"'), `${page} must contain #chkModalPlanEco tag`);
    assert.ok(html.includes("Economize R$ 767"), `${page} must display savings of R$ 767 relative to monthly 1764/year`);
    assert.ok(!html.includes('id="chkPaymentTerms"'), `${page} must NOT contain #chkPaymentTerms`);
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

test("functions/api/checkout/index.js supports Asaas subscriptions for mensal and installments for other plans", () => {
  const code = fs.readFileSync(path.join(root, "functions/api/checkout/index.js"), "utf8");

  // Asaas Subscription for mensal
  assert.ok(code.includes("https://api.asaas.com/v3/subscriptions"), "Must call Asaas subscriptions API for mensal");
  assert.ok(code.includes('cycle: "MONTHLY"'), "Must configure monthly cycle");

  // Asaas Payments for installment / single
  assert.ok(code.includes("installmentCount = selectedPlan.cardInstallmentCount"), "Must pass installmentCount");

  // Asaas Pix
  assert.ok(code.includes("billingType: \"PIX\""), "Must support billingType PIX");
  assert.ok(code.includes("/pixQrCode"), "Must fetch pixQrCode");
});

test("functions/api/checkout/status.js supports subscription polling and payment polling", () => {
  const code = fs.readFileSync(path.join(root, "functions/api/checkout/status.js"), "utf8");

  assert.ok(code.includes("sub_"), "Must handle subscription ID polling");
  assert.ok(code.includes("https://api.asaas.com/v3/subscriptions/"), "Must query subscription payments");
  assert.ok(code.includes("https://api.asaas.com/v3/payments/"), "Must query payment status");
});
