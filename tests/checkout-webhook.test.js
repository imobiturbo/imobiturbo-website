const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const webhookPath = path.join(root, "functions/api/checkout/webhook.js");
const webhookCode = fs.readFileSync(webhookPath, "utf8");

test("functions/api/checkout/webhook.js supports payment approval and refund/cancellation across gateways", () => {
  // Verifies AbacatePay events
  assert.ok(webhookCode.includes("billing.paid"), "Must support AbacatePay paid");
  assert.ok(webhookCode.includes("billing.refunded"), "Must support AbacatePay refunded");
  assert.ok(webhookCode.includes("billing.chargeback"), "Must support AbacatePay chargeback");

  // Verifies Asaas events
  assert.ok(webhookCode.includes("PAYMENT_RECEIVED"), "Must support Asaas received");
  assert.ok(webhookCode.includes("PAYMENT_CONFIRMED"), "Must support Asaas confirmed");
  assert.ok(webhookCode.includes("PAYMENT_REFUNDED"), "Must support Asaas refunded");
  assert.ok(webhookCode.includes("PAYMENT_CHARGEBACK_REQUESTED"), "Must support Asaas chargeback");

  // Verifies Hotmart events
  assert.ok(webhookCode.includes("PURCHASE_APPROVED"), "Must support Hotmart approved");
  assert.ok(webhookCode.includes("PURCHASE_REFUNDED"), "Must support Hotmart refunded");
  assert.ok(webhookCode.includes("PURCHASE_CHARGEBACK"), "Must support Hotmart chargeback");

  // Verifies automated actions
  assert.ok(webhookCode.includes("provisionCommunityMembership"), "Must import and invoke central provisionCommunityMembership");
  assert.ok(webhookCode.includes("sendPostPurchaseNotifications"), "Must invoke sendPostPurchaseNotifications");
  assert.ok(webhookCode.includes('action: "cancel"'), "Must invoke cancel action on refund/chargeback");
});
