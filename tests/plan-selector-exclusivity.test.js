const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("vagas/vagas.css and vagas-v2/vagas.css prevent dual active plan rows via strict :has(input:checked)", () => {
  for (const file of ["vagas/vagas.css", "vagas-v2/vagas.css"]) {
    const css = fs.readFileSync(path.join(root, file), "utf8");

    // Must NOT have comma-combined `.psel-row:has(input:checked), .psel-row.active`
    // which previously allowed a stale .active class on one row and a checked input on another
    // to render both rows as selected simultaneously.
    assert.equal(
      css.includes(".psel-row:has(input:checked), .psel-row.active"),
      false,
      `${file} must not combine :has(input:checked) and .active with a comma`
    );

    // Must define .psel-row:has(input:checked) as the primary selector
    assert.ok(
      css.includes(".psel-row:has(input:checked) {"),
      `${file} must define .psel-row:has(input:checked)`
    );

    // Must define fallback for legacy browsers without :has()
    assert.ok(
      css.includes("@supports not selector(:has(*))"),
      `${file} must define @supports not selector(:has(*)) fallback`
    );
  }
});

test("vagas/index.html and vagas-v2/index.html strictly synchronize plan selection, active rows, and radios", () => {
  for (const file of ["vagas/index.html", "vagas-v2/index.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");

    // Must define centralized selectPlan in global scope
    assert.ok(
      html.includes("window.selectPlan = selectPlan"),
      `${file} must expose selectPlan globally`
    );

    // restoreCheckoutProgress must use selectPlan
    assert.ok(
      html.includes("selectPlan(planToRestore)"),
      `${file} restoreCheckoutProgress must call selectPlan(planToRestore)`
    );

    // planRadios change listener must call selectPlan
    assert.ok(
      html.includes("planRadios.forEach(radio => {\n      radio.addEventListener('change', function() {\n        selectPlan(this.value);"),
      `${file} planRadios change listener must call selectPlan`
    );

    // modalPlanRadios change listener must call selectPlan
    assert.ok(
      html.includes("modalPlanRadios.forEach(radio => {\n      radio.addEventListener('change', function() {\n        selectPlan(this.value);"),
      `${file} modalPlanRadios change listener must call selectPlan`
    );

    // Summary lines must be defined for all three plans
    assert.ok(html.includes("'PLANO ANUAL · 12X DE R$ 97'"));
    assert.ok(html.includes("'PLANO TRIMESTRAL · 3X DE R$ 127'"));
    assert.ok(html.includes("'PLANO MENSAL · R$ 147/MÊS'"));
  }
});
