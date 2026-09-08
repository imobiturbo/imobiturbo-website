const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("vagas/index.html contains complete embedded checkout modal markup and components", () => {
  const htmlPath = path.join(root, "vagas/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");

  // Modal structure
  assert.ok(html.includes('id="checkoutModalOverlay"'), "Must contain #checkoutModalOverlay");
  assert.ok(html.includes('id="chkFormView"'), "Must contain #chkFormView");
  assert.ok(html.includes('id="chkPixView"'), "Must contain #chkPixView");
  assert.ok(html.includes('id="chkSuccessView"'), "Must contain #chkSuccessView");

  // Form elements
  assert.ok(html.includes('id="chkNativeForm"'), "Must contain #chkNativeForm");
  assert.ok(html.includes('id="chkName"'), "Must contain #chkName");
  assert.ok(html.includes('id="chkEmail"'), "Must contain #chkEmail");
  assert.ok(html.includes('id="chkPhone"'), "Must contain #chkPhone");
  assert.ok(html.includes('id="chkCpf"'), "Must contain #chkCpf");

  // Payment methods
  assert.ok(html.includes('id="tabPix"'), "Must contain #tabPix");
  assert.ok(html.includes('id="tabCard"'), "Must contain #tabCard");
  assert.ok(html.includes('id="chkCardFields"'), "Must contain #chkCardFields");
  assert.ok(html.includes('id="chkCardNumber"'), "Must contain #chkCardNumber");

  // Pix display components
  assert.ok(html.includes('id="chkPixQrImg"'), "Must contain #chkPixQrImg");
  assert.ok(html.includes('id="chkPixPayload"'), "Must contain #chkPixPayload");
  assert.ok(html.includes('id="chkCopyPixBtn"'), "Must contain #chkCopyPixBtn");
  assert.ok(html.includes('id="chkPixTimer"'), "Must contain #chkPixTimer");

  // Plan switching and navigation
  assert.ok(html.includes('id="chkBackToPlanBtn"'), "Must contain #chkBackToPlanBtn to change plan/data from Pix");
  assert.ok(html.includes('id="chkChangePlanTrigger"'), "Must contain #chkChangePlanTrigger to switch plans");

  // Success screen
  assert.ok(html.includes("Pagamento Aprovado!"), "Must contain approved payment message");
  assert.ok(html.includes("https://app.imobiturbo.com.br/onboarding"), "Must link to onboarding");
});

test("vagas/vagas.css enforces proper styling and contrast on checkout buttons", () => {
  const cssPath = path.join(root, "vagas/vagas.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.ok(css.includes(".chk-modal-overlay"), "Must define .chk-modal-overlay");
  assert.ok(css.includes(".chk-modal-box"), "Must define .chk-modal-box");
  assert.ok(css.includes(".chk-btn-submit"), "Must define .chk-btn-submit");
  assert.ok(css.includes("color: #10130C !important;"), "Submit button must strictly enforce #10130C ink");
  assert.ok(css.includes("font-weight: 800 !important;"), "Submit button must strictly enforce font-weight: 800");
  assert.ok(css.includes("font-family: var(--sans) !important;"), "Submit button must strictly enforce brand font var(--sans)");
  assert.ok(css.includes(".chk-pulse-radar"), "Must define radar pulsing animation");
  assert.ok(css.includes(".psel-cta {"), "Must define .psel-cta");
  assert.ok(css.includes("max-width: 600px;"), "Plan checkout button must align with cards max-width 600px");
  assert.ok(css.includes("margin: 0 auto 12px;"), "Plan checkout button must be centered horizontally with margin auto");

  // Mobile modal price formatting
  assert.ok(css.includes(".chk-plan-val {"), "Must define .chk-plan-val");
  assert.ok(css.includes("white-space: nowrap;"), "Modal price must enforce white-space: nowrap for single line display");
  assert.ok(css.includes(".chk-plan-val small {"), "Must define smaller prefix styling for 12x R$");
  assert.ok(css.includes(".chk-plan-val b {"), "Must define bold number styling for modal price");

  // Light mode tokens
  assert.ok(css.includes("--bg: #FFFFFF;"), "Must define clean white canvas --bg");
  assert.ok(css.includes("--military: #69a438;"), "Must define Brand Green #69a438 for light background");
  assert.ok(css.includes("--white: #0A0A0A;"), "Must invert --white token for high-contrast dark ink headings");

  // Continuous infinite slider marquee
  assert.ok(css.includes("@keyframes proofMarquee"), "Must define @keyframes proofMarquee for continuous infinite scroll");
  assert.ok(css.includes("transform: translate3d(-50%, 0, 0);"), "Marquee must translate -50% for seamless looping");
  assert.ok(css.includes(".proof-slider-track.is-paused"), "Must support pause on hover / touch");
});

test("vagas/index.html enforces Light Mode and continuous infinite slider markup", () => {
  const htmlPath = path.join(root, "vagas/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");

  // Light Mode
  assert.ok(html.includes('<html lang="pt-BR" class="light">'), "Must set html class to light");
  assert.ok(html.includes('content="light"'), "Must declare color-scheme light");

  // Mobile price formatting in markup & PLAN_CONFIG
  assert.ok(html.includes('<small>12x R$ </small><b>97</b>'), "Must render 12x R$ in small and 97 in bold");
  assert.ok(html.includes("priceDisplay: '<small>12x R$ </small><b>97</b>'"), "PLAN_CONFIG must format anual plan with small prefix");

  // Infinite slider script
  assert.ok(html.includes("track.appendChild(clone)"), "Script must clone cards to create 50% continuous marquee ribbon");
  assert.ok(html.includes("track.classList.add('is-paused')"), "Script must pause marquee on mouseenter and touch");
});

test("functions/api/checkout/index.js implements primary AbacatePay and fallback Asaas", () => {
  const funcPath = path.join(root, "functions/api/checkout/index.js");
  const code = fs.readFileSync(funcPath, "utf8");

  // Core endpoints
  assert.ok(code.includes("https://api.abacatepay.com/v2/transparents/create"), "Must call AbacatePay transparents");
  assert.ok(code.includes("https://api.asaas.com/v3/payments"), "Must call Asaas payments fallback");
  assert.ok(code.includes("https://api.asaas.com/v3/customers"), "Must manage Asaas customers");
  assert.ok(code.includes("https://api.asaas.com/v3/payments/"), "Must fetch Asaas Pix QR Code");

  // Timeout and failover mechanics
  assert.ok(code.includes("AbortSignal.timeout(5000)"), "Must enforce strict 5s timeout on AbacatePay");
  assert.ok(code.includes("onRequestPost"), "Must export onRequestPost");
  assert.ok(code.includes("onRequestOptions"), "Must export onRequestOptions");
});

test("functions/api/checkout/status.js polls both gateways", () => {
  const statusPath = path.join(root, "functions/api/checkout/status.js");
  const code = fs.readFileSync(statusPath, "utf8");

  assert.ok(code.includes("https://api.abacatepay.com/v2/transparents/check"), "Must check AbacatePay transparent status");
  assert.ok(code.includes("https://api.asaas.com/v3/payments/"), "Must check Asaas payment status");
  assert.ok(code.includes("onRequestGet"), "Must export onRequestGet");
});
