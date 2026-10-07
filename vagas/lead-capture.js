(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CommunityLeadCapture = api;
})(typeof window === 'object' ? window : globalThis, function () {
  function create({ send = payload => fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), keepalive: true, signal: AbortSignal.timeout(20000) }), schedule = setTimeout } = {}) {
    let confirmed = '', active = '', latest = null, retries = 0, retryScheduled = false;
    const key = p => [p.name, p.email.toLowerCase(), p.phone.replace(/\D/g, '')].join('|');
    async function submit(payload) {
      if (!payload?.name || !payload.email || !payload.phone) return false;
      latest = payload;
      const identity = key(payload);
      if (identity === confirmed) return true;
      if (active) return false;
      active = identity;
      try {
        const response = await send(payload), receipt = await response.json();
        if (!response.ok || receipt?.ok !== true || !receipt.lead_id) throw new Error('capture_pending');
        confirmed = identity; retries = 0;
        return true;
      } catch (_) {
        if (!retryScheduled && retries < 3) {
          retryScheduled = true;
          schedule(() => { retryScheduled = false; return submit(latest); }, 3000 * 2 ** retries++);
        }
        return false;
      } finally {
        active = '';
        if (latest && key(latest) !== identity && !retryScheduled) submit(latest);
      }
    }
    return { submit };
  }
  return { create };
});
