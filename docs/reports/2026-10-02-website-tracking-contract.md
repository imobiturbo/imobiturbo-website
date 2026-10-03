# Website tracking contract for ROOT integration

Base: f9575e256ccafa90fd59203c3e4219e37abd71dc. Assigned worktree only; no deployment, tests, build, installation or historic event replay performed.

- `/vagas/`: Lead when full name, email and phone validate, once per checkout ID (sessionStorage). IC only visible card entry or payment ID plus valid Pix payload/image, including recovered QR. Initial form opening is not IC.
- Browser SDK `track(type, properties, eventId)` must receive the actual third argument; SDK replaces `properties.eventId` otherwise. Community Purchase remains gated by verified payment; browser uses the checkout eid also used by the Hub financial outbox.
- Checkout POST passes a stable UUID as eid. Asaas reference retains plan/eid/exp within 100 characters, optionally drops exp; never truncates a community eid. Oversized eid returns 400 before gateway mutation. Consulting legacy compact ID behavior retained.
- After successful gateway creation with original visitor/session identity, server submits `checkout_context` with orderId=paymentId, purchaseEventId/eid=checkout eid, checkoutId, visitorId/sessionId, real fbc/fbp, canonical UTMs (including legacy pipe content unchanged), nested utms/clickIds. Event ID is context_<eid>. URL is canonical and contains no buyer PII. No Purchase is generated here.
- ROOT/Hub worker must persist this context, join orderId/eid to paid ledger, and enrich even when context arrives after payment. Subscription IDs must also join their payment IDs. The current website webhook cannot reconstruct original identity from the compact Asaas reference alone.
- Created/pending payment webhook records `pending_payment`, not IC: creation alone does not prove usable QR. Paid webhook keeps its historic eventId. Status polling no longer calls Meta for community Purchase; the authenticated Hub financial webhook owns CAPI delivery and retries. Other product behavior retained.
- Historical direct Meta receipt for the R$147 sale is already imported as accepted/sent in the Hub; do not resend. For future community payments, this website webhook delegates Meta Purchase to Hub and supplies context. The durable outbox persists Meta response and retries.
- CRM/email/post-sale provisioning code unchanged. Existing notification idempotency retained.
- Wiapy URL forwards original cookies/identity and UTMs, no contact PII and no Lead on click. Official public docs found do not specify fbc/fbp/visitorId/sessionId query ingestion: https://help.wiapy.com/pt-br/article/como-criar-um-checkout-e-pegar-o-link-de-venda-1omdaab/ . URL propagation is implemented; webhook ingestion remains unproven. Context7 is available but no Wiapy API contract was found in the primary documentation.

## Pending decisions / gates

The release removes community CAPI Purchase delivery from both website status polling and product webhook. Hub enrichment, immutable Purchase identity and durable accepted receipts were implemented and exercised on VPS3. Publish Hub before this website change; verify the public journey and the original sale after deployment. CRM/provisioning idempotency remains independent of financial tracking.

VPS3 only, as natan, isolated checkout under /opt/builds; ROOT must run red at base with new regression file copied separately, then green at worker commit:

```sh
node --test tests/website-tracking-regression.test.cjs
node --test tests/checkout-asaas-pix.test.cjs tests/checkout-consulting.test.cjs tests/checkout-session.test.cjs tests/checkout-webhook.test.js tests/tracking-contract.test.js tests/skills-ia-checkout.test.cjs
npm test
npm run build:pages
```

Run repository CI/deploy entrypoint if supplied by ROOT's VPS3 checkout. Browser gates: blank/invalid contact has no Lead; valid contact once before Pix IC; form opening no IC; card pane one IC; QR outage no IC then recovered QR one IC; reload keeps same eid; paid polling no Meta resend; buyer context survives webhook ordering; accepted receipts persisted; Wiapy received attribution; no historic replay. Cache versions changed for LP checkout session and Skills script.
