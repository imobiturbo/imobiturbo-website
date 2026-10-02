const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const originalFile = path.join(root, "vagas", "index.html");
const clonedFile = path.join(root, "skills-ia-obrigado", "index.html");

test("skills-ia-obrigado/index.html exists and original vagas/index.html is unchanged", () => {
  assert.ok(fs.existsSync(clonedFile), "skills-ia-obrigado/index.html must exist");
  assert.ok(fs.existsSync(originalFile), "vagas/index.html must exist");

  const originalHtml = fs.readFileSync(originalFile, "utf8");
  // Ensure original vagas STILL has its original title, livebar, and footer
  assert.ok(originalHtml.includes("Comunidade Imobiturbo | CRM com IA no WhatsApp & Mentoria Prática"));
  assert.ok(originalHtml.includes("ACERVO DE MENTORIAS ATUALIZADO TODA SEMANA"));
  assert.ok(originalHtml.includes("<footer class=\"site-footer\" data-section=\"13\">"));
  assert.ok(!originalHtml.includes("skills-ia-obrigado"));
});

test("skills-ia-obrigado contains required upsell header and purchase status banner", () => {
  const html = fs.readFileSync(clonedFile, "utf8");

  // Upsell navigation
  assert.ok(html.includes("aria-label=\"Etapas da sua experiência\""), "Must contain journey nav");
  assert.ok(html.includes("<span>Skills de IA</span>"), "Step 1 must be Skills de IA");
  assert.ok(html.includes("<span>Comunidade <small>opcional</small></span>"), "Step 2 must be Comunidade opcional");
  assert.ok(html.includes("<li aria-current=\"step\">"), "Step 2 must be aria-current");
  assert.ok(html.includes("<a href=\"#acessos\">Seus acessos</a>"), "Step 3 must link to #acessos");

  // Status banner
  assert.ok(
    html.includes("Compra das 54 Skills de IA Imobiliárias aprovada. Bem-vindo!"),
    "Must contain exact purchase status message"
  );
  assert.ok(html.includes("id=\"communityStatus\""), "Status banner must have id communityStatus");
  assert.ok(html.includes("class=\"purchase-status is-approved\""), "Status banner must have approved class");
});

test("skills-ia-obrigado removes livebar from original /vagas/", () => {
  const html = fs.readFileSync(clonedFile, "utf8");
  assert.ok(!html.includes("ACERVO DE MENTORIAS ATUALIZADO TODA SEMANA"), "Must NOT contain original livebar");
});

test("skills-ia-obrigado replaces original site-footer with access section", () => {
  const html = fs.readFileSync(clonedFile, "utf8");

  // Old footer must not exist
  assert.ok(!html.includes("<footer class=\"site-footer\" data-section=\"13\">"), "Must not contain old footer");

  // New access section must exist with all IDs and attributes
  assert.ok(html.includes("id=\"acessos\""), "Must have #acessos section");
  assert.ok(html.includes("class=\"wrap access-section\""), "Must have wrap access-section classes");
  assert.ok(html.includes("<h2 id=\"accessTitle\">Onde encontrar seus acessos</h2>"), "Must have access title");
  assert.ok(html.includes("id=\"accessEmailFallback\""), "Must have email fallback");
  assert.ok(html.includes("id=\"accessIdentityCopy\""), "Must have identity copy paragraph");
  assert.ok(html.includes("id=\"accessIdentityEmail\""), "Must have identity email span");
  assert.ok(html.includes("id=\"accessIdentityPhone\""), "Must have identity phone span");
  assert.ok(html.includes("id=\"accessIdentityEmailRepeat\""), "Must have identity email repeat span");
  assert.ok(html.includes("class=\"small access-disclaimer\""), "Must have access disclaimer");
});

test("skills-ia-obrigado sets correct meta tags for an upsell/thank-you page", () => {
  const html = fs.readFileSync(clonedFile, "utf8");

  assert.ok(html.includes("<meta name=\"robots\" content=\"noindex, nofollow\">"), "Upsell page must be noindex, nofollow");
  assert.ok(html.includes("<link rel=\"canonical\" href=\"https://www.imobiturbo.com.br/skills-ia-obrigado/\">"), "Canonical must point to /skills-ia-obrigado/");
});
