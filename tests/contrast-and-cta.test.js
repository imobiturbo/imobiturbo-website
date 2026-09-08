const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("colors_and_type.css guarantees strict #10130C and font-weight 800 on all Lime CTA buttons", () => {
  const cssPath = path.join(root, "colors_and_type.css");
  const content = fs.readFileSync(cssPath, "utf8");

  assert.ok(content.includes("--fg-on-lime:     #10130C;"), "Token --fg-on-lime must be strictly #10130C");
  assert.ok(content.includes("--accent-ink:     #10130C;"), "Token --accent-ink must be strictly #10130C");
  assert.ok(content.includes("--it-military:    #69a537;"), "Token --it-military must be Verde Militar #69a537");

  // .btn-primary and .btn-cta-lime
  const btnPrimaryMatch = content.match(/\.btn-primary,\s*\.btn-cta-lime\s*\{([^}]+)\}/);
  assert.ok(btnPrimaryMatch, ".btn-primary class must be defined");
  assert.ok(btnPrimaryMatch[1].includes("color: var(--fg-on-lime) !important;"), "Button must enforce --fg-on-lime color");
  assert.ok(btnPrimaryMatch[1].includes("font-weight: 800 !important;"), "Button must enforce font-weight: 800");

  const hoverMatch = content.match(/\.btn-primary:hover,\s*\.btn-cta-lime:hover\s*\{([^}]+)\}/);
  assert.ok(hoverMatch, "Hover state must be defined");
  assert.ok(hoverMatch[1].includes("color: var(--fg-on-lime) !important;"), "Hover state must strictly preserve --fg-on-lime");
});

test("home.css guarantees Verde Militar on light backgrounds and strict #10130C on home CTAs", () => {
  const cssPath = path.join(root, "home.css");
  const content = fs.readFileSync(cssPath, "utf8");

  assert.ok(content.includes("--home-military: #69a537;"), "home.css must define --home-military as #69a537");
  assert.ok(content.includes("--home-cta-text: #10130c;"), "home.css must define --home-cta-text as #10130c");

  // Light-section lime-dots and accents must use Verde Militar
  assert.ok(
    content.includes(".light-section .lime-dot") && content.includes("--home-military"),
    "lime-dot inside .light-section must use --home-military"
  );
  assert.ok(
    content.includes(".proof-copy blockquote::before") || content.includes(".pain-item > span"),
    "accents on light backgrounds must be styled"
  );

  // Home buttons
  const homeBtnLimeMatch = content.match(/\.home-button-lime\s*\{([^}]+)\}/);
  assert.ok(homeBtnLimeMatch, ".home-button-lime must be defined");
  assert.ok(homeBtnLimeMatch[1].includes("color: var(--home-cta-text)"), "Home button must use --home-cta-text");
  assert.ok(homeBtnLimeMatch[1].includes("font-weight: 800"), "Home button must be font-weight 800");

  // Proof more link must NOT use light lime on hover over paper background
  assert.ok(!content.includes(".proof-more a:hover {\n    color: var(--home-lime-hover);"), "proof-more link hover must not turn light lime on paper");
});

test("AudiencePages and diagnostic panel use Verde Militar on white card surfaces", () => {
  const jsxPath = path.join(root, "ui_kits/imobiturbo-app/AudiencePages.jsx");
  const content = fs.readFileSync(jsxPath, "utf8");

  // No murky #7a911c or lime on white card
  assert.ok(!content.includes("color: '#7a911c'"), "AudiencePages.jsx must not contain #7a911c");
  assert.ok(!content.includes("border: '1.5px solid #7a911c'"), "AudiencePages.jsx must not contain #7a911c border");
  assert.ok(content.includes("color: '#69a537'"), "AudiencePages.jsx must use Verde Militar #69a537");
  assert.ok(content.includes("border: isHovered ? '1.5px solid #69a537'"), "AudiencePages.jsx hover border must use #69a537");
});

test("Landing pages and lovable enforce strictly #10130C on CTA buttons", () => {
  const lovablePath = path.join(root, "lovable/index.html");
  const lovableContent = fs.readFileSync(lovablePath, "utf8");
  assert.ok(lovableContent.includes(".btn-primary {"), "lovable must define .btn-primary");
  assert.ok(lovableContent.includes("color: #10130C;"), "lovable .btn-primary must use #10130C text");
  assert.ok(lovableContent.includes("font-weight: 800;"), "lovable .btn-primary must use font-weight: 800");

  const consultoriaPath = path.join(root, "lp-pages/consultoria-express/index.html");
  const consultoriaContent = fs.readFileSync(consultoriaPath, "utf8");
  assert.ok(consultoriaContent.includes("background-color: #BFD730;"), "consultoria-express CTA must use Lime Punch #BFD730");
  assert.ok(consultoriaContent.includes("color: #10130C;"), "consultoria-express CTA must use #10130C");
  assert.ok(consultoriaContent.includes("font-weight: 800;"), "consultoria-express CTA must use font-weight 800");
});
