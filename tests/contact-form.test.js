const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("contact form component is properly implemented in HomePrototypes.jsx", () => {
  const homeProtoPath = path.join(root, "ui_kits/imobiturbo-app/HomePrototypes.jsx");
  assert.ok(fs.existsSync(homeProtoPath), "HomePrototypes.jsx must exist");

  const content = fs.readFileSync(homeProtoPath, "utf8");
  assert.ok(content.includes("function ContactSection"), "ContactSection component must exist");
  assert.ok(content.includes("['Contato', '#contato']"), "Navigation must include Contato link");
  assert.ok(content.includes("i7F0QAdp3xKbXOSzSft0lCjkzXggzPxV"), "Must reference the designated webhook path");
  assert.ok(content.includes("whsec_asnPLHWJWNjXM28ppgf6dWlM97KXWIms4_NpWUn3zwk"), "Must configure the auth token/secret");
  assert.ok(content.includes("name=\"name\""), "Must include name field");
  assert.ok(content.includes("name=\"phone\""), "Must include phone field");
  assert.ok(content.includes("name=\"email\""), "Must include email field");
  assert.ok(content.includes("<ContactSection />"), "HomePrototypes must render ContactSection");
});

test("Cloudflare Pages contact API function exists and is properly configured", () => {
  const funcPath = path.join(root, "functions/api/contact.js");
  assert.ok(fs.existsSync(funcPath), "functions/api/contact.js must exist");

  const content = fs.readFileSync(funcPath, "utf8");
  assert.ok(content.includes("export async function onRequest"), "Must export onRequest handler");
  assert.ok(content.includes("i7F0QAdp3xKbXOSzSft0lCjkzXggzPxV"), "Must forward to the webhook endpoint");
  assert.ok(content.includes("whsec_asnPLHWJWNjXM28ppgf6dWlM97KXWIms4_NpWUn3zwk"), "Must use the auth secret");
  assert.ok(content.includes("HMAC"), "Must compute HMAC signature");
  assert.ok(content.toLowerCase().includes("x-imobiturbo-signature"), "Must pass signature header");
  assert.ok(content.toLowerCase().includes("authorization"), "Must pass authorization header");
});

test("home.css contains styles for contact section and form", () => {
  const cssPath = path.join(root, "home.css");
  const content = fs.readFileSync(cssPath, "utf8");
  assert.ok(content.includes(".contact-section"), "CSS must style .contact-section");
  assert.ok(content.includes(".contact-form-card"), "CSS must style .contact-form-card");
  assert.ok(content.includes(".contact-submit-btn"), "CSS must style .contact-submit-btn");
  assert.ok(content.includes(".contact-success-card"), "CSS must style .contact-success-card");
});

test("index.html contains contact navigation and accessible fallback form", () => {
  const indexPath = path.join(root, "index.html");
  const content = fs.readFileSync(indexPath, "utf8");
  assert.ok(content.includes('href="#contato"'), "Navigation must link to #contato");
  assert.ok(content.includes('id="contato"'), "Fallback HTML must include #contato section");
  assert.ok(content.includes('name="name"'), "Fallback form must have name input");
  assert.ok(content.includes('name="phone"'), "Fallback form must have phone input");
});
