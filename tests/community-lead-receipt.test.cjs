const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../vagas/lead-capture.js');
const payload = { name: 'Synthetic Buyer', email: 'synthetic@example.invalid', phone: '11987654321', source: 'vagas_modal' };
test('lost/failed lead receipt is retried, successful capture is deduplicated separately from analytics', async () => {
  let calls = 0; const retries = [];
  const capture = create({ send: async () => (++calls === 1 ? Response.json({ ok: false }, { status: 503 }) : Response.json({ ok: true, lead_id: 'confirmed' })), schedule: f => retries.push(f) });
  assert.equal(await capture.submit(payload), false);
  assert.equal(retries.length, 1);
  await retries.shift()();
  assert.equal(await capture.submit(payload), true);
  assert.equal(calls, 2);
});
test('changed contact is delivered after earlier in-flight request instead of silently discarded', async () => {
  let release; const sent = [];
  const capture = create({ send: async p => { sent.push(p.email); if (sent.length === 1) await new Promise(r=>release=r); return Response.json({ ok: true, lead_id: 'confirmed' }); } });
  const first = capture.submit(payload);
  await capture.submit({ ...payload, email: 'updated@example.invalid' }); release(); await first;
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(sent, [payload.email, 'updated@example.invalid']);
});
test('checkout progress gets a separate receipt after the contact was already captured', async () => {
  const sent = [];
  const capture = create({ send: async p => { sent.push(p); return Response.json({ ok: true, lead_id: 'confirmed' }); } });
  await capture.submit(payload);
  const progress = { ...payload, checkout_stage: 'CREDIT_CARD', checkout_id: 'a1111111-1111-4111-8111-111111111111' };
  await capture.submit(progress); await capture.submit(progress);
  assert.equal(sent.length, 2); assert.equal(sent[1].checkout_stage, 'CREDIT_CARD');
});
test('confirmed contact resubmission cannot discard a failed checkout milestone retry', async () => {
  const sent = [], retries = [];
  const capture = create({ send: async p => { sent.push(p); return sent.length === 2 ? Response.json({ ok: false }, { status: 503 }) : Response.json({ ok: true, lead_id: 'confirmed' }); }, schedule: f => retries.push(f) });
  await capture.submit(payload);
  const progress = { ...payload, checkout_stage: 'CREDIT_CARD', checkout_id: 'a1111111-1111-4111-8111-111111111111' };
  await capture.submit(progress); await capture.submit(payload); await retries.shift()();
  assert.equal(sent.length, 3); assert.equal(sent[2].checkout_stage, 'CREDIT_CARD');
});
