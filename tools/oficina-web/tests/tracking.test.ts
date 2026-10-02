import test from "node:test";
import assert from "node:assert/strict";
import { emitEvent, PRODUCT_ID } from "../src/lib/tracking.ts";
const location = {
  origin: "https://www.imobiturbo.com.br",
  pathname: "/oficina/",
};
test("Hub recebe evento da oficina; tracker desativado aguarda sem emitir", () => {
  const calls: unknown[][] = [];
  const tracker = {
    config: () => ({ enabled: true }),
    track: (...args: unknown[]) => {
      calls.push(args);
    },
  };
  assert.equal(
    emitEvent("Lead", { profile: "corretor" }, "event1", {
      location,
      HubTracker: tracker,
    }),
    true,
  );
  assert.deepEqual(calls[0], [
    "Lead",
    {
      productId: PRODUCT_ID,
      valueCents: 4700,
      currency: "BRL",
      profile: "corretor",
    },
    "event1",
  ]);
  assert.equal(
    emitEvent("ViewContent", {}, "event2", {
      location,
      HubTracker: { ...tracker, config: () => ({ enabled: false }) },
    }),
    false,
  );
  assert.equal(calls.length, 1);
});
test("pixel existente usa mesma ocorrência; wrapper Hub evita segundo envio direto", () => {
  const calls: unknown[][] = [];
  const fbq = Object.assign(
    (...args: unknown[]) => {
      calls.push(args);
    },
    { __hub_wrapped__: true },
  );
  const tracker = {
    config: () => ({
      enabled: true,
      destinations: [
        { origin: location.origin, pathPrefix: "/", pixelIds: ["123"] },
        { origin: location.origin, pathPrefix: "/oficina/", pixelIds: ["456"] },
      ],
    }),
    track: () => {
      throw Error("Não duplicar coleta");
    },
  };
  assert.equal(
    emitEvent("InitiateCheckout", {}, "event3", {
      location,
      HubTracker: tracker,
      fbq,
    }),
    true,
  );
  assert.equal(calls[0][1], "456");
  assert.equal(calls[0][2], "InitiateCheckout");
  assert.deepEqual(calls[0][4], { eventID: "event3" });
});
test("falha de tracking não bloqueia registro/pagamento", () => {
  assert.equal(
    emitEvent("Lead", {}, "event4", {
      location,
      HubTracker: {
        config: () => {
          throw Error("config");
        },
        track: () => {},
      },
    }),
    false,
  );
});
