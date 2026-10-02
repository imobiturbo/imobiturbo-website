export const PRODUCT_ID = "oficina-imobiturbo-202610";
export type OficinaEvent = "ViewContent" | "Lead" | "InitiateCheckout";
interface Destination {
  origin: string;
  pathPrefix?: string;
  pixelIds?: string[];
}
interface Tracker {
  track: (
    name: string,
    properties: Record<string, unknown>,
    eventId: string,
  ) => unknown;
  config: () => { enabled: boolean; destinations?: Destination[] };
}
type Fbq = ((...args: unknown[]) => void) & { __hub_wrapped__?: boolean };
interface TrackingWindow {
  HubTracker?: Tracker;
  fbq?: Fbq;
  location: Pick<Location, "origin" | "pathname">;
}
export function emitEvent(
  name: OficinaEvent,
  properties: Record<string, unknown>,
  eventId: string,
  target: TrackingWindow,
): boolean {
  try {
    const tracker = target.HubTracker;
    if (!tracker || tracker.config().enabled !== true) return false;
    const route = (tracker.config().destinations || [])
      .filter(
        (d) =>
          d.origin === target.location.origin &&
          (target.location.pathname ===
            (d.pathPrefix || "/").replace(/\/$/, "") ||
            target.location.pathname.startsWith(
              (d.pathPrefix || "/").replace(/\/?$/, "/"),
            )),
      )
      .sort(
        (a, b) => (b.pathPrefix || "/").length - (a.pathPrefix || "/").length,
      )[0];
    const pixels = (route?.pixelIds || []).filter((id) => /^\d+$/.test(id));
    const pixelParams = {
      content_name: "Oficina Imobiturbo: do lead ao próximo passo",
      content_ids: [PRODUCT_ID],
      product_id: PRODUCT_ID,
      content_type: "product",
      value: 47,
      currency: "BRL",
    };
    // The existing Hub script mirrors wrapped fbq calls into the collector using eventID.
    // Emit through that path when available to avoid sending the same event twice.
    if (target.fbq?.__hub_wrapped__ && pixels.length) {
      for (const pixel of pixels)
        target.fbq("trackSingle", pixel, name, pixelParams, {
          eventID: eventId,
        });
    } else {
      tracker.track(
        name,
        {
          productId: PRODUCT_ID,
          valueCents: 4700,
          currency: "BRL",
          ...properties,
        },
        eventId,
      );
      if (target.fbq)
        for (const pixel of pixels)
          target.fbq("trackSingle", pixel, name, pixelParams, {
            eventID: eventId,
          });
    }
    return true;
  } catch {
    return false;
  }
}
const queue: {
  name: OficinaEvent;
  properties: Record<string, unknown>;
  id: string;
  attempts: number;
}[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let viewed = false;
function flush() {
  timer = undefined;
  for (let i = 0; i < queue.length; ) {
    const event = queue[i];
    if (
      emitEvent(
        event.name,
        event.properties,
        event.id,
        window as unknown as TrackingWindow,
      ) ||
      ++event.attempts >= 24
    )
      queue.splice(i, 1);
    else i++;
  }
  if (queue.length) timer = setTimeout(flush, 250);
}
export function trackEvent(
  name: OficinaEvent,
  properties: Record<string, unknown> = {},
) {
  queue.push({
    name,
    properties,
    id:
      globalThis.crypto?.randomUUID?.() ||
      `oficina-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    attempts: 0,
  });
  if (!timer) flush();
}
export function trackView() {
  if (viewed || window.location.pathname.includes("/obrigado")) return;
  viewed = true;
  trackEvent("ViewContent");
}
